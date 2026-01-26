/**
 * BuildNet Compiler & Toolchain Definitions
 *
 * Comprehensive definitions for compilers, build systems, and language toolchains.
 * Supports all major languages and compilation targets.
 *
 * Categories:
 * - C/C++ Compilers (GCC, Clang/LLVM, MSVC)
 * - System SDKs (Xcode, Windows SDK, Android NDK)
 * - JVM Languages (Java, Kotlin, Scala, Groovy)
 * - .NET Languages (C#, F#, VB.NET)
 * - Systems Languages (Rust, Go, Zig, Nim)
 * - Scripting Languages (Python, Ruby, Perl, PHP)
 * - Functional Languages (Haskell, OCaml, Erlang, Elixir)
 * - Mobile/Cross-platform (Flutter, React Native, Xamarin)
 * - Build Systems (Make, CMake, Ninja, Meson, Bazel)
 */

import type { ExtensionDefinition, ExtensionCategory, BuildOperation } from './types.js';

// ============================================================================
// Extended Categories for Compilers
// ============================================================================

export type CompilerCategory =
  | 'c_compiler'
  | 'cpp_compiler'
  | 'system_sdk'
  | 'jvm_compiler'
  | 'dotnet_compiler'
  | 'systems_lang'
  | 'scripting_lang'
  | 'functional_lang'
  | 'mobile_sdk'
  | 'build_system'
  | 'package_manager'
  | 'container'
  | 'wasm_compiler';

export type CompilerTarget =
  | 'native'
  | 'x86_64'
  | 'arm64'
  | 'armv7'
  | 'wasm'
  | 'wasm32'
  | 'wasm64'
  | 'android'
  | 'ios'
  | 'windows'
  | 'linux'
  | 'macos'
  | 'web'
  | 'jvm'
  | 'clr';

export interface CompilerDefinition extends ExtensionDefinition {
  /** Languages this compiler supports */
  languages: string[];

  /** Targets this compiler can produce */
  targets: CompilerTarget[];

  /** File extensions this compiler handles */
  fileExtensions: string[];

  /** Standard library or runtime required */
  runtime?: string;

  /** Cross-compilation support */
  crossCompile?: boolean;

  /** Optimization levels available */
  optimizationLevels?: string[];

  /** Debug info generation */
  debugSupport?: boolean;

  /** Linking capabilities */
  linkerType?: 'static' | 'dynamic' | 'both';
}

// ============================================================================
// C/C++ Compilers
// ============================================================================

export const GCC: CompilerDefinition = {
  id: 'gcc',
  name: 'GNU Compiler Collection',
  category: 'compiler' as ExtensionCategory,
  description: 'The GNU Compiler Collection - supports C, C++, Objective-C, Fortran, Ada, Go, and D.',
  languages: ['c', 'cpp', 'objective-c', 'fortran', 'ada', 'go', 'd'],
  targets: ['native', 'x86_64', 'arm64', 'armv7', 'linux', 'macos'],
  fileExtensions: ['.c', '.cc', '.cpp', '.cxx', '.h', '.hpp', '.m', '.f90', '.f95', '.adb', '.ads'],
  crossCompile: true,
  optimizationLevels: ['-O0', '-O1', '-O2', '-O3', '-Os', '-Og', '-Ofast'],
  debugSupport: true,
  linkerType: 'both',
  detectionCommands: [
    { command: 'gcc --version', check: 'version', versionPattern: 'gcc.*?(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which gcc', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install gcc',
    apt: 'apt-get install build-essential',
  },
};

export const GPP: CompilerDefinition = {
  id: 'g++',
  name: 'GNU C++ Compiler',
  category: 'compiler' as ExtensionCategory,
  description: 'GNU C++ compiler - part of GCC, optimized for C++ development.',
  languages: ['cpp'],
  targets: ['native', 'x86_64', 'arm64', 'armv7', 'linux', 'macos'],
  fileExtensions: ['.cc', '.cpp', '.cxx', '.hpp', '.hxx'],
  crossCompile: true,
  optimizationLevels: ['-O0', '-O1', '-O2', '-O3', '-Os', '-Og', '-Ofast'],
  debugSupport: true,
  linkerType: 'both',
  detectionCommands: [
    { command: 'g++ --version', check: 'version', versionPattern: 'g\\+\\+.*?(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which g++', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install gcc',
    apt: 'apt-get install g++',
  },
};

export const CLANG: CompilerDefinition = {
  id: 'clang',
  name: 'Clang/LLVM',
  category: 'compiler' as ExtensionCategory,
  description: 'LLVM-based C/C++/Objective-C compiler. Fast compilation, excellent diagnostics.',
  languages: ['c', 'cpp', 'objective-c', 'objective-cpp'],
  targets: ['native', 'x86_64', 'arm64', 'armv7', 'wasm', 'linux', 'macos', 'windows', 'ios', 'android'],
  fileExtensions: ['.c', '.cc', '.cpp', '.cxx', '.m', '.mm', '.h', '.hpp'],
  crossCompile: true,
  optimizationLevels: ['-O0', '-O1', '-O2', '-O3', '-Os', '-Oz', '-Ofast'],
  debugSupport: true,
  linkerType: 'both',
  performanceMultiplier: 1.2,
  detectionCommands: [
    { command: 'clang --version', check: 'version', versionPattern: 'clang version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which clang', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install llvm',
    apt: 'apt-get install clang',
  },
};

export const CLANGPP: CompilerDefinition = {
  id: 'clang++',
  name: 'Clang C++ Compiler',
  category: 'compiler' as ExtensionCategory,
  description: 'LLVM-based C++ compiler with modern C++ support.',
  languages: ['cpp'],
  targets: ['native', 'x86_64', 'arm64', 'armv7', 'wasm', 'linux', 'macos', 'windows'],
  fileExtensions: ['.cc', '.cpp', '.cxx', '.hpp', '.hxx'],
  crossCompile: true,
  optimizationLevels: ['-O0', '-O1', '-O2', '-O3', '-Os', '-Oz'],
  debugSupport: true,
  linkerType: 'both',
  performanceMultiplier: 1.2,
  detectionCommands: [
    { command: 'clang++ --version', check: 'version', versionPattern: 'clang version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which clang++', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install llvm',
    apt: 'apt-get install clang',
  },
};

export const MSVC: CompilerDefinition = {
  id: 'msvc',
  name: 'Microsoft Visual C++',
  category: 'compiler' as ExtensionCategory,
  description: 'Microsoft Visual C++ compiler for Windows development.',
  languages: ['c', 'cpp'],
  targets: ['windows', 'x86_64', 'arm64'],
  fileExtensions: ['.c', '.cpp', '.cxx', '.h', '.hpp'],
  crossCompile: false,
  optimizationLevels: ['/Od', '/O1', '/O2', '/Ox'],
  debugSupport: true,
  linkerType: 'both',
  detectionCommands: [
    { command: 'cl', check: 'version', versionPattern: 'Version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'where cl', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    manual: 'https://visualstudio.microsoft.com/downloads/',
  },
};

// ============================================================================
// System SDKs
// ============================================================================

export const XCODE: CompilerDefinition = {
  id: 'xcode',
  name: 'Xcode Command Line Tools',
  category: 'compiler' as ExtensionCategory,
  description: 'Apple\'s development toolchain for macOS, iOS, watchOS, tvOS.',
  languages: ['c', 'cpp', 'objective-c', 'swift'],
  targets: ['macos', 'ios', 'arm64', 'x86_64'],
  fileExtensions: ['.c', '.cpp', '.m', '.mm', '.swift'],
  crossCompile: true,
  debugSupport: true,
  linkerType: 'both',
  detectionCommands: [
    { command: 'xcode-select --version', check: 'version', versionPattern: 'xcode-select version (\\d+)' },
    { command: 'xcrun --version', check: 'exists' },
    { command: 'xcodebuild -version', check: 'version', versionPattern: 'Xcode (\\d+\\.\\d+)' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    manual: 'xcode-select --install',
  },
};

export const SWIFT: CompilerDefinition = {
  id: 'swift',
  name: 'Swift Compiler',
  category: 'compiler' as ExtensionCategory,
  description: 'Apple\'s Swift programming language compiler.',
  languages: ['swift'],
  targets: ['macos', 'ios', 'linux', 'windows', 'arm64', 'x86_64'],
  fileExtensions: ['.swift'],
  crossCompile: true,
  optimizationLevels: ['-Onone', '-O', '-Osize'],
  debugSupport: true,
  linkerType: 'both',
  detectionCommands: [
    { command: 'swift --version', check: 'version', versionPattern: 'Swift version (\\d+\\.\\d+\\.?\\d*)' },
    { command: 'which swift', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install swift',
    apt: 'apt-get install swift',
  },
};

export const ANDROID_NDK: CompilerDefinition = {
  id: 'android-ndk',
  name: 'Android NDK',
  category: 'compiler' as ExtensionCategory,
  description: 'Android Native Development Kit for native Android development.',
  languages: ['c', 'cpp'],
  targets: ['android', 'arm64', 'armv7', 'x86_64'],
  fileExtensions: ['.c', '.cpp', '.h', '.hpp'],
  crossCompile: true,
  debugSupport: true,
  linkerType: 'both',
  detectionCommands: [
    { command: 'echo $ANDROID_NDK_HOME', check: 'exists' },
    { command: 'ndk-build --version', check: 'version', versionPattern: 'GNU Make (\\d+\\.\\d+)' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    manual: 'https://developer.android.com/ndk/downloads',
  },
};

// ============================================================================
// JVM Languages
// ============================================================================

export const JAVA: CompilerDefinition = {
  id: 'java',
  name: 'Java Development Kit',
  category: 'compiler' as ExtensionCategory,
  description: 'Oracle/OpenJDK Java compiler and runtime.',
  languages: ['java'],
  targets: ['jvm'],
  fileExtensions: ['.java'],
  runtime: 'JVM',
  optimizationLevels: ['-g', '-g:none'],
  debugSupport: true,
  detectionCommands: [
    { command: 'java --version', check: 'version', versionPattern: '"(\\d+\\.\\d+\\.\\d+)"' },
    { command: 'javac --version', check: 'version', versionPattern: 'javac (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which java', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install openjdk',
    apt: 'apt-get install default-jdk',
  },
};

export const KOTLIN: CompilerDefinition = {
  id: 'kotlin',
  name: 'Kotlin Compiler',
  category: 'compiler' as ExtensionCategory,
  description: 'JetBrains Kotlin compiler - JVM, JS, and Native targets.',
  languages: ['kotlin'],
  targets: ['jvm', 'native', 'web', 'wasm'],
  fileExtensions: ['.kt', '.kts'],
  runtime: 'JVM',
  crossCompile: true,
  debugSupport: true,
  detectionCommands: [
    { command: 'kotlinc -version', check: 'version', versionPattern: 'kotlinc-jvm (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which kotlinc', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install kotlin',
    apt: 'apt-get install kotlin',
  },
};

export const SCALA: CompilerDefinition = {
  id: 'scala',
  name: 'Scala Compiler',
  category: 'compiler' as ExtensionCategory,
  description: 'Scala programming language compiler.',
  languages: ['scala'],
  targets: ['jvm', 'native', 'web'],
  fileExtensions: ['.scala', '.sc'],
  runtime: 'JVM',
  crossCompile: true,
  debugSupport: true,
  detectionCommands: [
    { command: 'scala --version', check: 'version', versionPattern: 'Scala.*?(\\d+\\.\\d+\\.\\d+)' },
    { command: 'scalac -version', check: 'version', versionPattern: 'Scala compiler version (\\d+\\.\\d+\\.\\d+)' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install scala',
    apt: 'apt-get install scala',
  },
};

export const GROOVY: CompilerDefinition = {
  id: 'groovy',
  name: 'Groovy Compiler',
  category: 'compiler' as ExtensionCategory,
  description: 'Apache Groovy - dynamic language for the JVM.',
  languages: ['groovy'],
  targets: ['jvm'],
  fileExtensions: ['.groovy', '.gvy', '.gy', '.gsh'],
  runtime: 'JVM',
  debugSupport: true,
  detectionCommands: [
    { command: 'groovy --version', check: 'version', versionPattern: 'Groovy Version: (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which groovy', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install groovy',
    apt: 'apt-get install groovy',
  },
};

// ============================================================================
// .NET Languages
// ============================================================================

export const DOTNET: CompilerDefinition = {
  id: 'dotnet',
  name: '.NET SDK',
  category: 'compiler' as ExtensionCategory,
  description: 'Microsoft .NET SDK - C#, F#, VB.NET compiler and runtime.',
  languages: ['csharp', 'fsharp', 'vb'],
  targets: ['clr', 'native', 'wasm', 'linux', 'macos', 'windows'],
  fileExtensions: ['.cs', '.fs', '.vb', '.csproj', '.fsproj', '.vbproj'],
  runtime: 'CLR',
  crossCompile: true,
  debugSupport: true,
  detectionCommands: [
    { command: 'dotnet --version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which dotnet', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install dotnet',
    apt: 'apt-get install dotnet-sdk-8.0',
  },
};

export const MONO: CompilerDefinition = {
  id: 'mono',
  name: 'Mono',
  category: 'compiler' as ExtensionCategory,
  description: 'Open source .NET Framework implementation.',
  languages: ['csharp', 'vb'],
  targets: ['clr', 'linux', 'macos'],
  fileExtensions: ['.cs', '.vb'],
  runtime: 'Mono',
  crossCompile: true,
  debugSupport: true,
  detectionCommands: [
    { command: 'mono --version', check: 'version', versionPattern: 'Mono JIT compiler version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'mcs --version', check: 'version', versionPattern: 'Mono C# compiler version (\\d+\\.\\d+\\.\\d+)' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install mono',
    apt: 'apt-get install mono-complete',
  },
};

// ============================================================================
// Systems Programming Languages
// ============================================================================

export const RUST: CompilerDefinition = {
  id: 'rust',
  name: 'Rust Compiler',
  category: 'compiler' as ExtensionCategory,
  description: 'Rust programming language compiler (rustc) - memory safety without GC.',
  languages: ['rust'],
  targets: ['native', 'wasm', 'x86_64', 'arm64', 'linux', 'macos', 'windows', 'android', 'ios'],
  fileExtensions: ['.rs'],
  crossCompile: true,
  optimizationLevels: ['0', '1', '2', '3', 's', 'z'],
  debugSupport: true,
  linkerType: 'both',
  performanceMultiplier: 1.5,
  detectionCommands: [
    { command: 'rustc --version', check: 'version', versionPattern: 'rustc (\\d+\\.\\d+\\.\\d+)' },
    { command: 'cargo --version', check: 'version', versionPattern: 'cargo (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which rustc', check: 'exists' },
  ],
  accelerates: ['compile_native', 'build_wasm'] as BuildOperation[],
  installation: {
    manual: 'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh',
    brew: 'brew install rust',
  },
};

export const GO: CompilerDefinition = {
  id: 'go',
  name: 'Go Compiler',
  category: 'compiler' as ExtensionCategory,
  description: 'Google Go programming language - fast compilation, built-in concurrency.',
  languages: ['go'],
  targets: ['native', 'wasm', 'x86_64', 'arm64', 'linux', 'macos', 'windows', 'android'],
  fileExtensions: ['.go'],
  crossCompile: true,
  optimizationLevels: ['-N', '-l'],
  debugSupport: true,
  linkerType: 'static',
  performanceMultiplier: 2,
  detectionCommands: [
    { command: 'go version', check: 'version', versionPattern: 'go(\\d+\\.\\d+\\.?\\d*)' },
    { command: 'which go', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install go',
    apt: 'apt-get install golang',
  },
};

export const ZIG: CompilerDefinition = {
  id: 'zig',
  name: 'Zig Compiler',
  category: 'compiler' as ExtensionCategory,
  description: 'Zig - low-level systems language, C/C++ interop, excellent cross-compilation.',
  languages: ['zig', 'c', 'cpp'],
  targets: ['native', 'wasm', 'x86_64', 'arm64', 'linux', 'macos', 'windows'],
  fileExtensions: ['.zig'],
  crossCompile: true,
  optimizationLevels: ['Debug', 'ReleaseSafe', 'ReleaseFast', 'ReleaseSmall'],
  debugSupport: true,
  linkerType: 'both',
  performanceMultiplier: 1.5,
  detectionCommands: [
    { command: 'zig version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which zig', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install zig',
    apt: 'snap install zig --classic',
  },
};

export const NIM: CompilerDefinition = {
  id: 'nim',
  name: 'Nim Compiler',
  category: 'compiler' as ExtensionCategory,
  description: 'Nim - efficient, expressive, elegant. Compiles to C/C++/JS.',
  languages: ['nim'],
  targets: ['native', 'web', 'x86_64', 'arm64'],
  fileExtensions: ['.nim', '.nims'],
  crossCompile: true,
  optimizationLevels: ['-d:debug', '-d:release', '-d:danger'],
  debugSupport: true,
  linkerType: 'both',
  detectionCommands: [
    { command: 'nim --version', check: 'version', versionPattern: 'Nim Compiler Version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which nim', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install nim',
    apt: 'apt-get install nim',
  },
};

// ============================================================================
// Scripting Languages
// ============================================================================

export const PYTHON: CompilerDefinition = {
  id: 'python',
  name: 'Python',
  category: 'compiler' as ExtensionCategory,
  description: 'Python interpreter - supports compilation to bytecode.',
  languages: ['python'],
  targets: ['native'],
  fileExtensions: ['.py', '.pyw', '.pyx'],
  runtime: 'CPython',
  debugSupport: true,
  detectionCommands: [
    { command: 'python3 --version', check: 'version', versionPattern: 'Python (\\d+\\.\\d+\\.\\d+)' },
    { command: 'python --version', check: 'version', versionPattern: 'Python (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which python3', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install python',
    apt: 'apt-get install python3',
  },
};

export const PYPY: CompilerDefinition = {
  id: 'pypy',
  name: 'PyPy',
  category: 'compiler' as ExtensionCategory,
  description: 'PyPy - fast, compliant Python implementation with JIT.',
  languages: ['python'],
  targets: ['native'],
  fileExtensions: ['.py'],
  runtime: 'PyPy',
  performanceMultiplier: 7,
  debugSupport: true,
  detectionCommands: [
    { command: 'pypy3 --version', check: 'version', versionPattern: 'PyPy (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which pypy3', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install pypy3',
    apt: 'apt-get install pypy3',
  },
};

export const RUBY: CompilerDefinition = {
  id: 'ruby',
  name: 'Ruby',
  category: 'compiler' as ExtensionCategory,
  description: 'Ruby interpreter - dynamic, object-oriented language.',
  languages: ['ruby'],
  targets: ['native'],
  fileExtensions: ['.rb', '.rake', '.gemspec'],
  runtime: 'MRI',
  debugSupport: true,
  detectionCommands: [
    { command: 'ruby --version', check: 'version', versionPattern: 'ruby (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which ruby', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install ruby',
    apt: 'apt-get install ruby',
  },
};

export const PHP: CompilerDefinition = {
  id: 'php',
  name: 'PHP',
  category: 'compiler' as ExtensionCategory,
  description: 'PHP interpreter - popular web development language.',
  languages: ['php'],
  targets: ['native', 'web'],
  fileExtensions: ['.php', '.phtml'],
  runtime: 'Zend',
  debugSupport: true,
  detectionCommands: [
    { command: 'php --version', check: 'version', versionPattern: 'PHP (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which php', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install php',
    apt: 'apt-get install php',
  },
};

export const PERL: CompilerDefinition = {
  id: 'perl',
  name: 'Perl',
  category: 'compiler' as ExtensionCategory,
  description: 'Perl interpreter - text processing and scripting.',
  languages: ['perl'],
  targets: ['native'],
  fileExtensions: ['.pl', '.pm', '.t'],
  debugSupport: true,
  detectionCommands: [
    { command: 'perl --version', check: 'version', versionPattern: 'v(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which perl', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install perl',
    apt: 'apt-get install perl',
  },
};

// ============================================================================
// Functional Languages
// ============================================================================

export const HASKELL: CompilerDefinition = {
  id: 'ghc',
  name: 'GHC (Haskell)',
  category: 'compiler' as ExtensionCategory,
  description: 'Glasgow Haskell Compiler - the standard Haskell compiler.',
  languages: ['haskell'],
  targets: ['native', 'x86_64', 'arm64'],
  fileExtensions: ['.hs', '.lhs'],
  optimizationLevels: ['-O0', '-O1', '-O2'],
  debugSupport: true,
  detectionCommands: [
    { command: 'ghc --version', check: 'version', versionPattern: 'version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which ghc', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install ghc',
    apt: 'apt-get install ghc',
  },
};

export const OCAML: CompilerDefinition = {
  id: 'ocaml',
  name: 'OCaml',
  category: 'compiler' as ExtensionCategory,
  description: 'OCaml compiler - functional programming with excellent performance.',
  languages: ['ocaml'],
  targets: ['native', 'x86_64'],
  fileExtensions: ['.ml', '.mli'],
  debugSupport: true,
  detectionCommands: [
    { command: 'ocaml --version', check: 'version', versionPattern: 'OCaml version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'ocamlopt --version', check: 'version' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install ocaml',
    apt: 'apt-get install ocaml',
  },
};

export const ERLANG: CompilerDefinition = {
  id: 'erlang',
  name: 'Erlang/OTP',
  category: 'compiler' as ExtensionCategory,
  description: 'Erlang - concurrent, fault-tolerant functional language.',
  languages: ['erlang'],
  targets: ['native'],
  fileExtensions: ['.erl', '.hrl'],
  runtime: 'BEAM',
  debugSupport: true,
  detectionCommands: [
    { command: 'erl -eval \'erlang:display(erlang:system_info(otp_release)), halt().\' -noshell', check: 'version', versionPattern: '"(\\d+)"' },
    { command: 'which erl', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install erlang',
    apt: 'apt-get install erlang',
  },
};

export const ELIXIR: CompilerDefinition = {
  id: 'elixir',
  name: 'Elixir',
  category: 'compiler' as ExtensionCategory,
  description: 'Elixir - dynamic, functional language on BEAM VM.',
  languages: ['elixir'],
  targets: ['native'],
  fileExtensions: ['.ex', '.exs'],
  runtime: 'BEAM',
  dependencies: ['erlang'],
  debugSupport: true,
  detectionCommands: [
    { command: 'elixir --version', check: 'version', versionPattern: 'Elixir (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which elixir', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install elixir',
    apt: 'apt-get install elixir',
  },
};

// ============================================================================
// Build Systems
// ============================================================================

export const MAKE: CompilerDefinition = {
  id: 'make',
  name: 'GNU Make',
  category: 'utility' as ExtensionCategory,
  description: 'GNU Make - classic build automation tool.',
  languages: ['makefile'],
  targets: ['native'],
  fileExtensions: ['Makefile', '.mk'],
  detectionCommands: [
    { command: 'make --version', check: 'version', versionPattern: 'GNU Make (\\d+\\.\\d+)' },
    { command: 'which make', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install make',
    apt: 'apt-get install make',
  },
};

export const CMAKE: CompilerDefinition = {
  id: 'cmake',
  name: 'CMake',
  category: 'utility' as ExtensionCategory,
  description: 'CMake - cross-platform build system generator.',
  languages: ['cmake'],
  targets: ['native'],
  fileExtensions: ['CMakeLists.txt', '.cmake'],
  crossCompile: true,
  detectionCommands: [
    { command: 'cmake --version', check: 'version', versionPattern: 'cmake version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which cmake', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install cmake',
    apt: 'apt-get install cmake',
  },
};

export const NINJA: CompilerDefinition = {
  id: 'ninja',
  name: 'Ninja',
  category: 'utility' as ExtensionCategory,
  description: 'Ninja - small, fast build system. 10x faster than Make.',
  languages: ['ninja'],
  targets: ['native'],
  fileExtensions: ['.ninja', 'build.ninja'],
  performanceMultiplier: 10,
  detectionCommands: [
    { command: 'ninja --version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which ninja', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install ninja',
    apt: 'apt-get install ninja-build',
  },
};

export const MESON: CompilerDefinition = {
  id: 'meson',
  name: 'Meson',
  category: 'utility' as ExtensionCategory,
  description: 'Meson - modern, fast build system. Generates Ninja files.',
  languages: ['meson'],
  targets: ['native'],
  fileExtensions: ['meson.build', 'meson_options.txt'],
  crossCompile: true,
  detectionCommands: [
    { command: 'meson --version', check: 'version', versionPattern: '(\\d+\\.\\d+\\.\\d+)' },
    { command: 'which meson', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install meson',
    apt: 'apt-get install meson',
    pip: 'pip3 install meson',
  },
};

export const BAZEL: CompilerDefinition = {
  id: 'bazel',
  name: 'Bazel',
  category: 'utility' as ExtensionCategory,
  description: 'Bazel - Google\'s build system. Excellent for large monorepos.',
  languages: ['starlark'],
  targets: ['native', 'android', 'ios'],
  fileExtensions: ['BUILD', 'BUILD.bazel', '.bzl', 'WORKSPACE'],
  crossCompile: true,
  detectionCommands: [
    { command: 'bazel --version', check: 'version', versionPattern: 'bazel (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which bazel', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install bazel',
    apt: 'apt-get install bazel',
  },
};

// ============================================================================
// Container & Virtualization
// ============================================================================

export const DOCKER: CompilerDefinition = {
  id: 'docker',
  name: 'Docker',
  category: 'utility' as ExtensionCategory,
  description: 'Docker - container platform for building and deploying.',
  languages: ['dockerfile'],
  targets: ['linux', 'macos', 'windows'],
  fileExtensions: ['Dockerfile', '.dockerfile'],
  detectionCommands: [
    { command: 'docker --version', check: 'version', versionPattern: 'Docker version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which docker', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install --cask docker',
    apt: 'apt-get install docker.io',
  },
};

export const PODMAN: CompilerDefinition = {
  id: 'podman',
  name: 'Podman',
  category: 'utility' as ExtensionCategory,
  description: 'Podman - daemonless container engine, Docker-compatible.',
  languages: ['dockerfile'],
  targets: ['linux', 'macos'],
  fileExtensions: ['Containerfile', 'Dockerfile'],
  detectionCommands: [
    { command: 'podman --version', check: 'version', versionPattern: 'podman version (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which podman', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install podman',
    apt: 'apt-get install podman',
  },
};

// ============================================================================
// Mobile/Cross-Platform
// ============================================================================

export const FLUTTER: CompilerDefinition = {
  id: 'flutter',
  name: 'Flutter',
  category: 'compiler' as ExtensionCategory,
  description: 'Flutter SDK - Google\'s UI toolkit for mobile, web, and desktop.',
  languages: ['dart'],
  targets: ['android', 'ios', 'web', 'linux', 'macos', 'windows'],
  fileExtensions: ['.dart'],
  crossCompile: true,
  debugSupport: true,
  detectionCommands: [
    { command: 'flutter --version', check: 'version', versionPattern: 'Flutter (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which flutter', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install --cask flutter',
    manual: 'https://flutter.dev/docs/get-started/install',
  },
};

export const DART: CompilerDefinition = {
  id: 'dart',
  name: 'Dart',
  category: 'compiler' as ExtensionCategory,
  description: 'Dart programming language - powers Flutter.',
  languages: ['dart'],
  targets: ['native', 'web', 'jvm'],
  fileExtensions: ['.dart'],
  debugSupport: true,
  detectionCommands: [
    { command: 'dart --version', check: 'version', versionPattern: 'Dart SDK version: (\\d+\\.\\d+\\.\\d+)' },
    { command: 'which dart', check: 'exists' },
  ],
  accelerates: ['compile_native'] as BuildOperation[],
  installation: {
    brew: 'brew install dart',
    apt: 'apt-get install dart',
  },
};

// ============================================================================
// All Compiler Definitions
// ============================================================================

export const ALL_COMPILERS: CompilerDefinition[] = [
  // C/C++
  GCC, GPP, CLANG, CLANGPP, MSVC,
  // System SDKs
  XCODE, SWIFT, ANDROID_NDK,
  // JVM
  JAVA, KOTLIN, SCALA, GROOVY,
  // .NET
  DOTNET, MONO,
  // Systems languages
  RUST, GO, ZIG, NIM,
  // Scripting
  PYTHON, PYPY, RUBY, PHP, PERL,
  // Functional
  HASKELL, OCAML, ERLANG, ELIXIR,
  // Build systems
  MAKE, CMAKE, NINJA, MESON, BAZEL,
  // Containers
  DOCKER, PODMAN,
  // Mobile
  FLUTTER, DART,
];

/**
 * Get compilers for a specific language.
 */
export function getCompilersForLanguage(language: string): CompilerDefinition[] {
  return ALL_COMPILERS.filter(c => c.languages.includes(language.toLowerCase()));
}

/**
 * Get compilers that can target a specific platform.
 */
export function getCompilersForTarget(target: CompilerTarget): CompilerDefinition[] {
  return ALL_COMPILERS.filter(c => c.targets.includes(target));
}

/**
 * Get compilers that support cross-compilation.
 */
export function getCrossCompilers(): CompilerDefinition[] {
  return ALL_COMPILERS.filter(c => c.crossCompile);
}

/**
 * Get compilers by file extension.
 */
export function getCompilerForExtension(ext: string): CompilerDefinition[] {
  const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
  return ALL_COMPILERS.filter(c => c.fileExtensions.includes(normalizedExt));
}
