//! BuildNet FFI Bindings
//!
//! Provides bindings for:
//! - Node.js via napi-rs
//! - Bun/Deno via C ABI
//! - Python via PyO3

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::Arc;
use std::path::PathBuf;

use buildnet_core::{ArtifactCache, Config, StateManager, BuildOrchestrator};

// ============================================================================
// C ABI for Bun/Deno FFI
// ============================================================================

/// Opaque handle to BuildNet instance
pub struct BuildNetHandle {
    #[allow(dead_code)]
    config: Config,
    state: Arc<StateManager>,
    #[allow(dead_code)]
    cache: Arc<ArtifactCache>,
    orchestrator: BuildOrchestrator,
}

// Safety: BuildNetHandle is Send because all its fields are Send
unsafe impl Send for BuildNetHandle {}

/// Create a new BuildNet instance
///
/// # Safety
/// The returned pointer must be freed with `buildnet_free`
#[no_mangle]
pub unsafe extern "C" fn buildnet_new(project_root: *const c_char) -> *mut BuildNetHandle {
    let project_root = if project_root.is_null() {
        std::env::current_dir().expect("Failed to get current directory")
    } else {
        let c_str = CStr::from_ptr(project_root);
        PathBuf::from(c_str.to_str().unwrap_or("."))
    };

    let config = Config::for_pnpm_monorepo(project_root.clone());
    let db_path = project_root.join(".buildnet/state.db");
    let cache_path = project_root.join(".buildnet/cache");

    let state = match StateManager::new(&db_path) {
        Ok(s) => Arc::new(s),
        Err(e) => {
            eprintln!("Failed to create state manager: {}", e);
            return std::ptr::null_mut();
        }
    };

    let cache = match ArtifactCache::new(&cache_path) {
        Ok(c) => Arc::new(c),
        Err(e) => {
            eprintln!("Failed to create artifact cache: {}", e);
            return std::ptr::null_mut();
        }
    };

    let orchestrator = BuildOrchestrator::new(config.clone(), Arc::clone(&state), Arc::clone(&cache));

    let handle = Box::new(BuildNetHandle {
        config,
        state,
        cache,
        orchestrator,
    });

    Box::into_raw(handle)
}

/// Free a BuildNet instance
///
/// # Safety
/// The pointer must have been created by `buildnet_new`
#[no_mangle]
pub unsafe extern "C" fn buildnet_free(handle: *mut BuildNetHandle) {
    if !handle.is_null() {
        let _ = Box::from_raw(handle);
    }
}

/// Get version string
///
/// # Safety
/// The returned string must be freed with `buildnet_string_free`
#[no_mangle]
pub extern "C" fn buildnet_version() -> *mut c_char {
    let version = CString::new(buildnet_core::VERSION).unwrap();
    version.into_raw()
}

/// Free a string returned by BuildNet
///
/// # Safety
/// The pointer must have been created by a BuildNet function
#[no_mangle]
pub unsafe extern "C" fn buildnet_string_free(s: *mut c_char) {
    if !s.is_null() {
        let _ = CString::from_raw(s);
    }
}

/// Build all packages (blocking)
///
/// Returns JSON string with results. Must be freed with `buildnet_string_free`.
///
/// # Safety
/// Handle must be valid
#[no_mangle]
pub unsafe extern "C" fn buildnet_build_all(handle: *mut BuildNetHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }

    let handle = &*handle;

    // Create a runtime for the async operation
    let rt = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(e) => {
            let error = format!(r#"{{"error": "{}"}}"#, e);
            return CString::new(error).unwrap().into_raw();
        }
    };

    let result = rt.block_on(async {
        handle.orchestrator.build_all().await
    });

    match result {
        Ok(results) => {
            let json = serde_json::to_string(&results).unwrap_or_else(|_| "[]".to_string());
            CString::new(json).unwrap().into_raw()
        }
        Err(e) => {
            let error = format!(r#"{{"error": "{}"}}"#, e);
            CString::new(error).unwrap().into_raw()
        }
    }
}

/// Get build statistics as JSON
///
/// # Safety
/// Handle must be valid
#[no_mangle]
pub unsafe extern "C" fn buildnet_stats(handle: *mut BuildNetHandle) -> *mut c_char {
    if handle.is_null() {
        return std::ptr::null_mut();
    }

    let handle = &*handle;

    match handle.state.stats() {
        Ok(stats) => {
            let json = serde_json::to_string(&stats).unwrap_or_else(|_| "{}".to_string());
            CString::new(json).unwrap().into_raw()
        }
        Err(e) => {
            let error = format!(r#"{{"error": "{}"}}"#, e);
            CString::new(error).unwrap().into_raw()
        }
    }
}

// ============================================================================
// Node.js Bindings via napi-rs (sync only to avoid Send issues)
// ============================================================================

#[cfg(feature = "node")]
mod node {
    use napi::bindgen_prelude::*;
    use napi_derive::napi;
    use std::ffi::CString;

    #[napi]
    pub fn version() -> String {
        buildnet_core::VERSION.to_string()
    }

    #[napi]
    pub fn build_all_sync(project_root: Option<String>) -> napi::Result<String> {
        let project_root = project_root.unwrap_or_else(|| ".".to_string());
        let c_str = CString::new(project_root).unwrap();

        unsafe {
            let handle = super::buildnet_new(c_str.as_ptr());
            if handle.is_null() {
                return Err(napi::Error::from_reason("Failed to create BuildNet instance"));
            }

            let result = super::buildnet_build_all(handle);
            super::buildnet_free(handle);

            if result.is_null() {
                return Err(napi::Error::from_reason("Build failed"));
            }

            let json = std::ffi::CStr::from_ptr(result).to_string_lossy().to_string();
            super::buildnet_string_free(result);
            Ok(json)
        }
    }

    #[napi]
    pub fn stats_sync(project_root: Option<String>) -> napi::Result<String> {
        let project_root = project_root.unwrap_or_else(|| ".".to_string());
        let c_str = CString::new(project_root).unwrap();

        unsafe {
            let handle = super::buildnet_new(c_str.as_ptr());
            if handle.is_null() {
                return Err(napi::Error::from_reason("Failed to create BuildNet instance"));
            }

            let result = super::buildnet_stats(handle);
            super::buildnet_free(handle);

            if result.is_null() {
                return Err(napi::Error::from_reason("Failed to get stats"));
            }

            let json = std::ffi::CStr::from_ptr(result).to_string_lossy().to_string();
            super::buildnet_string_free(result);
            Ok(json)
        }
    }
}

// ============================================================================
// Python Bindings via PyO3
// ============================================================================

#[cfg(feature = "python")]
mod python {
    use pyo3::prelude::*;
    use std::ffi::CString;

    #[pyfunction]
    fn version() -> String {
        buildnet_core::VERSION.to_string()
    }

    #[pyfunction]
    fn build_all(project_root: Option<String>) -> PyResult<String> {
        let project_root = project_root.unwrap_or_else(|| ".".to_string());
        let c_str = CString::new(project_root).unwrap();

        unsafe {
            let handle = super::buildnet_new(c_str.as_ptr());
            if handle.is_null() {
                return Err(pyo3::exceptions::PyRuntimeError::new_err(
                    "Failed to create BuildNet instance",
                ));
            }

            let result = super::buildnet_build_all(handle);
            super::buildnet_free(handle);

            if result.is_null() {
                return Err(pyo3::exceptions::PyRuntimeError::new_err("Build failed"));
            }

            let json = std::ffi::CStr::from_ptr(result).to_string_lossy().to_string();
            super::buildnet_string_free(result);
            Ok(json)
        }
    }

    #[pyfunction]
    fn stats(project_root: Option<String>) -> PyResult<String> {
        let project_root = project_root.unwrap_or_else(|| ".".to_string());
        let c_str = CString::new(project_root).unwrap();

        unsafe {
            let handle = super::buildnet_new(c_str.as_ptr());
            if handle.is_null() {
                return Err(pyo3::exceptions::PyRuntimeError::new_err(
                    "Failed to create BuildNet instance",
                ));
            }

            let result = super::buildnet_stats(handle);
            super::buildnet_free(handle);

            if result.is_null() {
                return Err(pyo3::exceptions::PyRuntimeError::new_err(
                    "Failed to get stats",
                ));
            }

            let json = std::ffi::CStr::from_ptr(result).to_string_lossy().to_string();
            super::buildnet_string_free(result);
            Ok(json)
        }
    }

    #[pymodule]
    fn buildnet(m: &Bound<'_, PyModule>) -> PyResult<()> {
        m.add_function(wrap_pyfunction!(version, m)?)?;
        m.add_function(wrap_pyfunction!(build_all, m)?)?;
        m.add_function(wrap_pyfunction!(stats, m)?)?;
        Ok(())
    }
}
