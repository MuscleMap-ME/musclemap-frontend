# MuscleMap LaTeX Documentation Makefile
# Usage: make all (or make architecture, make api-reference, etc.)

LATEX = pdflatex
LATEXFLAGS = -interaction=nonstopmode -halt-on-error

# Default target: build everything
all: musclemap-docs.pdf architecture.pdf api-reference.pdf features.pdf

# Master document (includes content files)
musclemap-docs.pdf: musclemap-docs.tex architecture-content.tex api-reference-content.tex features-content.tex
	$(LATEX) $(LATEXFLAGS) musclemap-docs.tex
	$(LATEX) $(LATEXFLAGS) musclemap-docs.tex

# Standalone documents
architecture.pdf: architecture.tex
	$(LATEX) $(LATEXFLAGS) architecture.tex
	$(LATEX) $(LATEXFLAGS) architecture.tex

api-reference.pdf: api-reference.tex
	$(LATEX) $(LATEXFLAGS) api-reference.tex
	$(LATEX) $(LATEXFLAGS) api-reference.tex

features.pdf: features.tex
	$(LATEX) $(LATEXFLAGS) features.tex
	$(LATEX) $(LATEXFLAGS) features.tex

clean:
	rm -f *.aux *.log *.out *.toc *.lof *.lot

distclean: clean
	rm -f *.pdf

.PHONY: all clean distclean
