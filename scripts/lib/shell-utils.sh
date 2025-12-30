#!/bin/sh
set -eu

log(){ printf "%s\n" "$*"; }
warn(){ printf "WARN: %s\n" "$*" >&2; }
err(){ printf "ERROR: %s\n" "$*" >&2; }
die(){ err "$*"; exit 1; }
require_cmd(){ command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

resolve_root(){
  if [ -n "${ROOT:-}" ]; then
    printf "%s" "$ROOT"
    return
  fi
  if git rev-parse --show-toplevel >/dev/null 2>&1; then
    git rev-parse --show-toplevel
    return
  fi
  pwd
}

run_cmd(){
  if [ "${DRY_RUN:-0}" -eq 1 ]; then
    log "DRY: $*"
    return 0
  fi
  log "RUN: $*"
  sh -c "$*"
}
