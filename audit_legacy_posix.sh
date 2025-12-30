#!/bin/sh
set -eu

ROOT="/var/www/musclemap.me"
TS="$(date -u +%Y%m%d_%H%M%S)"
ARCHIVE="$ROOT/script-runs/legacy-archive-$TS"

mkdir -p "$ARCHIVE"

echo "==> ROOT: $ROOT"
echo "==> ARCHIVE: $ARCHIVE"
echo

echo "==> PM2 processes"
if command -v pm2 >/dev/null 2>&1; then
  pm2 ls || true
  echo
  echo "==> PM2 describe (first 260 lines)"
  pm2 describe all 2>/dev/null | sed -n '1,260p' || true
else
  echo "pm2 not found"
fi
echo

echo "==> Systemd unit key lines (WorkingDirectory/ExecStart)"
for u in musclemap-hourly.service musclemap-daily.service musclemap-weekly.service; do
  p="/etc/systemd/system/$u"
  if [ -f "$p" ]; then
    echo "-- $u"
    rg -n "^(WorkingDirectory|ExecStart)=" "$p" || true
    echo
  fi
done

echo "==> Searching for references to legacy server/"
hits=0

if ls /etc/systemd/system/musclemap-*.service >/dev/null 2>&1; then
  if rg -n "/var/www/musclemap\.me/server|server/index|server/" /etc/systemd/system/musclemap-*.service >/dev/null 2>&1; then
    rg -n "/var/www/musclemap\.me/server|server/index|server/" /etc/systemd/system/musclemap-*.service || true
    hits=1
  fi
fi

if [ -f /root/.pm2/dump.pm2 ]; then
  if rg -n "/var/www/musclemap\.me/server|server/index|server/" /root/.pm2/dump.pm2 >/dev/null 2>&1; then
    rg -n "/var/www/musclemap\.me/server|server/index|server/" /root/.pm2/dump.pm2 || true
    hits=1
  fi
fi

echo
if [ "$hits" -eq 1 ]; then
  echo "==> FOUND references to server/. NOT archiving server/."
  echo "Fix systemd/pm2 targets first."
  exit 0
fi

echo "==> No references found. Archiving legacy server/ + legacy root JS."

cd "$ROOT"

[ -d server ] && mv server "$ARCHIVE/server" && echo "archived: server -> $ARCHIVE/server" || true

for f in api.js bulletin.js cron-jobs.js economy.js expanded-archetypes.js gamification-routes.js \
         import-exercises.js journey-engine.js journey-routes.js messaging.js prescription-engine.js \
         prescription-routes.js skins.js world-community-engine.js
do
  [ -f "$f" ] && mv "$f" "$ARCHIVE/$f" && echo "archived: $f -> $ARCHIVE/$f" || true
done

echo
echo "==> Done. Legacy archived at: $ARCHIVE"
