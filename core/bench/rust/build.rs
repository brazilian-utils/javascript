//! Records the compiler the numbers were measured with, so the reported toolchain is the real one
//! rather than whatever was written down by hand.

use std::process::Command;

fn main() {
    let version = Command::new("rustc")
        .arg("--version")
        .output()
        .ok()
        .and_then(|out| String::from_utf8(out.stdout).ok())
        .map(|text| text.trim().to_owned())
        .unwrap_or_else(|| "unknown".to_owned());
    println!("cargo:rustc-env=BENCH_RUSTC_VERSION={version}");
    println!("cargo:rerun-if-changed=build.rs");
}
