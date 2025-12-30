#!/bin/sh
set -eu

ROOT="${ROOT:-/var/www/musclemap.me}"
TS="$(date -u +%Y%m%d_%H%M%S)"
ARCHIVE="${ARCHIVE:-$ROOT/script-runs/cleanup-archive-$TS}"

# If caller sets DRY_RUN/APPLY explicitly, we do not prompt.
DRY_RUN="${DRY_RUN:-}"
APPLY="${APPLY:-}"

# Options
CLEAN_MAPS="${CLEAN_MAPS:-1}"          # delete *.map files
ARCHIVE_ONEOFF="${ARCHIVE_ONEOFF:-1}"  # move root one-off patch scripts to archive
PRUNE="${PRUNE:-0}"                    # prune old archives/backups
PRUNE_DAYS="${PRUNE_DAYS:-30}"

say(){ printf "%s\n" "$*"; }
die(){ say "ERROR: $*"; exit 1; }

is_tty() { [ -t 0 ] && [ -t 1 ]; }

# DRY/APPLY runner
do_cmd() {
  if [ "${DRY_RUN:-1}" = "1" ]; then
    say "DRY: $*"
  else
    say "RUN: $*"
    sh -c "$*"
  fi
}

# Menu only if interactive AND caller didn't specify DRY_RUN/APPLY
menu() {
  say "==> repo-cleanup menu"
  say "ROOT: $ROOT"
  say
  say "Choose:"
  say "  1) Default SAFE (DRY RUN)  [recommended]"
  say "  2) APPLY cleanup (destructive)"
  say "  3) DRY cleanup + PRUNE old archives"
  say "  4) APPLY cleanup + PRUNE old archives"
  say "  5) Custom toggles"
  say
  printf "Selection [1]: "
  read sel || sel=""
  sel="${sel:-1}"

  # defaults
  DRY_RUN=1
  CLEAN_MAPS=1
  ARCHIVE_ONEOFF=1
  PRUNE=0
  PRUNE_DAYS=30

  case "$sel" in
    1) : ;;
    2) DRY_RUN=0 ;;
    3) PRUNE=1 ;;
    4) DRY_RUN=0; PRUNE=1 ;;
    5)
      printf "Dry run? [Y/n]: "
      read a || a=""
      case "${a:-Y}" in n*|N*) DRY_RUN=0;; *) DRY_RUN=1;; esac

      printf "Delete sourcemaps (*.map)? [Y/n]: "
      read b || b=""
      case "${b:-Y}" in n*|N*) CLEAN_MAPS=0;; *) CLEAN_MAPS=1;; esac

      printf "Archive root one-off scripts? [Y/n]: "
      read c || c=""
      case "${c:-Y}" in n*|N*) ARCHIVE_ONEOFF=0;; *) ARCHIVE_ONEOFF=1;; esac

      printf "Prune old archives/backups? [y/N]: "
      read d || d=""
      case "${d:-N}" in y*|Y*) PRUNE=1;; *) PRUNE=0;; esac

      if [ "$PRUNE" = "1" ]; then
        printf "Prune age in days [%s]: " "$PRUNE_DAYS"
        read e || e=""
        PRUNE_DAYS="${e:-$PRUNE_DAYS}"
      fi
      ;;
    *) : ;;
  esac
}

# Decide defaults if not set
if [ -z "${DRY_RUN:-}" ] && [ -z "${APPLY:-}" ] && is_tty; then
  menu
else
  # Non-interactive defaults
  if [ -n "${APPLY:-}" ] && [ "$APPLY" = "1" ]; then
    DRY_RUN=0
  fi
  if [ -z "${DRY_RUN:-}" ]; then DRY_RUN=1; fi
fi

mkdir -p "$ARCHIVE"
cd "$ROOT"

say "==> repo-cleanup"
say "==> ROOT: $ROOT"
say "==> ARCHIVE: $ARCHIVE"
say "==> DRY_RUN=$DRY_RUN CLEAN_MAPS=$CLEAN_MAPS ARCHIVE_ONEOFF=$ARCHIVE_ONEOFF PRUNE=$PRUNE PRUNE_DAYS=$PRUNE_DAYS"
say

# 1) Remove sourcemaps (safe)
if [ "$CLEAN_MAPS" = "1" ]; then
  say "==> 1) Remove *.map sourcemaps"
  # only delete map files inside dist outputs and build artifacts
  find "$ROOT" -type f -name "*.map" \
    ! -path "*/node_modules/*" \
    ! -path "*/.pnpm/*" \
    -print | while IFS= read -r f; do
      do_cmd "rm -f '$f'"
    done
  say
fi

# 2) Archive one-off scripts sitting in repo root (keeps scripts/ intact)
if [ "$ARCHIVE_ONEOFF" = "1" ]; then
  DEST="$ARCHIVE/oneoff-scripts"
  say "==> 2) Archive root one-off scripts into $DEST"
  do_cmd "mkdir -p '$DEST'"

  # Heuristic: move root-level fix/patch/repair/etc scripts EXCEPT maintain/cleanup scripts you keep.
  # Only matches files in ROOT (not in subdirs).
  find "$ROOT" -maxdepth 1 -type f -name "*.sh" -print | while IFS= read -r f; do
    base="$(basename "$f")"
    case "$base" in
      # keep these in place
      install.sh|deploy.sh) continue ;;
      repo_cleanup.sh|cleanup_repo.sh) continue ;;
      maintain.sh) continue ;;
      # keep scripts that are already in scripts/
      *) : ;;
    esac

    case "$base" in
      fix_*|patch_*|repair_*|rewrite_*|remove_*|hard_*|force_*|clean_*|relax_*|restart_*|install_* )
        do_cmd "mv '$f' '$DEST/'"
        ;;
      *) : ;;
    esac
  done

  say
fi

# 3) Optional prune of old archives/backups
if [ "$PRUNE" = "1" ]; then
  say "==> 3) Prune old archives/backups older than ${PRUNE_DAYS} days"
  # script-runs cleanup archives
  if [ -d "$ROOT/script-runs" ]; then
    find "$ROOT/script-runs" -maxdepth 1 -type d -name "cleanup-archive-*" -mtime +"$PRUNE_DAYS" -print | while IFS= read -r d; do
      do_cmd "rm -rf '$d'"
    done
  fi
  # backups folder (ONLY prune timestamped backup dirs, not entire backups/)
  if [ -d "$ROOT/backups" ]; then
    find "$ROOT/backups" -maxdepth 1 -type d -mtime +"$PRUNE_DAYS" -print | while IFS= read -r d; do
      do_cmd "rm -rf '$d'"
    done
  fi
  say
fi

say "==> Done."
say "==> Archive: $ARCHIVE"
