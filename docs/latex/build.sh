#!/bin/bash
# ============================================
# MuscleMap LaTeX Documentation Builder
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  MuscleMap LaTeX Documentation Builder ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check for xelatex
if ! command -v xelatex &> /dev/null; then
    echo -e "${RED}Error: xelatex not found${NC}"
    echo "Please install MacTeX or TeX Live:"
    echo "  brew install --cask mactex"
    exit 1
fi

# Create output directory
mkdir -p ../pdf

# Build each document
for tex_file in *.tex; do
    if [ -f "$tex_file" ]; then
        name="${tex_file%.tex}"
        echo -e "${BLUE}Building ${name}...${NC}"

        # Run xelatex twice for TOC
        xelatex -interaction=nonstopmode -halt-on-error "$tex_file" > /dev/null 2>&1 || {
            echo -e "${RED}First pass failed for $tex_file${NC}"
            xelatex -interaction=nonstopmode "$tex_file"
            exit 1
        }

        xelatex -interaction=nonstopmode -halt-on-error "$tex_file" > /dev/null 2>&1 || {
            echo -e "${RED}Second pass failed for $tex_file${NC}"
            exit 1
        }

        # Move PDF to output directory
        mv "${name}.pdf" ../pdf/

        echo -e "${GREEN}✓ Generated ../pdf/${name}.pdf${NC}"
    fi
done

# Clean up auxiliary files
rm -f *.aux *.log *.toc *.out *.fls *.fdb_latexmk *.synctex.gz 2>/dev/null || true

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Build complete! PDFs in docs/pdf/     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"

# List generated files
echo ""
echo "Generated files:"
ls -la ../pdf/*.pdf 2>/dev/null | awk '{print "  " $NF}'
