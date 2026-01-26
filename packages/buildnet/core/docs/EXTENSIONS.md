# BuildNet Extensions

BuildNet can discover and leverage external CLI tools to dramatically accelerate build processes. This document describes all supported extensions, their benefits, and how to install them.

## Quick Start

```bash
# Scan your environment to see what's available
npx buildnet extensions scan

# See what's recommended for your setup
npx buildnet extensions recommend

# Install all recommended extensions
npx buildnet extensions install --recommended

# Install specific categories
npx buildnet extensions install --category bundler
npx buildnet extensions install --category image_optimizer
```

## Extension Categories

### 📦 Bundlers

Tools that bundle JavaScript/TypeScript into optimized outputs.

| Extension | Performance | Description | Install |
|-----------|-------------|-------------|---------|
| **esbuild** | **100x faster** | Go-based bundler/minifier. Industry standard for speed. | `pnpm add -D esbuild` |
| **SWC** | **20x faster** | Rust-based compiler. Drop-in Babel replacement. | `pnpm add -D @swc/cli @swc/core` |
| **Rspack** | **10x faster** | Rust webpack-compatible bundler. Easy migration path. | `pnpm add -D @rspack/cli` |
| **Turbopack** | **50x faster** | Vercel's bundler (Next.js integration). | `pnpm add -D turbo` |

**Recommendation:** Install esbuild for maximum speed. Use SWC if you need advanced transpilation features.

### 🗜️ Minifiers

Tools that minimize JavaScript/CSS file sizes.

| Extension | Performance | Description | Install |
|-----------|-------------|-------------|---------|
| **esbuild** | **100x faster** | Also handles minification at blazing speed. | (see above) |
| **SWC** | **20x faster** | Rust-based minification. | (see above) |
| **Terser** | Baseline | Industry standard JS minifier. Best compression. | `pnpm add -D terser` |
| **UglifyJS** | 0.8x | Legacy minifier. Good for older code compatibility. | `pnpm add -D uglify-js` |

### 📁 Compressors

Tools for compressing build outputs.

| Extension | Compression | Speed | Install |
|-----------|-------------|-------|---------|
| **Zstandard (zstd)** | Excellent | **42% faster than Brotli** | `brew install zstd` / `apt install zstd` |
| **Brotli** | **Best (70% reduction)** | Fast | `brew install brotli` / `apt install brotli` |
| **Gzip** | Good (65% reduction) | Baseline | Pre-installed on most systems |

**Recommendation:** Use Brotli for final assets (best compression), Zstd for caching (fastest).

### 🖼️ Image Optimization

Tools for optimizing images during builds.

| Extension | Performance | Description | Install |
|-----------|-------------|-------------|---------|
| **Sharp** | **5x faster** | Node.js image processing (libvips underneath). | `pnpm add sharp` |
| **libvips** | **5x faster** | Low-level image library. Lower memory than ImageMagick. | `brew install vips` / `apt install libvips-tools` |
| **ImageMagick** | Baseline | Comprehensive image manipulation. 200+ formats. | `brew install imagemagick` |
| **pngquant** | **2x faster** | Lossy PNG compression. 70% size reduction. | `brew install pngquant` |
| **OptiPNG** | **1.5x faster** | Lossless PNG optimization. | `brew install optipng` |
| **jpegoptim** | **1.5x faster** | JPEG optimizer (lossless/lossy). | `brew install jpegoptim` |
| **SVGO** | **2x faster** | SVG optimizer. Removes metadata, optimizes paths. | `pnpm add -D svgo` |

**Recommendation:** Install Sharp + pngquant + SVGO for comprehensive image optimization.

### 🎨 CSS Processing

Tools for transforming and minifying CSS.

| Extension | Performance | Description | Install |
|-----------|-------------|-------------|---------|
| **Lightning CSS** | **100x faster** | Rust-based CSS parser/transformer/minifier. | `pnpm add -D lightningcss-cli` |
| **PostCSS** | Baseline | Industry standard with plugin ecosystem. | `pnpm add -D postcss postcss-cli` |
| **cssnano** | Baseline | CSS minifier built on PostCSS. | `pnpm add -D cssnano` |

**Recommendation:** Use Lightning CSS for new projects. It's dramatically faster and handles autoprefixing, minification, and modern CSS features in one tool.

### 🔍 Linters

Tools for code quality checking.

| Extension | Performance | Description | Install |
|-----------|-------------|-------------|---------|
| **Oxlint** | **100x faster** | Rust-based linter. Subset of ESLint rules. | `pnpm add -D oxlint` |
| **Biome** | **35x faster** | Rust linter + formatter. ESLint + Prettier replacement. | `pnpm add -D @biomejs/biome` |
| **ESLint** | Baseline | Industry standard with comprehensive plugin system. | `pnpm add -D eslint` |

**Recommendation:** Use Oxlint for speed, keep ESLint for rules Oxlint doesn't support yet. Biome is excellent as an all-in-one solution.

### ✨ Formatters

Tools for code formatting.

| Extension | Performance | Description | Install |
|-----------|-------------|-------------|---------|
| **Biome** | **35x faster** | Includes formatter. Prettier-compatible output. | (see above) |
| **Prettier** | Baseline | Industry standard. Opinionated formatting. | `pnpm add -D prettier` |

### 💾 Caching

Tools for compilation caching.

| Extension | Performance | Description | Install |
|-----------|-------------|-------------|---------|
| **ccache** | **10x faster** | C/C++ compiler cache. 5-10x faster rebuilds. | `brew install ccache` / `apt install ccache` |
| **sccache** | **10x faster** | Shared cache with cloud storage support. | `brew install sccache` / `cargo install sccache` |
| **node-gyp** | Baseline | Native addon builder (benefits from ccache). | `pnpm add -g node-gyp` |

### ⚡ WebAssembly

Tools for WASM optimization.

| Extension | Performance | Description | Install |
|-----------|-------------|-------------|---------|
| **wasm-opt** | **2x smaller** | WASM optimizer. 10-20% size reduction. | `brew install binaryen` / `apt install binaryen` |
| **wasm-pack** | Baseline | Build Rust to WASM packages. | `cargo install wasm-pack` |

### 🎬 Video

Tools for video processing.

| Extension | Description | Install |
|-----------|-------------|---------|
| **FFmpeg** | Complete multimedia processing. All video/audio formats. | `brew install ffmpeg` / `apt install ffmpeg` |

### 🛠️ Utilities

General-purpose tools that help with builds.

| Extension | Performance | Description | Install |
|-----------|-------------|-------------|---------|
| **rsync** | **5x faster** | Fast file synchronization with delta transfer. | Pre-installed or `apt install rsync` |
| **GNU Parallel** | **4x faster** | Parallel command execution. Maximize CPU usage. | `brew install parallel` / `apt install parallel` |

## Installation by Platform

### macOS (Homebrew)

```bash
# Essential tools
brew install esbuild brotli zstd

# Image optimization
brew install vips pngquant optipng jpegoptim

# Caching & compilation
brew install ccache

# Video processing
brew install ffmpeg

# WebAssembly
brew install binaryen

# Node.js tools
pnpm add -D @swc/core @biomejs/biome lightningcss-cli sharp svgo
```

### Ubuntu/Debian (apt)

```bash
# Essential tools
sudo apt-get install -y brotli zstd

# Image optimization
sudo apt-get install -y libvips-tools pngquant optipng jpegoptim

# Caching & compilation
sudo apt-get install -y ccache

# Video processing
sudo apt-get install -y ffmpeg

# WebAssembly
sudo apt-get install -y binaryen

# Node.js tools
pnpm add -D esbuild @swc/core @biomejs/biome lightningcss-cli sharp svgo
```

### Fedora/RHEL (dnf)

```bash
# Essential tools
sudo dnf install -y brotli zstd

# Image optimization
sudo dnf install -y vips-tools pngquant optipng jpegoptim

# Caching & compilation
sudo dnf install -y ccache

# Video processing
sudo dnf install -y ffmpeg

# Node.js tools
pnpm add -D esbuild @swc/core @biomejs/biome lightningcss-cli sharp svgo
```

### Alpine Linux (apk)

```bash
# Essential tools
apk add brotli zstd

# Image optimization
apk add vips-tools pngquant optipng jpegoptim

# Caching
apk add ccache

# Node.js tools
pnpm add -D esbuild @swc/core @biomejs/biome lightningcss-cli sharp svgo
```

### Arch Linux (pacman)

```bash
# Essential tools
sudo pacman -S brotli zstd

# Image optimization
sudo pacman -S libvips pngquant optipng jpegoptim

# Caching & compilation
sudo pacman -S ccache

# Video processing
sudo pacman -S ffmpeg

# WebAssembly
sudo pacman -S binaryen

# Node.js tools
pnpm add -D esbuild @swc/core @biomejs/biome lightningcss-cli sharp svgo
```

## API Usage

### Scanning for Extensions

```typescript
import { createExtensionScanner } from '@musclemap.me/buildnet-core';

const scanner = createExtensionScanner();
const capabilities = await scanner.scan('worker-1');

// Available extensions
console.log('Bundlers:', capabilities.byCategory.get('bundler'));
console.log('Compressors:', capabilities.byCategory.get('compressor'));

// What's missing but recommended
console.log('Recommendations:', capabilities.recommended);

// System info
console.log('CPU Cores:', capabilities.system.cpuCores);
console.log('Memory:', capabilities.system.totalMemoryMb, 'MB');
```

### Installing Extensions

```typescript
import { createExtensionInstaller, createExtensionScanner } from '@musclemap.me/buildnet-core';

// Scan first
const scanner = createExtensionScanner();
const capabilities = await scanner.scan();

// Get missing high-impact extensions
const missing = capabilities.extensions
  .filter(e => !e.available && e.definition.performanceMultiplier >= 10)
  .map(e => e.definition);

// Create installation plan
const installer = createExtensionInstaller();
await installer.initialize();

const plan = await installer.createInstallationPlan(missing);

// Show what will be installed
console.log(installer.generateInstallationSummary(plan));

// Execute installation
const results = await installer.executeInstallation(plan, {
  continueOnError: true,
});

console.log(`Installed: ${results.filter(r => r.success).length}`);
console.log(`Failed: ${results.filter(r => !r.success).length}`);
```

### Finding Best Tool for an Operation

```typescript
import { createExtensionScanner } from '@musclemap.me/buildnet-core';

const scanner = createExtensionScanner();

// Find the best available bundler
const bestBundler = await scanner.getBestForOperation('bundle_javascript');
if (bestBundler) {
  console.log(`Using ${bestBundler.definition.name} at ${bestBundler.executablePath}`);
  console.log(`Expected speedup: ${bestBundler.definition.performanceMultiplier}x`);
}

// Find best image optimizer
const bestImageOpt = await scanner.getBestForOperation('optimize_images');
```

## Performance Impact

| Scenario | Without Extensions | With Extensions | Improvement |
|----------|-------------------|-----------------|-------------|
| TypeScript compilation | 8s | 0.4s | **20x faster** |
| Bundle JavaScript | 45s | 0.5s | **90x faster** |
| Lint codebase | 12s | 0.12s | **100x faster** |
| Optimize images | 30s | 6s | **5x faster** |
| Compress assets | 15s | 3s | **5x faster** |
| CSS processing | 5s | 0.05s | **100x faster** |
| Full build | 120s | 12s | **10x faster** |

*Benchmarks based on a typical monorepo with 500+ TypeScript files and 100+ images.*

## BuildNet Integration

When BuildNet workers start, they automatically:

1. **Scan** for available extensions
2. **Report** capabilities to the master daemon
3. **Use** the fastest available tool for each operation
4. **Recommend** missing high-impact extensions

Workers with more extensions installed are preferred for relevant tasks, enabling efficient workload distribution based on actual capabilities.

## Troubleshooting

### Extension Not Detected

```bash
# Verify the tool is in PATH
which esbuild

# Check if it runs
esbuild --version

# If installed via npm but not found, check global bin path
npm config get prefix
# Add to PATH if needed: export PATH="$(npm config get prefix)/bin:$PATH"
```

### Slow Detection

```bash
# Use caching to speed up repeated scans
const scanner = createExtensionScanner({
  useCache: true,
  cacheTtlMs: 300000, // 5 minutes
});
```

### Permission Errors

Some system package managers require sudo. BuildNet handles this automatically but you can also pre-install:

```bash
# Pre-install with sudo, then BuildNet will find them
sudo apt-get install brotli zstd libvips-tools

# Or use user-space installations
pnpm add -D brotli zstd sharp
```
