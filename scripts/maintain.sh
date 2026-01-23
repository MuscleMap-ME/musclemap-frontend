#!/bin/sh
set -eu

ROOT="${ROOT:-/var/www/musclemap.me}"
PM2_APP_DEFAULT="musclemap-api"
TAIL_LINES_DEFAULT="80"

say(){ printf "%s\n" "$*"; }
die(){ say "ERROR: $*"; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

# --- preflight ---
need_cmd pnpm
need_cmd node
need_cmd pm2

cd "$ROOT"

# --- helpers ---
yn_default_yes() {
  # $1 prompt
  # returns 0 yes, 1 no
  printf "%s [Y/n]: " "$1"
  read ans || ans=""
  case "${ans:-Y}" in
    n|N|no|NO) return 1 ;;
    *) return 0 ;;
  esac
}

yn_default_no() {
  printf "%s [y/N]: " "$1"
  read ans || ans=""
  case "${ans:-N}" in
    y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

pick_menu() {
  # prints menu and sets global variables based on choice
  say "==> MuscleMap maintenance menu"
  say "ROOT: $ROOT"
  say
  say "Choose one:"
  say "  1) Run EVERYTHING (default)"
  say "  2) Cleanup only (dry-run)"
  say "  3) Cleanup APPLY (destructive)"
  say "  4) Tests + Build API + Restart"
  say "  5) Build Frontend only"
  say "  6) Restart PM2 only"
  say "  7) Custom selections"
  say
  printf "Selection [1]: "
  read sel || sel=""
  sel="${sel:-1}"

  # defaults = run everything safely
  RUN_INSTALL=1
  RUN_CLEANUP=1
  APPLY_CLEANUP=0
  RUN_PKGS_BUILD=1
  RUN_TESTS=1
  RUN_BUILD_API=1
  RUN_BUILD_FE=1
  RUN_SYSTEMD_FIX=1
  RUN_RESTART=1
  TAIL_LOGS=1
  PM2_APP="$PM2_APP_DEFAULT"
  TAIL_LINES="$TAIL_LINES_DEFAULT"

  case "$sel" in
    1) : ;; # keep defaults
    2)
      RUN_INSTALL=1
      RUN_CLEANUP=1
      APPLY_CLEANUP=0
      RUN_PKGS_BUILD=0
      RUN_TESTS=0
      RUN_BUILD_API=0
      RUN_BUILD_FE=0
      RUN_SYSTEMD_FIX=0
      RUN_RESTART=0
      TAIL_LOGS=0
      ;;
    3)
      RUN_INSTALL=1
      RUN_CLEANUP=1
      APPLY_CLEANUP=1
      RUN_PKGS_BUILD=0
      RUN_TESTS=0
      RUN_BUILD_API=0
      RUN_BUILD_FE=0
      RUN_SYSTEMD_FIX=0
      RUN_RESTART=0
      TAIL_LOGS=0
      ;;
    4)
      RUN_INSTALL=1
      RUN_CLEANUP=0
      RUN_PKGS_BUILD=1
      RUN_TESTS=1
      RUN_BUILD_API=1
      RUN_BUILD_FE=0
      RUN_SYSTEMD_FIX=1
      RUN_RESTART=1
      TAIL_LOGS=1
      ;;
    5)
      RUN_INSTALL=1
      RUN_CLEANUP=0
      RUN_PKGS_BUILD=0
      RUN_TESTS=0
      RUN_BUILD_API=0
      RUN_BUILD_FE=1
      RUN_SYSTEMD_FIX=0
      RUN_RESTART=0
      TAIL_LOGS=0
      ;;
    6)
      RUN_INSTALL=0
      RUN_CLEANUP=0
      RUN_PKGS_BUILD=0
      RUN_TESTS=0
      RUN_BUILD_API=0
      RUN_BUILD_FE=0
      RUN_SYSTEMD_FIX=0
      RUN_RESTART=1
      TAIL_LOGS=1
      ;;
    7)
      yn_default_yes "Run pnpm install?" && RUN_INSTALL=1 || RUN_INSTALL=0
      yn_default_yes "Run repo cleanup?" && RUN_CLEANUP=1 || RUN_CLEANUP=0
      if [ "$RUN_CLEANUP" -eq 1 ]; then
        yn_default_no "Apply cleanup (actually delete/move)?" && APPLY_CLEANUP=1 || APPLY_CLEANUP=0
      fi
      yn_default_yes "Build workspace packages (core + plugin-sdk)?" && RUN_PKGS_BUILD=1 || RUN_PKGS_BUILD=0
      yn_default_yes "Run API tests?" && RUN_TESTS=1 || RUN_TESTS=0
      yn_default_yes "Build API?" && RUN_BUILD_API=1 || RUN_BUILD_API=0
      yn_default_yes "Build frontend?" && RUN_BUILD_FE=1 || RUN_BUILD_FE=0
      yn_default_yes "Patch cron-jobs weekly-table guard?" && RUN_SYSTEMD_FIX=1 || RUN_SYSTEMD_FIX=0
      yn_default_yes "Restart PM2 app?" && RUN_RESTART=1 || RUN_RESTART=0
      yn_default_yes "Tail PM2 logs at end?" && TAIL_LOGS=1 || TAIL_LOGS=0

      printf "PM2 app name [%s]: " "$PM2_APP_DEFAULT"
      read x || x=""
      PM2_APP="${x:-$PM2_APP_DEFAULT}"

      printf "Tail lines [%s]: " "$TAIL_LINES_DEFAULT"
      read y || y=""
      TAIL_LINES="${y:-$TAIL_LINES_DEFAULT}"
      ;;
    *) : ;; # treat unknown as default
  esac
}

has_script() {
  # $1 dir, $2 scriptName
  node -e '
    const fs=require("fs");
    const p=process.argv[1]+"/package.json";
    const s=fs.readFileSync(p,"utf8");
    const j=JSON.parse(s);
    const k=process.argv[2];
    process.exit((j.scripts && j.scripts[k]) ? 0 : 1);
  ' "$1" "$2" >/dev/null 2>&1
}

repair_package_json_if_needed() {
  if node -e 'JSON.parse(require("fs").readFileSync("package.json","utf8"));' >/dev/null 2>&1; then
    return 0
  fi
  say "==> package.json invalid — refusing to run pnpm until fixed."
  die "Fix package.json first."
}

frontend_build() {
  # Prefer root build script if present.
  if has_script "$ROOT" "build"; then
    say "==> frontend: pnpm build (root)"
    pnpm build
    return 0
  fi

  # Otherwise try common frontend dirs (only if they have package.json + build script).
  for d in "$ROOT/apps/web" "$ROOT/apps/frontend" "$ROOT/frontend" "$ROOT/client"; do
    if [ -f "$d/package.json" ] && has_script "$d" "build"; then
      say "==> frontend: pnpm -C $d build"
      pnpm -C "$d" build
      return 0
    fi
  done

    # Fallback: if this repo looks like a Vite frontend, build via vite directly.
  if [ -f "$ROOT/vite.config.js" ]; then
    say "==> frontend: pnpm exec vite build (fallback)"
    pnpm exec vite build
    return 0
  fi

  # If we got here, we couldn't find a build script.
  say "==> frontend build: SKIPPED (no build script found)"
  say "Fix: add a root build script or point me at your frontend directory."
  say "Example root script:"
  say '  "scripts": { "build": "vite build" }'
  return 1
}

patch_cron_jobs_weekly_guard() {
  if [ ! -f "$ROOT/cron-jobs.js" ]; then
    say "==> cron-jobs.js not found; skipping"
    return 0
  fi

  if ! rg -n "function snapshotWeeklyLeaderboard" "$ROOT/cron-jobs.js" >/dev/null 2>&1; then
    say "==> snapshotWeeklyLeaderboard not found; skipping"
    return 0
  fi

  if rg -n "leaderboard_weekly missing; skip weekly snapshot" "$ROOT/cron-jobs.js" >/dev/null 2>&1; then
    say "==> cron-jobs.js already patched"
    return 0
  fi

  TS="$(date -u +%Y%m%d_%H%M%S)"
  mkdir -p "$ROOT/script-runs"
  cp -a "$ROOT/cron-jobs.js" "$ROOT/script-runs/cron-jobs.js.bak.$TS" || true

  node <<'NODE'
const fs = require('fs');
const p = '/var/www/musclemap.me/cron-jobs.js';
let s = fs.readFileSync(p,'utf8');

const fn = 'function snapshotWeeklyLeaderboard';
const i = s.indexOf(fn);
if (i === -1) process.exit(0);
const brace = s.indexOf('{', i);
if (brace === -1) process.exit(0);

const insert =
`\n  // If weekly leaderboard table doesn't exist yet, skip instead of failing the whole timer.\n` +
`  try {\n` +
`    db.prepare("SELECT 1 FROM leaderboard_weekly LIMIT 1").get();\n` +
`  } catch (e) {\n` +
`    const msg = (e && e.message) ? String(e.message) : "";\n` +
`    if (msg.includes("no such table: leaderboard_weekly")) {\n` +
`      console.warn("leaderboard_weekly missing; skip weekly snapshot");\n` +
`      return;\n` +
`    }\n` +
`    throw e;\n` +
`  }\n`;

s = s.slice(0, brace+1) + insert + s.slice(brace+1);
fs.writeFileSync(p, s);
NODE

  say "==> cron-jobs.js patched (backup in script-runs/)"
}

# --- run ---
pick_menu

say
say "==> Plan"
say "  RUN_INSTALL=$RUN_INSTALL"
say "  RUN_CLEANUP=$RUN_CLEANUP APPLY_CLEANUP=$APPLY_CLEANUP"
say "  RUN_PKGS_BUILD=$RUN_PKGS_BUILD"
say "  RUN_TESTS=$RUN_TESTS"
say "  RUN_BUILD_API=$RUN_BUILD_API"
say "  RUN_BUILD_FE=$RUN_BUILD_FE"
say "  RUN_SYSTEMD_FIX=$RUN_SYSTEMD_FIX"
say "  RUN_RESTART=$RUN_RESTART (PM2_APP=$PM2_APP)"
say "  TAIL_LOGS=$TAIL_LOGS (TAIL_LINES=$TAIL_LINES)"
say

repair_package_json_if_needed

if [ "$RUN_INSTALL" -eq 1 ]; then
  say "==> pnpm install"
  pnpm install
  say
fi

if [ "$RUN_CLEANUP" -eq 1 ]; then
  if [ -f "$ROOT/scripts/repo-cleanup.sh" ]; then
    if [ "$APPLY_CLEANUP" -eq 1 ]; then
      say "==> repo cleanup (APPLY)"
      APPLY=1 sh "$ROOT/scripts/repo-cleanup.sh"
    else
      say "==> repo cleanup (DRY RUN)"
      DRY_RUN=1 sh "$ROOT/scripts/repo-cleanup.sh"
    fi
  else
    say "==> repo cleanup skipped: scripts/repo-cleanup.sh not found"
  fi
  say
fi

if [ "$RUN_PKGS_BUILD" -eq 1 ]; then
  say "==> build workspace packages"
  pnpm -C packages/core build
  pnpm -C packages/plugin-sdk build
  say
fi

if [ "$RUN_TESTS" -eq 1 ]; then
  say "==> API tests"
  pnpm -C apps/api test
  say
fi

if [ "$RUN_BUILD_API" -eq 1 ]; then
  say "==> API build"
  pnpm -C apps/api build
  say
fi

if [ "$RUN_BUILD_FE" -eq 1 ]; then
  frontend_build || true
  say
fi

if [ "$RUN_SYSTEMD_FIX" -eq 1 ]; then
  say "==> weekly cron guard patch"
  patch_cron_jobs_weekly_guard
  say
fi

if [ "$RUN_RESTART" -eq 1 ]; then
  say "==> pm2 restart: $PM2_APP"
  pm2 restart "$PM2_APP" --silent || pm2 restart all --silent
  pm2 save >/dev/null 2>&1 || true
  say
fi

say "==> status"
pm2 ls || true
say

if [ "$TAIL_LOGS" -eq 1 ]; then
  say "==> logs: $PM2_APP (last $TAIL_LINES)"
  pm2 logs "$PM2_APP" --lines "$TAIL_LINES" || true
  say
fi

say "==> DONE"
