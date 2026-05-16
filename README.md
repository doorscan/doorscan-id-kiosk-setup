# DoorScan Pi Kiosk Setup

Bootstrap installer for a fresh Raspberry Pi 5 running Raspberry Pi OS Lite 64-bit Trixie.

Run from the USB stick or copied checkout:

```bash
sudo bash ./install.sh
```

The installer generates `/home/admin/.ssh/id_ed25519_doorscan_deploy.pub`, prints it, and pauses until that key has been added to the `doorscan-deploy` GitHub user.

The installer prepares the operating-system runtime for the future `doorscan-id-device` site by installing PHP, SQLite, nginx, and a disabled `doorscan-id-device.service` placeholder. It does not clone or deploy the actual Laravel site yet; that code can be added later under `/var/www/kiosk-app`. Until then, nginx serves a minimal placeholder page.

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
sudo systemctl disable --now doorscan-id-device.service nginx.service php8.4-fpm.service
```

The installed runtime files remain under `/opt/doorscan-config`, `/opt/extractor-service`, and `/var/www/kiosk-app` for inspection or manual recovery.
