# Native C Modules Build System
# Usage: make [target]
# Targets: all, release, debug, clean, install

CC := gcc
CFLAGS := -Wall -Wextra -Wpedantic -std=c11 -fPIC
LDFLAGS := -shared
LIBS := -lm -lpthread

# Platform detection
UNAME := $(shell uname -s)
ifeq ($(UNAME),Darwin)
    # macOS
    LDFLAGS += -dynamiclib
    LIB_EXT := .dylib
    CFLAGS += -mmacosx-version-min=10.15
else ifeq ($(UNAME),Linux)
    # Linux
    LIB_EXT := .so
    CFLAGS += -D_GNU_SOURCE
else
    # Windows (MinGW)
    LIB_EXT := .dll
endif

# Build directories
SRC_DIR := src
BUILD_DIR := build
LIB_DIR := lib

# Source files
GEO_SRC := $(SRC_DIR)/geo/geohash.c
RATELIMIT_SRC := $(SRC_DIR)/ratelimit/limiter.c
TU_SRC := $(SRC_DIR)/workout/tu_calculator.c

# Output libraries
GEO_LIB := $(LIB_DIR)/libgeo$(LIB_EXT)
RATELIMIT_LIB := $(LIB_DIR)/libratelimit$(LIB_EXT)
TU_LIB := $(LIB_DIR)/libtu$(LIB_EXT)

# Debug flags
DEBUG_CFLAGS := -g -O0 -DDEBUG -fsanitize=address,undefined

# Release flags
RELEASE_CFLAGS := -O3 -DNDEBUG -flto
ifeq ($(UNAME),Linux)
    RELEASE_CFLAGS += -march=native
endif
ifeq ($(UNAME),Darwin)
    # Use generic optimizations for macOS universal binaries
    RELEASE_CFLAGS += -mtune=generic
endif

.PHONY: all release debug clean install test help

all: release

help:
	@echo "Native C Modules Build System"
	@echo ""
	@echo "Targets:"
	@echo "  all       - Build release version (default)"
	@echo "  release   - Build optimized release version"
	@echo "  debug     - Build debug version with sanitizers"
	@echo "  clean     - Remove build artifacts"
	@echo "  install   - Copy libraries to node_modules (if exists)"
	@echo "  test      - Run basic tests"
	@echo ""
	@echo "Libraries:"
	@echo "  libgeo$(LIB_EXT)        - Geohash encoding/decoding"
	@echo "  libratelimit$(LIB_EXT)  - Rate limiting"
	@echo "  libtu$(LIB_EXT)         - Training Unit calculator"

# Create directories
$(BUILD_DIR) $(LIB_DIR):
	mkdir -p $@

# Release build
release: CFLAGS += $(RELEASE_CFLAGS)
release: $(LIB_DIR) $(GEO_LIB) $(RATELIMIT_LIB) $(TU_LIB)
	@echo "Release build complete"

# Debug build
debug: CFLAGS += $(DEBUG_CFLAGS)
debug: $(LIB_DIR) $(GEO_LIB) $(RATELIMIT_LIB) $(TU_LIB)
	@echo "Debug build complete"

# Geo library
$(GEO_LIB): $(GEO_SRC)
	@echo "Building libgeo..."
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LIBS)
	@echo "Built: $@"

# Rate limiter library
$(RATELIMIT_LIB): $(RATELIMIT_SRC)
	@echo "Building libratelimit..."
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LIBS)
	@echo "Built: $@"

# TU calculator library
$(TU_LIB): $(TU_SRC)
	@echo "Building libtu..."
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LIBS)
	@echo "Built: $@"

# Clean
clean:
	rm -rf $(BUILD_DIR) $(LIB_DIR)
	@echo "Clean complete"

# Install to node_modules if using ffi
install: release
	@if [ -d "../node_modules" ]; then \
		mkdir -p ../node_modules/.native; \
		cp $(LIB_DIR)/* ../node_modules/.native/; \
		echo "Installed to ../node_modules/.native/"; \
	else \
		echo "No node_modules found, skipping install"; \
	fi

# Basic functionality test
test: release
	@echo "Running basic tests..."
	@echo "Testing libgeo..."
	@$(CC) -o $(BUILD_DIR)/test_geo -x c - $(GEO_LIB) -lm << 'EOF'
	#include <stdio.h>
	#include <string.h>
	extern int geohash_encode(double, double, int, char*);
	extern int geohash_decode(const char*, double*, double*);
	extern double haversine_meters(double, double, double, double);
	int main() {
		char hash[13];
		double lat, lng;
		if (geohash_encode(40.7128, -74.0060, 9, hash) != 9) return 1;
		printf("NYC geohash (9): %s\n", hash);
		if (geohash_decode(hash, &lat, &lng) != 0) return 1;
		printf("Decoded: %.4f, %.4f\n", lat, lng);
		double dist = haversine_meters(40.7128, -74.0060, 34.0522, -118.2437);
		printf("NYC to LA: %.0f meters\n", dist);
		return 0;
	}
	EOF
	@$(BUILD_DIR)/test_geo
	@echo ""
	@echo "All tests passed!"
