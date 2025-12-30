#!/bin/sh
set -eu

ROOT="${ROOT:-/var/www/musclemap.me}"
PM2_APP="${PM2_APP:-musclemap-api}"

TS="$(date -u +%Y%m%d_%H%M%S)"
ARCHIVE="$ROOT/script-runs/reset-archive-$TS"

say(){ printf "%s\n" "$*"; }
die(){ say "ERROR: $*"; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || die "missing command: $1"; }

need node
need pnpm
need rg
need pm2
need systemctl

mkdir -p "$ARCHIVE"
cd "$ROOT"

# ---- toggles (set by menu) ----
DO_DISABLE_CRON=1
DO_WIPE_DB=1
DO_CLEAN_BUILDS=1
DO_ARCHIVE_ONEOFF=1
DO_PNPM_INSTALL=1
DO_BUILD_PKGS=1
DO_TESTS=1
DO_BUILD_API=1
DO_BUILD_FE=1
DO_RESTART_PM2=1

# Defaults: RUN EVERYTHING
MODE="all"

yn() {
  # $1 prompt, default yes
  printf "%s [Y/n]: " "$1"
  read a || a=""
  case "${a:-Y}" in n|N|no|NO) return 1;; *) return 0;; esac
}

menu() {
  say "==> reset-devbox.sh (dev testbed reset)"
  say "ROOT: $ROOT"
  say "PM2_APP: $PM2_APP"
  say
  say "Choose one:"
  say "  1) FULL RESET (default): disable cron, wipe DB, clean builds, reinstall, test, build all, restart"
  say "  2) Wipe DB only (leave cron/builds alone)"
  say "  3) Disable cron units only (stop the errors)"
  say "  4) Rebuild + restart only (no wipe/disable)"
  say "  5) Custom"
  say
  printf "Selection [1]: "
  read sel || sel=""
  sel="${sel:-1}"

  case "$sel" in
    1) MODE="all" ;;
    2)
      MODE="wipe-db"
      DO_DISABLE_CRON=0
      DO_WIPE_DB=1
      DO_CLEAN_BUILDS=0
      DO_ARCHIVE_ONEOFF=0
      DO_PNPM_INSTALL=0
      DO_BUILD_PKGS=0
      DO_TESTS=0
      DO_BUILD_API=0
      DO_BUILD_FE=0
      DO_RESTART_PM2=1
      ;;
    3)
      MODE="disable-cron"
      DO_DISABLE_CRON=1
      DO_WIPE_DB=0
      DO_CLEAN_BUILDS=0
      DO_ARCHIVE_ONEOFF=0
      DO_PNPM_INSTALL=0
      DO_BUILD_PKGS=0
      DO_TESTS=0
      DO_BUILD_API=0
      DO_BUILD_FE=0
      DO_RESTART_PM2=0
      ;;
    4)
      MODE="rebuild"
      DO_DISABLE_CRON=0
      DO_WIPE_DB=0
      DO_CLEAN_BUILDS=0
      DO_ARCHIVE_ONEOFF=0
      DO_PNPM_INSTALL=1
      DO_BUILD_PKGS=1
      DO_TESTS=1
      DO_BUILD_API=1
      DO_BUILD_FE=1
      DO_RESTART_PM2=1
      ;;
    5)
      MODE="custom"
      yn "Disable cron units (systemd timers/services)?" && DO_DISABLE_CRON=1 || DO_DISABLE_CRON=0
      yn "Wipe SQLite DBs (no data kept)?" && DO_WIPE_DB=1 || DO_WIPE_DB=0
      yn "Clean build outputs (dist/.map)?" && DO_CLEAN_BUILDS=1 || DO_CLEAN_BUILDS=0
      yn "Archive one-off root scripts into $ARCHIVE ?" && DO_ARCHIVE_ONEOFF=1 || DO_ARCHIVE_ONEOFF=0
      yn "Run pnpm install?" && DO_PNPM_INSTALL=1 || DO_PNPM_INSTALL=0
      yn "Build workspace packages (core/plugin-sdk)?" && DO_BUILD_PKGS=1 || DO_BUILD_PKGS=0
      yn "Run API tests?" && DO_TESTS=1 || DO_TESTS=0
      yn "Build API?" && DO_BUILD_API=1 || DO_BUILD_API=0
      yn "Build frontend?" && DO_BUILD_FE=1 || DO_BUILD_FE=0
      yn "Restart PM2 app?" && DO_RESTART_PM2=1 || DO_RESTART_PM2=0
      ;;
    *) MODE="all" ;;
  esac
}

ensure_package_json_ok() {
  node -e 'JSON.parse(require("fs").readFileSync("package.json","utf8"))' >/dev/null 2>&1 \
    || die "package.json is invalid JSON; fix it before running installs/builds"
}

disable_cron_units() {
  say "==> disabling musclemap cron timers/services"
  for u in musclemap-hourly.timer musclemap-daily.timer musclemap-weekly.timer \
           musclemap-hourly.service musclemap-daily.service musclemap-weekly.service
  do
    if systemctl list-unit-files | rg -q "^$u"; then
      systemctl disable --now "$u" >/dev/null 2>&1 || true
      systemctl stop "$u" >/dev/null 2>&1 || true
      say "  - disabled/stopped: $u"
    fi
  done
  say "  (logs stop spamming; re-enable later once cron-jobs/schema is ready)"
}

wipe_sqlite_dbs() {
  say "==> wiping sqlite dbs (+wal/+shm) (no data preserved)"
  mkdir -p "$ARCHIVE/db-backup"

  # Candidate DB locations in your repo tree:
  for base in \
    "$ROOT/musclemap.db" \
    "$ROOT/data/musclemap.db" \
    "$ROOT/apps/api/data/musclemap.db"
  do
    for f in "$base" "$base-wal" "$base-shm"; do
      if [ -f "$f" ]; then
        cp -a "$f" "$ARCHIVE/db-backup/" 2>/dev/null || true
        rm -f "$f"
        say "  - removed: $f"
      fi
    done
  done
}

clean_build_outputs() {
  say "==> cleaning build outputs (rebuildable)"
  mkdir -p "$ARCHIVE/build-backup"

  # Archive + remove common dist dirs
  for d in "$ROOT/dist" "$ROOT/apps/api/dist" "$ROOT/packages/core/dist" "$ROOT/packages/plugin-sdk/dist"; do
    if [ -d "$d" ]; then
      bn="$(echo "$d" | sed 's#^/##; s#/#__#g')"
      tar -czf "$ARCHIVE/build-backup/$bn.tgz" "$d" 2>/dev/null || true
      rm -rf "$d"
      say "  - removed dir: $d"
    fi
  done

  # Remove sourcemaps anywhere (safe)
  if command -v find >/dev/null 2>&1; then
    find "$ROOT" -type f -name '*.map' -print -delete 2>/dev/null || true
  fi
}

archive_oneoff_root_scripts() {
  say "==> archiving one-off patch scripts from repo root"
  mkdir -p "$ARCHIVE/oneoff-root"

  # Heuristic: move known one-off script patterns at repo root only.
  # Keeps real scripts/ and apps/** intact.
  for f in "$ROOT"/*.sh "$ROOT"/fix_*.sh "$ROOT"/patch_*.sh "$ROOT"/repair_*.sh "$ROOT"/rewrite_*.sh "$ROOT"/remove_*.sh; do
    [ -f "$f" ] || continue
    # Don't touch maintained scripts
    case "$f" in
      "$ROOT/install.sh"|"$ROOT/scripts/"* ) continue ;;
    esac
    mv "$f" "$ARCHIVE/oneoff-root/" 2>/dev/null || true
    say "  - moved: $(basename "$f")"
  done
}

build_frontend() {
  # We expect Vite at repo root (you have vite.config.js at root).
  # Ensure root package.json has build script; if not, add it.
  if node -e '
    const fs=require("fs"); const j=JSON.parse(fs.readFileSync("package.json","utf8"));
    process.exit(j.scripts && j.scripts.build ? 0 : 1);
  '; then
    say "==> frontend: pnpm build"
    pnpm build
    return 0
  fi

  say "==> adding root scripts.build=vite build (missing)"
  node - <<'NODE'
const fs=require('fs');
const p='package.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.scripts = j.scripts || {};
j.scripts.build = j.scripts.build || 'vite build';
j.scripts.dev = j.scripts.dev || 'vite';
j.scripts.preview = j.scripts.preview || 'vite preview';
fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n', 'utf8');
NODE

  say "==> frontend: pnpm build"
  pnpm build
}

restart_pm2() {
  say "==> restarting pm2 app: $PM2_APP"
  pm2 restart "$PM2_APP" >/dev/null 2>&1 || pm2 restart all
  pm2 save >/dev/null 2>&1 || true
  pm2 ls || true
}

# ---------------- MAIN ----------------
menu

say
say "==> MODE=$MODE"
say "==> ARCHIVE=$ARCHIVE"
say "==> Actions:"
say "  disable_cron=$DO_DISABLE_CRON wipe_db=$DO_WIPE_DB clean_builds=$DO_CLEAN_BUILDS archive_oneoff=$DO_ARCHIVE_ONEOFF"
say "  pnpm_install=$DO_PNPM_INSTALL build_pkgs=$DO_BUILD_PKGS tests=$DO_TESTS build_api=$DO_BUILD_API build_fe=$DO_BUILD_FE restart_pm2=$DO_RESTART_PM2"
say

ensure_package_json_ok

if [ "$DO_DISABLE_CRON" -eq 1 ]; then disable_cron_units; fi
if [ "$DO_WIPE_DB" -eq 1 ]; then wipe_sqlite_dbs; fi
if [ "$DO_CLEAN_BUILDS" -eq 1 ]; then clean_build_outputs; fi
if [ "$DO_ARCHIVE_ONEOFF" -eq 1 ]; then archive_oneoff_root_scripts; fi

if [ "$DO_PNPM_INSTALL" -eq 1 ]; then
  say "==> pnpm install"
  pnpm install
fi

if [ "$DO_BUILD_PKGS" -eq 1 ]; then
  say "==> build workspace packages"
  pnpm -C "$ROOT/packages/core" build
  pnpm -C "$ROOT/packages/plugin-sdk" build
fi

if [ "$DO_TESTS" -eq 1 ]; then
  say "==> run API tests"
  pnpm -C "$ROOT/apps/api" test
fi

if [ "$DO_BUILD_API" -eq 1 ]; then
  say "==> build API"
  pnpm -C "$ROOT/apps/api" build
fi

if [ "$DO_BUILD_FE" -eq 1 ]; then
  say "==> build frontend"
  build_frontend
fi

if [ "$DO_RESTART_PM2" -eq 1 ]; then
  restart_pm2
fi

say
say "==> done"
say "==> archive: $ARCHIVE"
