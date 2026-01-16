#!/bin/bash
# ============================================
# MuscleMap Script Performance Utilities
# ============================================
#
# Shared utilities for optimizing script performance.
# Source this file from other scripts:
#   source "$(dirname "$0")/lib/perf-utils.sh"
#
# Features:
#   - Parallel execution helpers
#   - Caching utilities
#   - Fast service checks
#   - Timing utilities

# ============================================
# TIMING UTILITIES
# ============================================

# Start a timer
# Usage: timer_start "my_operation"
declare -A _TIMERS
timer_start() {
    local name="${1:-default}"
    _TIMERS[$name]=$(date +%s%N)
}

# Get elapsed time in seconds
# Usage: elapsed=$(timer_elapsed "my_operation")
timer_elapsed() {
    local name="${1:-default}"
    local start="${_TIMERS[$name]:-$(date +%s%N)}"
    local end=$(date +%s%N)
    echo "scale=3; ($end - $start) / 1000000000" | bc 2>/dev/null || echo "0"
}

# ============================================
# PARALLEL EXECUTION
# ============================================

# Run commands in parallel with job limit
# Usage: parallel_run 4 "cmd1" "cmd2" "cmd3"
parallel_run() {
    local max_jobs="$1"
    shift
    local job_count=0

    for cmd in "$@"; do
        eval "$cmd" &
        ((job_count++))

        if [[ $job_count -ge $max_jobs ]]; then
            wait -n 2>/dev/null || wait
            ((job_count--))
        fi
    done

    wait
}

# Run function in parallel for each item
# Usage: parallel_foreach 4 "my_func" item1 item2 item3
parallel_foreach() {
    local max_jobs="$1"
    local func="$2"
    shift 2
    local job_count=0

    for item in "$@"; do
        $func "$item" &
        ((job_count++))

        if [[ $job_count -ge $max_jobs ]]; then
            wait -n 2>/dev/null || wait
            ((job_count--))
        fi
    done

    wait
}

# ============================================
# CACHING UTILITIES
# ============================================

# Default cache directory
PERF_CACHE_DIR="${PERF_CACHE_DIR:-$HOME/.cache/musclemap}"

# Initialize cache directory
cache_init() {
    mkdir -p "$PERF_CACHE_DIR"
}

# Check if cache is valid (within TTL)
# Usage: if cache_valid "key" 300; then ... fi
cache_valid() {
    local key="$1"
    local ttl="${2:-300}"  # Default 5 minutes
    local cache_file="$PERF_CACHE_DIR/$key.cache"

    if [[ ! -f "$cache_file" ]]; then
        return 1
    fi

    local cache_time
    if [[ "$OSTYPE" == "darwin"* ]]; then
        cache_time=$(stat -f %m "$cache_file" 2>/dev/null)
    else
        cache_time=$(stat -c %Y "$cache_file" 2>/dev/null)
    fi

    local current_time=$(date +%s)
    local age=$((current_time - cache_time))

    [[ $age -lt $ttl ]]
}

# Get cached value
# Usage: value=$(cache_get "key")
cache_get() {
    local key="$1"
    local cache_file="$PERF_CACHE_DIR/$key.cache"
    cat "$cache_file" 2>/dev/null || echo ""
}

# Set cached value
# Usage: cache_set "key" "value"
cache_set() {
    local key="$1"
    local value="$2"
    local cache_file="$PERF_CACHE_DIR/$key.cache"
    cache_init
    echo "$value" > "$cache_file"
}

# Clear cache for a key
# Usage: cache_clear "key"
cache_clear() {
    local key="$1"
    rm -f "$PERF_CACHE_DIR/$key.cache"
}

# Clear all caches
cache_clear_all() {
    rm -rf "$PERF_CACHE_DIR"/*.cache
}

# ============================================
# FAST SERVICE CHECKS
# ============================================

# Check if a port is in use
# Usage: if port_in_use 3001; then ... fi
port_in_use() {
    local port="$1"
    lsof -i:"$port" >/dev/null 2>&1
}

# Check if a process is running by name
# Usage: if process_running "postgres"; then ... fi
process_running() {
    local name="$1"
    pgrep -x "$name" >/dev/null 2>&1 || pgrep -f "$name" >/dev/null 2>&1
}

# Fast PostgreSQL check
pg_running() {
    process_running "postgres" || port_in_use 5432
}

# Fast Redis check
redis_running() {
    process_running "redis-server" || port_in_use 6379
}

# Fast PM2 check for MuscleMap
pm2_musclemap_running() {
    pm2 list 2>/dev/null | grep -q "musclemap.*online"
}

# Fast Vite check
vite_running() {
    process_running "vite" || port_in_use 5173
}

# ============================================
# EXPONENTIAL BACKOFF
# ============================================

# Wait with exponential backoff
# Usage: wait_with_backoff "check_func" max_attempts initial_delay max_delay
wait_with_backoff() {
    local check_func="$1"
    local max_attempts="${2:-10}"
    local delay="${3:-0.2}"
    local max_delay="${4:-2}"
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        if $check_func; then
            return 0
        fi

        sleep "$delay"
        ((attempt++))

        # Exponential backoff
        delay=$(echo "$delay * 2" | bc 2>/dev/null || echo "$max_delay")
        if [[ $(echo "$delay > $max_delay" | bc 2>/dev/null || echo "1") == "1" ]]; then
            delay="$max_delay"
        fi
    done

    return 1
}

# ============================================
# OUTPUT UTILITIES
# ============================================

# Colors (if not already defined)
: "${RED:=\033[0;31m}"
: "${GREEN:=\033[0;32m}"
: "${YELLOW:=\033[1;33m}"
: "${BLUE:=\033[0;34m}"
: "${CYAN:=\033[0;36m}"
: "${NC:=\033[0m}"

# Print colored output
print_success() { echo -e "${GREEN}✓${NC} $*"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $*"; }
print_error() { echo -e "${RED}✗${NC} $*"; }
print_info() { echo -e "${BLUE}ℹ${NC} $*"; }

# Spinner for long operations
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while ps -p $pid >/dev/null 2>&1; do
        for ((i=0; i<${#spinstr}; i++)); do
            printf "\r  ${BLUE}%s${NC} " "${spinstr:$i:1}"
            sleep $delay
        done
    done
    printf "\r   \r"
}
