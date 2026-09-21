#!/usr/bin/env bash
# Drops the generated TypeScript into `src/` and runs the package's own test suite against it.
#
# This is the parity gate: the generated code has to pass the tests the handwritten code
# passes, unmodified. Every utility under `source/` replaces its namesake under `src/`, and the
# suites that cover them are the ones that run. The tree is restored afterwards, whatever the
# outcome.
#
# Usage: bash spec/bridge/conformance/verify-typescript.sh [vitest path...]
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
bridge="${root}/spec/bridge"
out="${bridge}/out/typescript"

restore() {
	rm -rf "${root}/src/_bridge"
	git -C "${root}" checkout -- src >/dev/null 2>&1
	# `compiler/cli.ts` clears each target before re-emitting, which drops the replay programs
	# that are committed alongside the utilities. Put them back, so running this gate leaves
	# `out/` exactly as the repository has it.
	node "${bridge}/conformance/drivers.ts" >/dev/null
}

trap restore EXIT

node "${bridge}/compiler/cli.ts" typescript >/dev/null

if [ ! -d "${out}/_bridge" ]; then
	echo "no utilities under source/: nothing to verify"
	exit 0
fi

mkdir -p "${root}/src/_bridge"
cp -r "${out}/_bridge/." "${root}/src/_bridge/"

replaced=()

for shim in "${out}"/*/; do
	name="$(basename "${shim}")"

	[ "${name}" = "_bridge" ] && continue

	mkdir -p "${root}/src/${name}"
	cp "${shim}${name}.ts" "${root}/src/${name}/${name}.ts"
	replaced+=("src/${name}")
	echo "replaced src/${name}/${name}.ts with the generated version"
done

targets=("$@")

if [ ${#targets[@]} -eq 0 ]; then
	targets=("${replaced[@]}")
fi

if [ ${#targets[@]} -eq 0 ]; then
	echo "no utilities under source/: nothing to verify"
	exit 0
fi

cd "${root}" && npx vp test run "${targets[@]}"
