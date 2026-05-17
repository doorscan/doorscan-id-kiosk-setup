#!/usr/bin/env bash
set -euo pipefail

INSTALLER_VERSION="2026-05-17.6"
RUN_USER="admin"
RUN_GROUP="admin"
STATE_DIR="/var/lib/doorscan-kiosk-setup"
CONFIG_FILE="/etc/doorscan-kiosk-setup.env"
KIOSK_URL="http://127.0.0.1/"
MIN_ROOT_KB=$((16 * 1024 * 1024))
LOW_MEMORY_KB=$((6 * 1024 * 1024))
SWAP_FILE="/swapfile"
SWAP_SIZE="2G"

CONFIG_REPO_URL="git@github.com:doorscan/doorscan-config.git"
CONFIG_BRANCH="master"
SCANNER_REPO_URL="git@github.com:doorscan/doorscan-id-picam-scanner.git"
SCANNER_BRANCH="master"
SCANNER_INSTALL_DIR="/opt/extractor-service"

PYTHON_BIN="/usr/bin/python3.12"
PHP_VERSION="8.4"
PHP_FPM_SERVICE="php8.4-fpm"
PHP_FPM_SOCKET="/run/php/php8.4-fpm.sock"
BROWSER_BIN="/snap/bin/chromium"
ARCH=""
OS_ID=""
OS_VERSION_ID=""
OS_CODENAME=""

DRY_RUN="0"
ASSUME_YES="0"
SKIP_NETWORK_PROMPT="0"
REBOOT_AFTER_INSTALL="1"

usage() {
  cat <<'EOF'
Usage: install.sh [options]

Bootstrap a DoorScan appliance from a fresh Ubuntu Server 24.04 install.

Options:
  --dry-run                 Run preflight checks and print planned actions
  --yes                     Do not pause before long-running install phases
  --user USER               Runtime/login user to create or use (default: admin)
  --group GROUP             Runtime group to create or use (default: admin)
  --config-branch BRANCH    doorscan-config branch/ref (default: master)
  --scanner-branch BRANCH   doorscan-id-picam-scanner branch/ref (default: master)
  --skip-network-prompt     Fail instead of prompting for Wi-Fi when offline
  --no-reboot               Do not reboot after installation
  --help                    Show this message
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
    --user)
      RUN_USER="${2:?Missing value for --user}"
      shift 2
      ;;
    --group)
      RUN_GROUP="${2:?Missing value for --group}"
      shift 2
      ;;
    --config-branch)
      CONFIG_BRANCH="${2:?Missing value for --config-branch}"
      shift 2
      ;;
    --scanner-branch)
      SCANNER_BRANCH="${2:?Missing value for --scanner-branch}"
      shift 2
      ;;
    --skip-network-prompt)
      SKIP_NETWORK_PROMPT="1"
      shift
      ;;
    --no-reboot)
      REBOOT_AFTER_INSTALL="0"
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

die() {
  echo "$*" >&2
  exit 1
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
  require_tty
  read -r -p "${message} Press Enter to continue. " _ < /dev/tty
}

require_operator_continue() {
  local message="$1"
  if [[ "${DRY_RUN}" == "1" ]]; then
    return
  fi
  require_tty
  read -r -p "${message} Press Enter to continue. " _ < /dev/tty
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    die "Run this installer with sudo/root."
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    die "Required command not found: $1"
  fi
}

require_tty() {
  if [[ ! -r /dev/tty ]]; then
    die "This step needs interactive input, but /dev/tty is unavailable. Run the installer from an interactive shell."
  fi
}

run_as_user() {
  run runuser -u "${RUN_USER}" -- "$@"
}

ubuntu_archive_uri() {
  case "${ARCH}" in
    aarch64)
      printf '%s\n' "http://ports.ubuntu.com/ubuntu-ports"
      ;;
    *)
      printf '%s\n' "http://archive.ubuntu.com/ubuntu"
      ;;
  esac
}

read_os_release() {
  if [[ ! -r /etc/os-release ]]; then
    die "Cannot read /etc/os-release."
  fi

  # shellcheck disable=SC1091
  source /etc/os-release
  OS_ID="${ID:-}"
  OS_VERSION_ID="${VERSION_ID:-}"
  OS_CODENAME="${VERSION_CODENAME:-}"
}

preflight() {
  log "Running preflight checks with installer ${INSTALLER_VERSION}..."
  require_root
  read_os_release
  ARCH="$(uname -m)"

  if [[ "${OS_ID}" != "ubuntu" || "${OS_VERSION_ID}" != "24.04" ]]; then
    die "This installer targets Ubuntu Server 24.04 only. Detected: ${OS_ID:-unknown} ${OS_VERSION_ID:-unknown}."
  fi

  case "${ARCH}" in
    aarch64|x86_64)
      ;;
    *)
      die "Unsupported architecture '${ARCH}'. Expected aarch64 or x86_64."
      ;;
  esac

  require_command apt-get
  require_command awk
  require_command getent
  require_command grep
  require_command install
  require_command runuser
  require_command sed
  require_command systemctl
  require_command useradd
}

enforce_storage_floor() {
  if phase_done storage; then
    return
  fi

  local root_kb
  root_kb="$(df -Pk / | awk 'NR == 2 {print $2}')"
  if [[ -z "${root_kb}" || "${root_kb}" -lt "${MIN_ROOT_KB}" ]]; then
    die "Root filesystem must be at least 16GB for Ubuntu, Paddle models, logs, and diagnostics."
  fi
  log "Root filesystem size check passed."
  mark_phase_done storage
}

ensure_swap_if_needed() {
  if phase_done swap; then
    return
  fi

  local mem_kb
  mem_kb="$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)"
  if [[ -z "${mem_kb}" || "${mem_kb}" -ge "${LOW_MEMORY_KB}" ]]; then
    log "Memory is at least 6GB; no installer-managed swapfile needed."
    mark_phase_done swap
    return
  fi

  log "Memory is below 6GB; ensuring ${SWAP_SIZE} swapfile for PaddleOCR preload."
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] create and enable ${SWAP_FILE} (${SWAP_SIZE})"
    mark_phase_done swap
    return
  fi

  if ! swapon --show=NAME --noheadings | grep -Fxq "${SWAP_FILE}"; then
    if [[ ! -e "${SWAP_FILE}" ]]; then
      if ! fallocate -l "${SWAP_SIZE}" "${SWAP_FILE}"; then
        dd if=/dev/zero of="${SWAP_FILE}" bs=1M count=2048 status=progress
      fi
      chmod 0600 "${SWAP_FILE}"
      mkswap "${SWAP_FILE}"
    fi
    swapon "${SWAP_FILE}"
  fi

  if ! grep -Eq "^[^#[:space:]]+[[:space:]]+none[[:space:]]+swap[[:space:]]" /etc/fstab || ! grep -Fq "${SWAP_FILE}" /etc/fstab; then
    printf '%s none swap sw 0 0\n' "${SWAP_FILE}" >> /etc/fstab
  fi

  mark_phase_done swap
}

prompt_password_twice() {
  local first second
  require_tty
  while true; do
    read -r -s -p "Password for ${RUN_USER}: " first < /dev/tty
    printf '\n'
    read -r -s -p "Confirm password for ${RUN_USER}: " second < /dev/tty
    printf '\n'
    if [[ -z "${first}" ]]; then
      echo "Password cannot be blank." >&2
      continue
    fi
    if [[ "${first}" != "${second}" ]]; then
      echo "Passwords did not match." >&2
      continue
    fi
    ADMIN_PASSWORD="${first}"
    break
  done
}

ensure_admin_user() {
  if phase_done user; then
    return
  fi

  if ! getent group "${RUN_GROUP}" >/dev/null 2>&1; then
    log "Creating group ${RUN_GROUP}..."
    run groupadd "${RUN_GROUP}"
  fi

  if ! id -u "${RUN_USER}" >/dev/null 2>&1; then
    log "Creating login/runtime user ${RUN_USER}..."
    if [[ "${DRY_RUN}" == "1" ]]; then
      echo "[dry-run] prompt for password and create ${RUN_USER}"
    else
      local ADMIN_PASSWORD
      prompt_password_twice
      useradd --create-home --shell /bin/bash --gid "${RUN_GROUP}" "${RUN_USER}"
      printf '%s:%s\n' "${RUN_USER}" "${ADMIN_PASSWORD}" | chpasswd
    fi
  fi

  local extra_group
  for extra_group in video input render dialout plugdev; do
    if getent group "${extra_group}" >/dev/null 2>&1; then
      run usermod -a -G "${extra_group}" "${RUN_USER}"
    fi
  done

  run install -d -o "${RUN_USER}" -g "${RUN_GROUP}" -m 0755 "/home/${RUN_USER}"
  mark_phase_done user
}

internet_available() {
  if command -v ping >/dev/null 2>&1 && ping -c 1 -W 3 1.1.1.1 >/dev/null 2>&1; then
    return 0
  fi
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 5 https://github.com >/dev/null 2>&1; then
    return 0
  fi
  if command -v getent >/dev/null 2>&1 && getent ahosts github.com >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

ensure_network() {
  if phase_done network; then
    return
  fi

  if internet_available; then
    log "Network is already online."
    mark_phase_done network
    return
  fi

  if [[ "${SKIP_NETWORK_PROMPT}" == "1" ]]; then
    die "No internet connection detected and --skip-network-prompt was supplied."
  fi

  if ! command -v nmcli >/dev/null 2>&1; then
    die "No internet connection detected and NetworkManager/nmcli is not installed. Connect wired networking, then rerun the installer."
  fi

  log "No internet connection detected. Starting NetworkManager and scanning Wi-Fi networks..."
  run systemctl enable --now NetworkManager.service
  nmcli device wifi list --rescan yes || true
  require_tty
  read -r -p "Wi-Fi SSID: " wifi_ssid < /dev/tty
  read -r -s -p "Wi-Fi password, leave blank for open network: " wifi_password < /dev/tty
  printf '\n'

  if [[ -n "${wifi_password}" ]]; then
    run nmcli device wifi connect "${wifi_ssid}" password "${wifi_password}"
  else
    run nmcli device wifi connect "${wifi_ssid}"
  fi

  if ! internet_available; then
    die "Network connection was configured, but internet is still unavailable."
  fi

  mark_phase_done network
}

ensure_ubuntu_updates_pocket() {
  log "Ensuring Ubuntu ${OS_CODENAME}-updates apt pocket is enabled..."
  local sources_file="/etc/apt/sources.list.d/doorscan-${OS_CODENAME}-updates.sources"
  local archive_uri
  archive_uri="$(ubuntu_archive_uri)"
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] write ${sources_file}"
  else
    cat > "${sources_file}" <<EOF
Types: deb
URIs: ${archive_uri}
Suites: ${OS_CODENAME}-updates
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF
  fi
}

configure_php_84_repository() {
  log "Ensuring PHP 8.4 apt repository is enabled..."
  local keyring="/usr/share/keyrings/doorscan-ondrej-php.gpg"
  local sources_file="/etc/apt/sources.list.d/doorscan-php84.sources"
  local key_url="https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x14AA40EC0831756756D7F66C4F4EA0AAE5267A6C"

  run apt-get update
  run apt-get install -y --no-install-recommends ca-certificates curl gnupg

  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] write ${keyring}"
    echo "[dry-run] write ${sources_file}"
    return
  fi

  curl -fsSL "${key_url}" | gpg --dearmor > "${keyring}"
  chmod 0644 "${keyring}"

  cat > "${sources_file}" <<EOF
Types: deb
URIs: https://ppa.launchpadcontent.net/ondrej/php/ubuntu
Suites: ${OS_CODENAME}
Components: main
Signed-By: ${keyring}
EOF
}

install_apt_packages() {
  if phase_done apt && \
      dpkg-query -W -f='${Status}' "php${PHP_VERSION}-fpm" 2>/dev/null | grep -q "install ok installed" && \
      dpkg-query -W -f='${Status}' dbus-user-session 2>/dev/null | grep -q "install ok installed"; then
    return
  fi

  log "Installing Ubuntu 24.04 runtime packages..."
  run apt-get update
  run apt-get install -y --no-install-recommends \
    bzip2 \
    ca-certificates \
    cage \
    composer \
    curl \
    dbus-user-session \
    fonts-liberation \
    fswebcam \
    git \
    libgl1 \
    libgomp1 \
    libnss3 \
    libopenblas-dev \
    lsb-release \
    network-manager \
    nginx \
    nodejs \
    npm \
    openssh-client \
    "php${PHP_VERSION}-bcmath" \
    "php${PHP_VERSION}-cli" \
    "php${PHP_VERSION}-curl" \
    "php${PHP_VERSION}-fpm" \
    "php${PHP_VERSION}-gd" \
    "php${PHP_VERSION}-intl" \
    "php${PHP_VERSION}-mbstring" \
    "php${PHP_VERSION}-sqlite3" \
    "php${PHP_VERSION}-xml" \
    "php${PHP_VERSION}-zip" \
    python3-pip \
    python3-venv \
    python3.12 \
    python3.12-venv \
    rsync \
    snapd \
    sqlite3 \
    tesseract-ocr \
    tesseract-ocr-eng \
    v4l-utils

  mark_phase_done apt
}

detect_php_fpm_runtime() {
  if ! command -v "php${PHP_VERSION}" >/dev/null 2>&1 && ! command -v php >/dev/null 2>&1; then
    die "PHP ${PHP_VERSION} was not installed."
  fi
  PHP_FPM_SERVICE="php${PHP_VERSION}-fpm"
  PHP_FPM_SOCKET="/run/php/php${PHP_VERSION}-fpm.sock"
}

install_chromium_snap() {
  if phase_done chromium; then
    return
  fi

  log "Installing Chromium snap..."
  run systemctl enable --now snapd.socket
  if [[ "${DRY_RUN}" != "1" ]]; then
    snap wait system seed.loaded || true
  fi
  run snap install chromium
  mark_phase_done chromium
}

write_runtime_config() {
  log "Writing ${CONFIG_FILE}..."
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] write ${CONFIG_FILE}"
    return
  fi

  cat > "${CONFIG_FILE}" <<EOF
# DoorScan appliance runtime settings generated by doorscan-id-kiosk-setup.
DOORSCAN_OS_ID=${OS_ID}
DOORSCAN_OS_VERSION_ID=${OS_VERSION_ID}
DOORSCAN_OS_CODENAME=${OS_CODENAME}
DOORSCAN_ARCH=${ARCH}
DOORSCAN_RUN_USER=${RUN_USER}
DOORSCAN_RUN_GROUP=${RUN_GROUP}
DOORSCAN_CONFIG_BRANCH=${CONFIG_BRANCH}
DOORSCAN_SCANNER_BRANCH=${SCANNER_BRANCH}
DOORSCAN_SCANNER_INSTALL_DIR=${SCANNER_INSTALL_DIR}
DOORSCAN_SCANNER_PYTHON=${PYTHON_BIN}
DOORSCAN_PHP_FPM_SERVICE=${PHP_FPM_SERVICE}
DOORSCAN_PHP_FPM_SOCKET=${PHP_FPM_SOCKET}
DOORSCAN_BROWSER_BIN=${BROWSER_BIN}
DOORSCAN_KIOSK_URL=${KIOSK_URL}
EOF
  chmod 0644 "${CONFIG_FILE}"
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

  if [[ "${DRY_RUN}" != "1" ]]; then
    if [[ ! -f "${ssh_dir}/config" ]] || ! grep -q "id_ed25519_doorscan_deploy" "${ssh_dir}/config"; then
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
  else
    echo "[dry-run] ensure ${ssh_dir}/config uses ${key_path}"
  fi

  log "Add this public key to the doorscan-deploy GitHub user, then continue:"
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] print ${key_path}.pub"
  else
    cat "${key_path}.pub"
  fi
  require_operator_continue "After adding the key to GitHub,"

  if [[ "${DRY_RUN}" == "1" ]]; then
    mark_phase_done github-access
    return
  fi

  until run_as_user git ls-remote "${CONFIG_REPO_URL}" HEAD >/dev/null 2>&1 && \
        run_as_user git ls-remote "${SCANNER_REPO_URL}" HEAD >/dev/null 2>&1; do
    echo "GitHub SSH access is not ready for the DoorScan repositories."
    require_operator_continue "Check the deploy key was added,"
  done

  mark_phase_done github-access
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
      --python "${PYTHON_BIN}" \
      --host 127.0.0.1 \
      --port 8000 \
      --user "${RUN_USER}" \
      --group "${RUN_GROUP}"
  )
  mark_phase_done scanner
}

write_nginx_config() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] write /etc/nginx/sites-available/doorscan-id-device"
    return
  fi

  cat > /etc/nginx/sites-available/doorscan-id-device <<EOF
server {
    listen 127.0.0.1:80 default_server;
    listen [::1]:80 default_server;

    server_name _;
    root /var/www/kiosk-app/public;
    index index.php index.html;

    access_log /var/log/nginx/doorscan-id-device-access.log;
    error_log /var/log/nginx/doorscan-id-device-error.log;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${PHP_FPM_SOCKET};
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT \$realpath_root;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
EOF
}

write_device_worker_service() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] write /etc/systemd/system/doorscan-id-device.service"
    return
  fi

  cat > /etc/systemd/system/doorscan-id-device.service <<EOF
[Unit]
Description=DoorScan ID Device App Worker
Documentation=https://github.com/charlielangridge/doorscan-id-device
After=network.target ${PHP_FPM_SERVICE}.service nginx.service
Wants=${PHP_FPM_SERVICE}.service nginx.service
ConditionPathExists=/var/www/kiosk-app/artisan

[Service]
Type=simple
WorkingDirectory=/var/www/kiosk-app
ExecStart=/usr/bin/php artisan queue:work --sleep=1 --tries=3 --timeout=90
Restart=always
RestartSec=2
User=${RUN_USER}
Group=${RUN_GROUP}
Environment=APP_ENV=production

[Install]
WantedBy=multi-user.target
EOF
}

write_kiosk_browser_start() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] write /usr/local/bin/kiosk-browser-start"
    return
  fi

  cat > /usr/local/bin/kiosk-browser-start <<EOF
#!/usr/bin/env bash
set -euo pipefail

export HOME="\${HOME:-/home/${RUN_USER}}"
export XDG_RUNTIME_DIR="\${XDG_RUNTIME_DIR:-/run/user/\$(id -u)}"

if [[ ! -d "\${XDG_RUNTIME_DIR}" ]]; then
  echo "XDG_RUNTIME_DIR does not exist: \${XDG_RUNTIME_DIR}. Check kiosk-browser.service PAM/logind session setup." >&2
  exit 1
fi

if [[ ! -w "\${XDG_RUNTIME_DIR}" ]]; then
  echo "XDG_RUNTIME_DIR is not writable: \${XDG_RUNTIME_DIR}. Check kiosk-browser.service PAM/logind session setup." >&2
  exit 1
fi

BROWSER_BIN="\${BROWSER_BIN:-${BROWSER_BIN}}"
KIOSK_URL="\${KIOSK_URL:-${KIOSK_URL}}"

cage_command=(
  /usr/bin/cage -s -- "\${BROWSER_BIN}"
  --kiosk \
  --ozone-platform=wayland \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  "\${KIOSK_URL}"
)

if command -v dbus-run-session >/dev/null 2>&1; then
  exec dbus-run-session -- "\${cage_command[@]}"
fi

exec "\${cage_command[@]}"
EOF
  chmod 0755 /usr/local/bin/kiosk-browser-start
}

write_kiosk_browser_service() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] write /etc/systemd/system/kiosk-browser.service"
    return
  fi

  cat > /etc/systemd/system/kiosk-browser.service <<EOF
[Unit]
Description=DoorScan Chromium Kiosk Browser
After=network-online.target nginx.service ${PHP_FPM_SERVICE}.service extractor-service.service doorscan-config-engineer-control.service
Wants=network-online.target nginx.service ${PHP_FPM_SERVICE}.service extractor-service.service doorscan-config-engineer-control.service
Conflicts=getty@tty1.service

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_GROUP}
PAMName=login
UtmpIdentifier=tty1
UtmpMode=user
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes
StandardInput=tty-force
StandardOutput=journal
StandardError=journal
Environment=KIOSK_URL=${KIOSK_URL}
Environment=BROWSER_BIN=${BROWSER_BIN}
ExecStart=/usr/local/bin/kiosk-browser-start
Restart=always
RestartSec=2
TimeoutStopSec=5

[Install]
WantedBy=multi-user.target
EOF
}

prepare_device_runtime() {
  if phase_done device-runtime; then
    return
  fi

  log "Preparing doorscan-id-device runtime placeholder..."
  run install -d -o "${RUN_USER}" -g "${RUN_GROUP}" -m 0755 /var/www/kiosk-app
  run install -d -o "${RUN_USER}" -g "${RUN_GROUP}" -m 0755 /var/www/kiosk-app/public

  if [[ "${DRY_RUN}" != "1" && ! -f /var/www/kiosk-app/public/index.php && ! -f /var/www/kiosk-app/public/index.html ]]; then
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
    chown "${RUN_USER}:${RUN_GROUP}" /var/www/kiosk-app/public/index.html
  fi

  write_nginx_config
  run ln -sfn /etc/nginx/sites-available/doorscan-id-device /etc/nginx/sites-enabled/doorscan-id-device
  run rm -f /etc/nginx/sites-enabled/default
  write_device_worker_service
  run nginx -t
  run systemctl daemon-reload
  run systemctl enable --now "${PHP_FPM_SERVICE}" nginx
  run systemctl disable doorscan-id-device.service >/dev/null 2>&1 || true
  mark_phase_done device-runtime
}

install_kiosk_browser() {
  if phase_done kiosk-browser; then
    log "Refreshing kiosk browser service..."
  else
    log "Installing kiosk browser service..."
  fi

  write_kiosk_browser_start
  write_kiosk_browser_service
  run systemctl daemon-reload
  run systemctl disable --now getty@tty1.service || true
  run systemctl enable kiosk-browser.service
  if [[ "${REBOOT_AFTER_INSTALL}" == "1" ]]; then
    log "Kiosk browser service enabled; it will start after the final reboot."
  else
    run systemctl --no-block restart kiosk-browser.service
  fi
  mark_phase_done kiosk-browser
}

verify_paddle_health() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] verify extractor health reports paddle_ocr available"
    return
  fi

  local health
  health="$(curl -fsS http://127.0.0.1:8000/v1/health)"
  printf '%s\n' "${health}" | "${PYTHON_BIN}" -c 'import json, sys; data=json.load(sys.stdin); comp=data.get("components", {}).get("paddle_ocr", {}); raise SystemExit(0 if comp.get("available") is True else "paddle_ocr is not available")'
}

verify_install() {
  log "Verifying installation..."
  run "${PYTHON_BIN}" --version
  run doorscan-config --version
  run curl -fsS http://127.0.0.1:8765/health
  run curl -fsS http://127.0.0.1:8000/v1/health
  verify_paddle_health
  if [[ "${REBOOT_AFTER_INSTALL}" == "1" ]]; then
    run systemctl is-enabled kiosk-browser.service
    run systemctl is-active extractor-service nginx "${PHP_FPM_SERVICE}"
  else
    run systemctl is-active kiosk-browser extractor-service nginx "${PHP_FPM_SERVICE}"
  fi
}

finish_install() {
  log "DoorScan Ubuntu appliance setup complete."

  if [[ "${REBOOT_AFTER_INSTALL}" != "1" ]]; then
    log "Reboot skipped. Start the kiosk browser with: sudo systemctl --no-block restart kiosk-browser.service"
    return
  fi

  pause_for_operator "The device will reboot to start kiosk mode."
  log "Rebooting to start kiosk mode on HDMI..."
  run systemctl reboot
}

main() {
  preflight
  enforce_storage_floor
  ensure_swap_if_needed
  ensure_admin_user
  ensure_network
  ensure_ubuntu_updates_pocket
  configure_php_84_repository
  install_apt_packages
  detect_php_fpm_runtime
  install_chromium_snap
  write_runtime_config
  ensure_ssh_key_and_github_access
  clone_repositories
  install_doorscan_config
  install_scanner
  prepare_device_runtime
  install_kiosk_browser
  verify_install
  finish_install
}

main
