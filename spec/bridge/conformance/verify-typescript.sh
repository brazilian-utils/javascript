#!/usr/bin/env bash
# Drops the generated TypeScript into `src/` and runs the package's own test suite against it.
#
# This is the parity gate: the generated code has to pass the tests the handwritten code passes,
# unmodified. The tree is restored afterwards, whatever the outcome.
#
# Usage: bash spec/bridge/conformance/verify-typescript.sh [vitest path...]
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
bridge="${root}/spec/bridge"
out="${bridge}/out/typescript"

targets=("$@")

if [ ${#targets[@]} -eq 0 ]; then
	targets=(src/is-valid-cnpj src/format-cnpj src/get-municipalities src/get-address-info-by-cep)
fi

restore() {
	rm -rf "${root}/src/_bridge"
	git -C "${root}" checkout -- src >/dev/null 2>&1
}

trap restore EXIT

node "${bridge}/compiler/cli.ts" typescript >/dev/null

mkdir -p "${root}/src/_bridge"
cp -r "${out}/_bridge/." "${root}/src/_bridge/"

for shim in "${out}"/*/; do
	name="$(basename "${shim}")"

	[ "${name}" = "_bridge" ] && continue

	mkdir -p "${root}/src/${name}"
	cp "${shim}${name}.ts" "${root}/src/${name}/${name}.ts"
	echo "replaced src/${name}/${name}.ts with the generated version"
done

existing=()

for target in "${targets[@]}"; do
	[ -d "${root}/${target}" ] && existing+=("${target}")
done

cd "${root}" && npx vp test run "${existing[@]}"
