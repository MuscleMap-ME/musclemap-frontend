#!/bin/sh
set -eu

ROOT="${ROOT:-/var/www/musclemap.me}"
DEST_REL="${DEST_REL:-legacy/root-js}"
DEST="$ROOT/$DEST_REL"

say(){ printf "%s\n" "$*"; }
die(){ say "ERROR: $*"; exit 1; }

need_cmd(){ command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

need_cmd awk
need_cmd sed
need_cmd grep
need_cmd find
need_cmd mkdir
need_cmd mv

cd "$ROOT"

DRY_RUN="${DRY_RUN:-1}"   # default safe
APPLY="${APPLY:-0}"
if [ "$APPLY" -eq 1 ]; then DRY_RUN=0; fi

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    say "DRY: $*"
  else
    say "RUN: $*"
    sh -c "$*"
  fi
}

menu() {
  say "==> tidy-root-js"
  say "ROOT=$ROOT"
  say "DEST=$DEST_REL"
  say
  say "Choose:"
  say "  1) DRY RUN (default)"
  say "  2) APPLY (move files)"
  say "  3) Show protected references (systemd/pm2)"
  say "  4) Quit"
  say
  printf "Selection [1]: "
  read sel || sel=""
  sel="${sel:-1}"
  case "$sel" in
    1) DRY_RUN=1 ;;
    2) DRY_RUN=0 ;;
    3) show_refs; exit 0 ;;
    4) exit 0 ;;
    *) DRY_RUN=1 ;;
  esac
}

# Collect file basenames referenced by systemd units + pm2 dump
collect_protected_basenames() {
  protected=""

  # systemd musclemap-*.service ExecStart references
  for u in /etc/systemd/system/musclemap-*.service; do
    [ -f "$u" ] || continue
    # get second token after "ExecStart=" (e.g. /usr/bin/node cron-jobs.js weekly -> cron-jobs.js)
    b="$(sed -n 's/^ExecStart=//p' "$u" 2>/dev/null | awk '{print $2}' | awk -F/ '{print $NF}' | head -n 1 || true)"
    if [ -n "${b:-}" ]; then protected="$protected $b"; fi
  done

  # pm2 dump.pm2 pm_exec_path basenames
  if [ -f /root/.pm2/dump.pm2 ]; then
    # Extract all pm_exec_path values and take basenames
    paths="$(grep -oE '"pm_exec_path":[ ]*"[^"]+"' /root/.pm2/dump.pm2 2>/dev/null | sed 's/.*"pm_exec_path":[ ]*"\([^"]*\)".*/\1/' || true)"
    for p in $paths; do
      protected="$protected $(printf "%s" "$p" | awk -F/ '{print $NF}')"
    done
  fi

  # Always protect common root config + entry files (even if not currently referenced)
  protected="$protected package.json pnpm-lock.yaml pnpm-workspace.yaml vite.config.js tailwind.config.js postcss.config.js"
  protected="$protected cron-jobs.js"

  # normalize to one-per-line unique
  printf "%s\n" $protected | awk 'NF{a[$0]=1} END{for(k in a) print k}' | sort
}

show_refs() {
  say "==> Protected basenames (won't be moved):"
  collect_protected_basenames | sed 's/^/  - /'
}

is_protected() {
  # $1 basename
  bn="$1"
  collect_protected_basenames | grep -qx "$bn"
}

move_root_js() {
  run "mkdir -p '$DEST'"

  # list only root-level *.js (no subdirs)
  # shellcheck disable=SC2012
  files="$(find "$ROOT" -maxdepth 1 -type f -name '*.js' -printf '%f\n' | sort)"

  if [ -z "${files:-}" ]; then
    say "==> No root-level *.js files found."
    return 0
  fi

  say "==> Candidate root-level JS files:"
  printf "%s\n" $files | sed 's/^/  - /'
  say

  say "==> Moving (excluding protected)..."
  moved=0
  skipped=0

  for f in $files; do
    if is_protected "$f"; then
      say "SKIP: $f (protected)"
      skipped=$((skipped+1))
      continue
    fi
    run "mv '$ROOT/$f' '$DEST/$f'"
    moved=$((moved+1))
  done

  say
  say "==> Done. moved=$moved skipped=$skipped"
  say "==> Tip: if something breaks, move it back from: $DEST_REL"
}

menu
move_root_js
