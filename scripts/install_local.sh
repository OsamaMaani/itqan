#!/usr/bin/env bash
# Builds Itqan as one offline file, adds an "Itqan" launcher to the app menu (ADR-012), and
# installs the reminders helper that shows desktop notifications even when Itqan is closed
# (ADR-013). Re-run after pulling changes to update. Your data is never touched by this script.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$HOME/.local/share/itqan"
PROFILE="$DATA/browser"   # Itqan's own browser profile = where your data lives
LAUNCHER="$HOME/.local/share/applications/itqan.desktop"
TOKEN_FILE="$DATA/helper-token"
SERVICE="$HOME/.config/systemd/user/itqan-reminders.service"

BROWSER=""
for b in google-chrome google-chrome-stable chromium chromium-browser brave-browser microsoft-edge; do
  if command -v "$b" >/dev/null 2>&1; then BROWSER="$(command -v "$b")"; break; fi
done
[ -n "$BROWSER" ] || { echo "Needs Chrome, Chromium, Brave or Edge." >&2; exit 1; }

cd "$ROOT"
mkdir -p "$DATA"

# A secret shared only by the helper and this build, so no website can talk to the helper.
if [ ! -s "$TOKEN_FILE" ]; then
  python3 -c 'import secrets; print(secrets.token_hex(32))' > "$TOKEN_FILE"
fi
chmod 600 "$TOKEN_FILE"

# Install dependencies whenever the lockfile has changed since the last install (a pull can add a
# package — ADR-023 added a font), and skip it otherwise. `npm ci` installs exactly the lockfile
# and never rewrites package.json or package-lock.json, so this checkout stays clean for the next
# `git pull`. node_modules/.package-lock.json is npm's record of the last install.
if [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --no-audit --no-fund
fi
VITE_ITQAN_HELPER_TOKEN="$(cat "$TOKEN_FILE")" npm run build:local

# Reminders helper: a user service that starts at login.
cp "$ROOT/scripts/itqan_reminders.py" "$DATA/itqan_reminders.py"
cp "$ROOT/public/icon-512.png" "$DATA/icon.png"
mkdir -p "$(dirname "$SERVICE")"
cat > "$SERVICE" <<UNIT
[Unit]
Description=Itqan reminders (desktop notifications)
After=graphical-session.target

[Service]
ExecStart=/usr/bin/python3 $DATA/itqan_reminders.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
UNIT
systemctl --user daemon-reload
systemctl --user enable itqan-reminders.service >/dev/null 2>&1
systemctl --user restart itqan-reminders.service

mkdir -p "$PROFILE" "$(dirname "$LAUNCHER")"
cat > "$LAUNCHER" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Itqan
GenericName=Planner
Comment=Daily tasks, habits and goals
Exec=$BROWSER --user-data-dir=$PROFILE --app=file://$ROOT/app/index.html --class=Itqan --no-first-run --no-default-browser-check
Icon=$ROOT/public/icon-512.png
StartupWMClass=Itqan
Categories=Office;
Terminal=false
DESKTOP
chmod +x "$LAUNCHER"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$(dirname "$LAUNCHER")" || true

echo
echo "Itqan is installed. Open it from your app menu (search \"Itqan\"), and pin it to the dock if you like."
echo "Data is stored in: $PROFILE"
if systemctl --user is-active --quiet itqan-reminders.service; then
  echo "Reminders helper: running (desktop notifications on, even when Itqan is closed)."
else
  echo "Reminders helper: NOT running — see: journalctl --user -u itqan-reminders" >&2
fi
