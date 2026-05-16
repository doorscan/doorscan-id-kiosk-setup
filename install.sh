#!/usr/bin/env bash
set -euo pipefail

RUN_USER="admin"
RUN_GROUP="admin"
STATE_DIR="/var/lib/doorscan-kiosk-setup"
PYTHON_VERSION="3.12.11"
PYTHON_PREFIX="/opt/doorscan-python/3.12"
KIOSK_URL="http://127.0.0.1/"

CONFIG_REPO_URL="git@github.com:doorscan/doorscan-config.git"
CONFIG_BRANCH="master"
SCANNER_REPO_URL="git@github.com:doorscan/doorscan-id-picam-scanner.git"
SCANNER_BRANCH="master"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN="0"
ASSUME_YES="0"

usage() {
  cat <<'EOF'
Usage: install.sh [options]

Bootstrap a DoorScan Pi 5 kiosk appliance from a fresh Raspberry Pi OS Lite Trixie image.

Options:
  --dry-run      Run preflight checks and print planned actions without changing the system
  --yes          Do not pause before long-running install phases
  --help         Show this message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="1"
      shift
      ;;
    --yes)
      ASSUME_YES="1"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

run() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    printf '[dry-run] %q ' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

phase_done() {
  [[ -f "${STATE_DIR}/$1.done" ]]
}

mark_phase_done() {
  run install -d -m 0755 "${STATE_DIR}"
  run touch "${STATE_DIR}/$1.done"
}

pause_for_operator() {
  local message="$1"
  if [[ "${ASSUME_YES}" == "1" || "${DRY_RUN}" == "1" ]]; then
    return
  fi
  read -r -p "${message} Press Enter to continue. " _
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run this installer with sudo/root." >&2
    exit 1
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

run_as_user() {
  run runuser -u "${RUN_USER}" -- "$@"
}

preflight() {
  log "Running preflight checks..."
  require_root

  if ! id -u "${RUN_USER}" >/dev/null 2>&1; then
    echo "Expected Linux user '${RUN_USER}' does not exist." >&2
    exit 1
  fi

  if ! getent group "${RUN_GROUP}" >/dev/null 2>&1; then
    echo "Expected Linux group '${RUN_GROUP}' does not exist." >&2
    exit 1
  fi

  local codename=""
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    source /etc/os-release
    codename="${VERSION_CODENAME:-}"
  fi

  if [[ "${codename}" != "trixie" ]]; then
    echo "This installer targets Debian/Raspberry Pi OS Trixie. Detected codename: ${codename:-unknown}" >&2
    exit 1
  fi

  require_command apt-get
  require_command systemctl
  require_command install
  require_command runuser
  require_command sed
  require_command grep

  if [[ "${DRY_RUN}" == "1" ]]; then
    log "Dry run complete after preflight."
    exit 0
  fi
}

install_networkmanager_if_needed() {
  if command -v nmcli >/dev/null 2>&1; then
    return
  fi
  log "Installing NetworkManager before network setup..."
  run apt-get update
  run apt-get install -y network-manager
  run systemctl enable --now NetworkManager.service || run systemctl enable --now network-manager.service
}

internet_available() {
  ping -c 1 -W 3 1.1.1.1 >/dev/null 2>&1 || curl -fsS --max-time 5 https://github.com >/dev/null 2>&1
}

ensure_network() {
  if phase_done network; then
    return
  fi

  install_networkmanager_if_needed
  run systemctl enable --now NetworkManager.service || run systemctl enable --now network-manager.service || true

  if internet_available; then
    log "Network is already online."
    mark_phase_done network
    return
  fi

  log "No internet connection detected. Scanning Wi-Fi networks..."
  nmcli device wifi list --rescan yes || true
  read -r -p "Wi-Fi SSID: " wifi_ssid
  read -r -s -p "Wi-Fi password, leave blank for open network: " wifi_password
  printf '\n'

  if [[ -n "${wifi_password}" ]]; then
    run nmcli device wifi connect "${wifi_ssid}" password "${wifi_password}"
  else
    run nmcli device wifi connect "${wifi_ssid}"
  fi

  if ! internet_available; then
    echo "Network connection was configured, but internet is still unavailable." >&2
    exit 1
  fi

  mark_phase_done network
}

install_bootstrap_tools() {
  if phase_done bootstrap-tools; then
    return
  fi

  log "Installing bootstrap tools..."
  run apt-get update
  run apt-get install -y curl git openssh-client
  mark_phase_done bootstrap-tools
}

ensure_ssh_key_and_github_access() {
  if phase_done github-access; then
    return
  fi

  log "Preparing GitHub SSH key for ${RUN_USER}..."
  local ssh_dir="/home/${RUN_USER}/.ssh"
  local key_path="${ssh_dir}/id_ed25519_doorscan_deploy"
  run install -d -o "${RUN_USER}" -g "${RUN_GROUP}" -m 0700 "${ssh_dir}"

  if [[ ! -f "${key_path}" ]]; then
    run_as_user ssh-keygen -t ed25519 -N "" -C "doorscan-deploy@$(hostname)" -f "${key_path}"
  fi

  if ! grep -q "id_ed25519_doorscan_deploy" "${ssh_dir}/config" 2>/dev/null; then
    cat >> "${ssh_dir}/config" <<EOF
Host github.com
  HostName github.com
  User git
  IdentityFile ${key_path}
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF
    chown "${RUN_USER}:${RUN_GROUP}" "${ssh_dir}/config"
    chmod 0600 "${ssh_dir}/config"
  fi

  log "Add this public key to the doorscan-deploy GitHub user, then continue:"
  cat "${key_path}.pub"
  pause_for_operator "After adding the key to GitHub,"

  until run_as_user git ls-remote "${CONFIG_REPO_URL}" HEAD >/dev/null 2>&1; do
    echo "GitHub SSH access is not ready yet for ${CONFIG_REPO_URL}."
    pause_for_operator "Check the key was added to doorscan-deploy,"
  done

  mark_phase_done github-access
}

install_apt_packages() {
  if phase_done apt; then
    return
  fi

  log "Installing apt packages..."
  run apt-get update
  run apt-get install -y \
    build-essential \
    cage \
    chromium \
    composer \
    curl \
    fswebcam \
    git \
    libbz2-dev \
    libffi-dev \
    libgdbm-dev \
    libgl1 \
    libgomp1 \
    liblzma-dev \
    libncursesw5-dev \
    libnss3-dev \
    libopenblas-dev \
    libreadline-dev \
    libsqlite3-dev \
    libssl-dev \
    network-manager \
    nginx \
    nodejs \
    npm \
    php8.4-bcmath \
    php8.4-cli \
    php8.4-curl \
    php8.4-fpm \
    php8.4-gd \
    php8.4-intl \
    php8.4-mbstring \
    php8.4-sqlite3 \
    php8.4-xml \
    php8.4-zip \
    rsync \
    sqlite3 \
    tesseract-ocr \
    tesseract-ocr-eng \
    tk-dev \
    uuid-dev \
    v4l-utils \
    wget \
    xz-utils \
    zlib1g-dev

  mark_phase_done apt
}

build_python_312() {
  if [[ -x "${PYTHON_PREFIX}/bin/python3.12" ]]; then
    log "Python 3.12 already installed at ${PYTHON_PREFIX}."
    mark_phase_done python312
    return
  fi

  if phase_done python312; then
    return
  fi

  pause_for_operator "Python ${PYTHON_VERSION} will be built from source and may take a while."
  log "Building Python ${PYTHON_VERSION}..."
  local build_dir="/usr/local/src/doorscan-python-build"
  local tarball="Python-${PYTHON_VERSION}.tgz"
  local source_dir="${build_dir}/Python-${PYTHON_VERSION}"

  run install -d -m 0755 "${build_dir}"
  (
    cd "${build_dir}"
    run wget -nc "https://www.python.org/ftp/python/${PYTHON_VERSION}/${tarball}"
    run tar -xzf "${tarball}"
    cd "${source_dir}"
    run ./configure --prefix="${PYTHON_PREFIX}" --enable-optimizations --with-ensurepip=install
    run make -j"$(nproc)"
    run make install
  )

  run "${PYTHON_PREFIX}/bin/python3.12" -m pip install --upgrade pip
  mark_phase_done python312
}

clone_or_update_repo() {
  local repo_url="$1"
  local branch="$2"
  local checkout="$3"

  if [[ -d "${checkout}/.git" ]]; then
    log "Updating ${checkout}..."
    (
      cd "${checkout}"
      run_as_user git fetch origin "${branch}"
      run_as_user git checkout "${branch}"
      run_as_user git reset --hard "origin/${branch}"
      run_as_user git clean -fd
    )
    return
  fi

  log "Cloning ${repo_url} to ${checkout}..."
  run_as_user git clone --branch "${branch}" "${repo_url}" "${checkout}"
}

clone_repositories() {
  if phase_done repos; then
    return
  fi

  clone_or_update_repo "${CONFIG_REPO_URL}" "${CONFIG_BRANCH}" "/home/${RUN_USER}/doorscan-config"
  clone_or_update_repo "${SCANNER_REPO_URL}" "${SCANNER_BRANCH}" "/home/${RUN_USER}/doorscan-id-picam-scanner"

  mark_phase_done repos
}

install_doorscan_config() {
  if phase_done config; then
    return
  fi

  log "Installing doorscan-config..."
  (
    cd "/home/${RUN_USER}/doorscan-config"
    run bash ./install.sh
  )
  run systemctl enable --now doorscan-config-engineer-control.service
  mark_phase_done config
}

install_scanner() {
  if phase_done scanner; then
    return
  fi

  log "Installing doorscan-id-picam-scanner..."
  (
    cd "/home/${RUN_USER}/doorscan-id-picam-scanner"
    run bash ./install.sh \
      --python "${PYTHON_PREFIX}/bin/python3.12" \
      --host 127.0.0.1 \
      --port 8000 \
      --user "${RUN_USER}" \
      --group "${RUN_GROUP}"
  )
  mark_phase_done scanner
}

prepare_device_runtime() {
  if phase_done device-runtime; then
    return
  fi

  log "Preparing doorscan-id-device runtime dependencies and placeholder unit..."
  run install -d -o "${RUN_USER}" -g "${RUN_GROUP}" -m 0755 /var/www/kiosk-app
  run install -d -o "${RUN_USER}" -g "${RUN_GROUP}" -m 0755 /var/www/kiosk-app/public
  if [[ ! -f /var/www/kiosk-app/public/index.php && ! -f /var/www/kiosk-app/public/index.html ]]; then
    cat > /var/www/kiosk-app/public/index.html <<'EOF'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DoorScan ID</title>
</head>
<body>
  <main style="font-family: sans-serif; padding: 2rem;">
    <h1>DoorScan ID device runtime ready</h1>
    <p>The kiosk site has not been installed yet.</p>
  </main>
</body>
</html>
EOF
    run chown "${RUN_USER}:${RUN_GROUP}" /var/www/kiosk-app/public/index.html
  fi
  run install -m 0644 "${SCRIPT_DIR}/nginx/doorscan-id-device.conf" /etc/nginx/sites-available/doorscan-id-device
  run ln -sfn /etc/nginx/sites-available/doorscan-id-device /etc/nginx/sites-enabled/doorscan-id-device
  run rm -f /etc/nginx/sites-enabled/default
  run install -m 0644 "${SCRIPT_DIR}/systemd/doorscan-id-device.service" /etc/systemd/system/doorscan-id-device.service
  run nginx -t
  run systemctl daemon-reload
  run systemctl enable --now php8.4-fpm nginx
  run systemctl disable doorscan-id-device.service >/dev/null 2>&1 || true
  mark_phase_done device-runtime
}

install_kiosk_browser() {
  if phase_done kiosk-browser; then
    return
  fi

  log "Installing kiosk browser service..."
  run install -m 0755 "${SCRIPT_DIR}/bin/kiosk-browser-start" /usr/local/bin/kiosk-browser-start
  run install -m 0644 "${SCRIPT_DIR}/systemd/kiosk-browser.service" /etc/systemd/system/kiosk-browser.service
  run sed -i "s|KIOSK_URL=http://127.0.0.1/|KIOSK_URL=${KIOSK_URL}|g" /etc/systemd/system/kiosk-browser.service
  run systemctl daemon-reload
  run systemctl disable --now getty@tty1.service || true
  run systemctl enable --now kiosk-browser.service
  mark_phase_done kiosk-browser
}

verify_install() {
  log "Verifying installation..."
  run doorscan-config --version
  run curl -fsS http://127.0.0.1:8765/health
  run curl -fsS http://127.0.0.1:8000/v1/health
  run systemctl is-active kiosk-browser extractor-service nginx php8.4-fpm
}

main() {
  preflight
  ensure_network
  install_bootstrap_tools
  ensure_ssh_key_and_github_access
  install_apt_packages
  build_python_312
  clone_repositories
  install_doorscan_config
  install_scanner
  prepare_device_runtime
  install_kiosk_browser
  verify_install
  log "DoorScan kiosk setup complete."
}

main
