#!/bin/bash
#
# MuscleMap App Publishing Script
#
# One-command build and submission for iOS and Android
#
# Usage:
#   ./scripts/publish-app.sh ios          # Build & submit to App Store
#   ./scripts/publish-app.sh android      # Build & submit to Play Store
#   ./scripts/publish-app.sh both         # Build & submit to both
#   ./scripts/publish-app.sh build-only   # Build only, don't submit
#
# Prerequisites:
#   - EAS CLI installed: npm install -g eas-cli
#   - Logged in: eas login
#   - Project initialized: eas init
#   - eas.json configured with Apple/Google credentials
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MOBILE_DIR="$ROOT_DIR/apps/mobile"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check EAS CLI
    if ! command -v eas &> /dev/null; then
        log_error "EAS CLI not found. Install with: npm install -g eas-cli"
        exit 1
    fi
    log_success "EAS CLI installed"

    # Check if logged in
    if ! eas whoami &> /dev/null; then
        log_error "Not logged into EAS. Run: eas login"
        exit 1
    fi
    log_success "Logged into EAS as $(eas whoami)"

    # Check eas.json exists
    if [ ! -f "$MOBILE_DIR/eas.json" ]; then
        log_error "eas.json not found. Run: cd apps/mobile && eas init"
        exit 1
    fi
    log_success "eas.json found"

    # Check app.json has projectId
    if grep -q "your-project-id-here" "$MOBILE_DIR/app.json"; then
        log_warning "app.json still has placeholder projectId"
        log_info "Run: cd apps/mobile && eas init"
    fi

    echo ""
}

# Build packages first
build_packages() {
    log_info "Building shared packages..."
    cd "$ROOT_DIR"
    pnpm build:packages
    log_success "Packages built"
    echo ""
}

# Build for iOS
build_ios() {
    log_info "Building iOS app..."
    cd "$MOBILE_DIR"
    eas build --platform ios --profile production --non-interactive
    log_success "iOS build complete"
}

# Build for Android
build_android() {
    log_info "Building Android app..."
    cd "$MOBILE_DIR"
    eas build --platform android --profile production --non-interactive
    log_success "Android build complete"
}

# Submit to App Store
submit_ios() {
    log_info "Submitting to App Store..."
    cd "$MOBILE_DIR"
    eas submit --platform ios --profile production --non-interactive
    log_success "Submitted to App Store"
}

# Submit to Play Store
submit_android() {
    log_info "Submitting to Play Store..."
    cd "$MOBILE_DIR"
    eas submit --platform android --profile production --non-interactive
    log_success "Submitted to Play Store"
}

# Main
main() {
    echo ""
    echo "=============================================="
    echo "  MuscleMap App Publishing"
    echo "=============================================="
    echo ""

    PLATFORM="${1:-both}"
    BUILD_ONLY=false

    if [ "$PLATFORM" = "build-only" ]; then
        BUILD_ONLY=true
        PLATFORM="${2:-both}"
    fi

    check_prerequisites
    build_packages

    case "$PLATFORM" in
        ios)
            build_ios
            if [ "$BUILD_ONLY" = false ]; then
                submit_ios
            fi
            ;;
        android)
            build_android
            if [ "$BUILD_ONLY" = false ]; then
                submit_android
            fi
            ;;
        both)
            build_ios
            build_android
            if [ "$BUILD_ONLY" = false ]; then
                submit_ios
                submit_android
            fi
            ;;
        *)
            echo "Usage: $0 [ios|android|both|build-only]"
            exit 1
            ;;
    esac

    echo ""
    echo "=============================================="
    if [ "$BUILD_ONLY" = true ]; then
        log_success "Build complete!"
        log_info "Run without 'build-only' to also submit"
    else
        log_success "Build and submission complete!"
        log_info "Check App Store Connect / Play Console for status"
    fi
    echo "=============================================="
    echo ""
}

main "$@"
