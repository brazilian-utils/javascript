#!/usr/bin/env bash
# The native binding arms: the shared core over the boundary each ecosystem actually ships.
#
# The first pass measured the bindings a script reaches for — ctypes, fiddle, a wasm runtime —
# and concluded the boundary costs more than the work. That is true of those mechanisms and
# false of the ones a package ships, so each ecosystem's own is measured here:
#
#   c       the floor, the same shared library called from C
#   python  a CPython extension module, not ctypes
#   ruby    a C extension, not fiddle or the ffi gem
#   java    the Foreign Function & Memory API with a trivial downcall
#   csharp  P/Invoke with the GC transition suppressed
#
# Each language also runs a "callonly" arm over one cached input, and C runs the same, so
# subtracting the two leaves the boundary and nothing else.
#
# Usage: bash spec/bench/run-native.sh >> spec/bench/results.jsonl
set -euo pipefail

bench="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
core_dir="${bench}/core/target/release"

cargo build --quiet --release --manifest-path "${bench}/core/Cargo.toml"

mkdir -p "${bench}/.build/native/python" "${bench}/.build/native/ruby"

python3 - "${bench}" <<'PY'
import json
import pathlib
import struct
import sys

bench = pathlib.Path(sys.argv[1])
corpus = json.loads((bench / "corpus.json").read_text())
packed = bytearray()

for value in corpus:
    encoded = value.encode("utf-8")
    packed += struct.pack("<I", len(encoded)) + encoded

(bench / ".build/corpus.bin").write_bytes(packed)
PY

python_include="$(python3 -c 'import sysconfig; print(sysconfig.get_paths()["include"])')"
ruby_include="$(ruby -e 'require "rbconfig"; print RbConfig::CONFIG["rubyhdrdir"]')"
ruby_arch_include="$(ruby -e 'require "rbconfig"; print RbConfig::CONFIG["rubyarchhdrdir"]')"

gcc -O2 "${bench}/native/c_bench.c" -o "${bench}/.build/native/c_bench" \
	-L"${core_dir}" -lbrutils_bench_core -Wl,-rpath,"${core_dir}"
"${bench}/.build/native/c_bench" "${bench}/.build/corpus.bin"

gcc -O2 -shared -fPIC -I"${python_include}" "${bench}/native/python_cext.c" \
	-o "${bench}/.build/native/python/cpf_native.so" \
	-L"${core_dir}" -lbrutils_bench_core -Wl,-rpath,"${core_dir}"
python3 "${bench}/harness/python_native.py"

gcc -O2 -shared -fPIC -I"${ruby_include}" -I"${ruby_arch_include}" "${bench}/native/ruby_cext.c" \
	-o "${bench}/.build/native/ruby/cpf_native.so" \
	-L"${core_dir}" -lbrutils_bench_core -Wl,-rpath,"${core_dir}"
ruby "${bench}/harness/ruby_native.rb"

javac --enable-preview --release 21 -nowarn -d "${bench}/.build/java" \
	"${bench}/harness/java/JavaNativeBench.java" 2>/dev/null
java --enable-preview -Dcore.library="${core_dir}/libbrutils_bench_core.so" \
	-cp "${bench}/.build/java" JavaNativeBench "${bench}/corpus.json" 2>/dev/null

cd "${bench}/harness/csharp"
DOTNET_CLI_TELEMETRY_OPTOUT=1 dotnet run -c Release --verbosity quiet -- \
	"${bench}/corpus.json" "${core_dir}/libbrutils_bench_core.so"
