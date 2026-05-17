# DoorScan Ubuntu Kiosk Setup

Bootstrap installer for a fresh Raspberry Pi 5 or LattePanda IOTA running Ubuntu Server 24.04.

Run from the public repository:

```bash
curl -fsSL https://raw.githubusercontent.com/doorscan/doorscan-id-kiosk-setup/main/install.sh | sudo bash -s -- --yes
```

Or run from a copied checkout:

```bash
sudo bash ./install.sh
```

The installer creates the `admin` Linux user if missing, prompts for its password, generates `/home/admin/.ssh/id_ed25519_doorscan_deploy.pub`, prints it, and pauses until that key has been added to the `doorscan-deploy` GitHub user.

The v1 appliance target is Ubuntu Server 24.04 on both devices. Ubuntu Core and Ubuntu 26.04 are intentionally out of scope for this installer because the current runtime uses apt packages, Python virtual environments, and systemd units.

Runtime choices:

- Python: Ubuntu 24.04 system Python 3.12 through `/usr/bin/python3.12`
- PHP: Ubuntu 24.04 PHP 8.3 packages
- Browser: Chromium snap at `/snap/bin/chromium`
- Camera: USB/UVC
- Raspberry Pi 5: 4GB RAM supported with the installer's automatic 2GB swapfile when RAM is below 6GB
- Storage: 16GB minimum root filesystem

The installer prepares the operating-system runtime for the future `doorscan-id-device` site by installing PHP, SQLite, nginx, and a disabled `doorscan-id-device.service` placeholder. It does not clone or deploy the actual Laravel site yet; that code can be added later under `/var/www/kiosk-app`. Until then, nginx serves a minimal placeholder page.

The resolved runtime settings are written to `/etc/doorscan-kiosk-setup.env` so `doorscan-config` can reuse the selected Python path, PHP-FPM service, browser path, and repo branches during software updates.

## Rollback

Disable engineer shortcut and return to kiosk-only boot:

```bash
sudo systemctl disable --now doorscan-config-engineer-control.service
sudo systemctl restart kiosk-browser.service
```

Disable kiosk mode and restore a normal tty1 login:

```bash
sudo systemctl disable --now kiosk-browser.service
sudo systemctl unmask getty@tty1.service
sudo systemctl enable --now getty@tty1.service
```

Stop the native app services:

```bash
source /etc/doorscan-kiosk-setup.env
sudo systemctl disable --now doorscan-id-device.service nginx.service "${DOORSCAN_PHP_FPM_SERVICE:-php8.3-fpm}.service"
```

The installed runtime files remain under `/opt/doorscan-config`, `/opt/extractor-service`, and `/var/www/kiosk-app` for inspection or manual recovery.
