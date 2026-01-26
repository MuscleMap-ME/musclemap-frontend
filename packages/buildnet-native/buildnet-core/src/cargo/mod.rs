//! Cargo build integration for BuildNet
//!
//! Provides native support for building Rust projects with cargo,
//! including workspace management, target caching, and incremental builds.

mod builder;
mod workspace;
mod target;

pub use builder::{CargoBuilder, CargoBuildOptions, CargoBuildResult, CargoProfile};
pub use workspace::{CargoWorkspace, CrateInfo, CrateType};
pub use target::{TargetCache, TargetTriple, BuildArtifact};
