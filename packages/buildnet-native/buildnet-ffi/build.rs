//! Build script for napi-rs bindings

fn main() {
    #[cfg(feature = "node")]
    napi_build::setup();
}
