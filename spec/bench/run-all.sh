#!/usr/bin/env bash
# Rebuilds every artifact and runs every benchmark arm, writing one JSON line per measurement.
#
# Usage: bash spec/bench/run-all.sh > spec/bench/results.jsonl
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
bench="${root}/spec/bench"

cargo build --quiet --release --manifest-path "${bench}/core/Cargo.toml"
cargo build --quiet --release --target wasm32-unknown-unknown --manifest-path "${bench}/core/Cargo.toml"
node "${bench}/prepare.ts" >/dev/null

mkdir -p "${bench}/.build"
npx --yes esbuild "${root}/src/index.ts" --bundle --format=esm --platform=neutral \
	--outfile="${bench}/.build/shipped.mjs" --log-level=error

node "${bench}/harness/node-bench.ts"
python3 "${bench}/harness/python_bench.py"
ruby "${bench}/harness/ruby_bench.rb"

cp "${bench}/.spec-masked-strict/generated/go/cpf/cpf.go" "${bench}/harness/go/generated/cpf/cpf.go"
cp "${bench}/.spec-masked-strict/generated/go/specruntime/specruntime.go" "${bench}/harness/go/generated/specruntime/specruntime.go"
sed -i 's|brazilianutils/spec/specruntime|brutilsbench/generated/specruntime|' "${bench}/harness/go/generated/cpf/cpf.go"
(cd "${bench}/harness/go" && go run .)

cp "${bench}/.spec-masked-strict/generated/java/Cpf.java" "${bench}/.spec-masked-strict/generated/java/SpecRuntime.java" "${bench}/harness/java/"
javac -nowarn -d "${bench}/.build/java" "${bench}"/harness/java/*.java 2>/dev/null
java -cp "${bench}/.build/java" JavaBench "${bench}/corpus.json" 2>/dev/null
