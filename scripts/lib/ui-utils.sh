#!/bin/bash
# ============================================
# MuscleMap Script UI Utilities
# ============================================
#
# Shared utilities for interactive CLI menus.
# Source this file from other scripts:
#   source "$(dirname "$0")/lib/ui-utils.sh"
#
# Features:
#   - Color definitions
#   - Box drawing utilities
#   - Menu rendering
#   - Progress indicators
#   - Spinner animations

# ============================================
# COLORS AND STYLES
# ============================================

# Basic colors
export BLACK='\033[0;30m'
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export MAGENTA='\033[0;35m'
export CYAN='\033[0;36m'
export WHITE='\033[1;37m'
export NC='\033[0m'

# Bold variants
export BOLD='\033[1m'
export DIM='\033[2m'
export UNDERLINE='\033[4m'
export BLINK='\033[5m'
export REVERSE='\033[7m'

# Background colors
export BG_RED='\033[41m'
export BG_GREEN='\033[42m'
export BG_YELLOW='\033[43m'
export BG_BLUE='\033[44m'
export BG_MAGENTA='\033[45m'
export BG_CYAN='\033[46m'

# ============================================
# TERMINAL UTILITIES
# ============================================

# Get terminal width
term_width() {
    tput cols 2>/dev/null || echo 80
}

# Get terminal height
term_height() {
    tput lines 2>/dev/null || echo 24
}

# Clear screen
clear_screen() {
    printf '\033[2J\033[H'
}

# Move cursor
cursor_to() {
    local row=$1 col=$2
    printf '\033[%d;%dH' "$row" "$col"
}

# Hide cursor
hide_cursor() {
    printf '\033[?25l'
}

# Show cursor
show_cursor() {
    printf '\033[?25h'
}

# ============================================
# BOX DRAWING
# ============================================

# Unicode box drawing characters
BOX_TL='╔' BOX_TR='╗' BOX_BL='╚' BOX_BR='╝'
BOX_H='═' BOX_V='║'
BOX_LT='╠' BOX_RT='╣' BOX_TT='╦' BOX_BT='╩' BOX_X='╬'

# Light box characters
BOX_TL_LIGHT='┌' BOX_TR_LIGHT='┐' BOX_BL_LIGHT='└' BOX_BR_LIGHT='┘'
BOX_H_LIGHT='─' BOX_V_LIGHT='│'

# Draw a horizontal line
draw_line() {
    local width=${1:-$(term_width)}
    local char=${2:-$BOX_H}
    printf '%*s' "$width" | tr ' ' "$char"
}

# Draw a box around text
draw_box() {
    local title="$1"
    local width=${2:-60}
    local color=${3:-$BLUE}

    local inner_width=$((width - 2))
    local title_len=${#title}
    local padding=$(( (inner_width - title_len) / 2 ))

    echo -e "${color}${BOX_TL}$(draw_line $inner_width)${BOX_TR}${NC}"
    if [[ -n "$title" ]]; then
        printf "${color}${BOX_V}%*s%-*s${BOX_V}${NC}\n" $padding "" $((inner_width - padding)) "$title"
    fi
    echo -e "${color}${BOX_BL}$(draw_line $inner_width)${BOX_BR}${NC}"
}

# Draw a full box with content
draw_content_box() {
    local title="$1"
    local width=${2:-60}
    local color=${3:-$BLUE}
    shift 3
    local content=("$@")

    local inner_width=$((width - 2))

    # Top border with title
    local title_len=${#title}
    local title_padding=$(( (inner_width - title_len - 2) / 2 ))
    echo -e "${color}${BOX_TL}$(draw_line $title_padding)${NC} ${BOLD}$title${NC} ${color}$(draw_line $((inner_width - title_padding - title_len - 2)))${BOX_TR}${NC}"

    # Content lines
    for line in "${content[@]}"; do
        local line_len=${#line}
        # Strip color codes for length calculation (approximate)
        local stripped_line=$(echo -e "$line" | sed 's/\x1b\[[0-9;]*m//g')
        local stripped_len=${#stripped_line}
        printf "${color}${BOX_V}${NC} %-*s ${color}${BOX_V}${NC}\n" $((inner_width - 2)) "$line"
    done

    # Bottom border
    echo -e "${color}${BOX_BL}$(draw_line $inner_width)${BOX_BR}${NC}"
}

# ============================================
# MENU UTILITIES
# ============================================

# Print a menu item
menu_item() {
    local key="$1"
    local label="$2"
    local desc="$3"
    local width=${4:-50}

    printf "  ${CYAN}[%s]${NC} %-${width}s ${DIM}%s${NC}\n" "$key" "$label" "$desc"
}

# Print a menu header
menu_header() {
    local title="$1"
    echo ""
    echo -e "  ${BOLD}${BLUE}$title${NC}"
    echo -e "  ${DIM}$(draw_line ${#title} '─')${NC}"
}

# Render a full menu
render_menu() {
    local title="$1"
    shift
    local -n items=$1

    clear_screen
    echo ""
    draw_box "$title" 64 "$CYAN"
    echo ""

    for item in "${items[@]}"; do
        IFS='|' read -r key label desc <<< "$item"
        menu_item "$key" "$label" "$desc"
    done

    echo ""
    echo -e "  ${DIM}Press a key to select, or 'q' to quit${NC}"
    echo ""
}

# ============================================
# PROGRESS INDICATORS
# ============================================

# Spinner characters
SPINNERS=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
SPINNER_IDX=0

# Show spinner
spin() {
    printf "\r  ${CYAN}%s${NC} %s" "${SPINNERS[$SPINNER_IDX]}" "$1"
    SPINNER_IDX=$(( (SPINNER_IDX + 1) % ${#SPINNERS[@]} ))
}

# Show progress bar
progress_bar() {
    local current=$1
    local total=$2
    local width=${3:-40}
    local label=${4:-"Progress"}

    local percent=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))

    printf "\r  %s [${GREEN}%*s${NC}%*s] %3d%%" \
        "$label" \
        "$filled" "" \
        "$empty" "" \
        "$percent" | tr ' ' '█'
}

# Step indicator
step_indicator() {
    local current=$1
    local total=$2
    local desc="$3"

    printf "  ${CYAN}[%d/%d]${NC} %s\n" "$current" "$total" "$desc"
}

# ============================================
# STATUS MESSAGES
# ============================================

msg_success() { echo -e "  ${GREEN}✓${NC} $*"; }
msg_error() { echo -e "  ${RED}✗${NC} $*"; }
msg_warning() { echo -e "  ${YELLOW}⚠${NC} $*"; }
msg_info() { echo -e "  ${BLUE}ℹ${NC} $*"; }
msg_step() { echo -e "\n  ${CYAN}━━━${NC} $* ${CYAN}━━━${NC}\n"; }

# ============================================
# INPUT UTILITIES
# ============================================

# Read a single character without waiting for Enter
read_char() {
    local char
    read -rsn1 char
    echo "$char"
}

# Confirm action
confirm() {
    local prompt="${1:-Continue?}"
    local default="${2:-n}"

    if [[ "$default" == "y" ]]; then
        prompt="$prompt [Y/n]"
    else
        prompt="$prompt [y/N]"
    fi

    echo -en "  ${YELLOW}?${NC} $prompt "
    read -rsn1 reply
    echo ""

    case "$reply" in
        y|Y) return 0 ;;
        n|N) return 1 ;;
        '') [[ "$default" == "y" ]] && return 0 || return 1 ;;
        *) return 1 ;;
    esac
}

# Select from options
select_option() {
    local prompt="$1"
    shift
    local options=("$@")
    local selected=0
    local key

    hide_cursor
    trap 'show_cursor; exit' INT TERM

    while true; do
        # Clear and render options
        printf '\033[%dA' "${#options[@]}" 2>/dev/null || true

        for i in "${!options[@]}"; do
            if [[ $i -eq $selected ]]; then
                echo -e "  ${CYAN}▸${NC} ${BOLD}${options[$i]}${NC}  "
            else
                echo -e "    ${DIM}${options[$i]}${NC}  "
            fi
        done

        # Read key
        key=$(read_char)

        case "$key" in
            A|k) # Up arrow or k
                ((selected--))
                [[ $selected -lt 0 ]] && selected=$((${#options[@]} - 1))
                ;;
            B|j) # Down arrow or j
                ((selected++))
                [[ $selected -ge ${#options[@]} ]] && selected=0
                ;;
            '') # Enter
                show_cursor
                return $selected
                ;;
            q) # Quit
                show_cursor
                return 255
                ;;
        esac
    done
}

# ============================================
# BANNER UTILITIES
# ============================================

# Print MuscleMap ASCII banner
print_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
    __  ___                __     __  ___
   /  |/  /_  ____________/ /__  /  |/  /___ _____
  / /|_/ / / / / ___/ ___/ / _ \/ /|_/ / __ `/ __ \
 / /  / / /_/ (__  ) /__/ /  __/ /  / / /_/ / /_/ /
/_/  /_/\__,_/____/\___/_/\___/_/  /_/\__,_/ .___/
                                          /_/
EOF
    echo -e "${NC}"
}

# Print version info
print_version() {
    local version=${1:-"2.0.0"}
    echo -e "  ${DIM}MuscleMap CLI v$version${NC}"
    echo -e "  ${DIM}Unified System Administration Tool${NC}"
    echo ""
}
