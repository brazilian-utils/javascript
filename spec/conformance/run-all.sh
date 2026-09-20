#!/usr/bin/env bash
# Regenerates every target from the specs and runs its conformance driver.
#
# Usage: bash spec/conformance/run-all.sh
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
generated="${root}/spec/generated"
work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

node "${root}/spec/codegen/vectors.ts" >/dev/null
node "${root}/spec/codegen/emit.ts" >/dev/null

echo "--- differential against the package this repository ships"
node "${root}/spec/conformance/differential-javascript.ts"

echo "--- conformance of every generated target"
node "${generated}/typescript/conformance.ts"
python3 "${generated}/python/conformance.py"
ruby "${generated}/ruby/conformance.rb"
(cd "${generated}/go" && go run ./conformance)
rustc --edition 2021 -o "${work}/rust-conformance" "${generated}/rust/conformance.rs" 2>/dev/null
"${work}/rust-conformance"
javac -nowarn -d "${work}/java" "${generated}"/java/*.java
java -cp "${work}/java" Conformance
