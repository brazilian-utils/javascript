#!/usr/bin/env bash
# Records what the npm package answers, compiles every target, and replays the recording
# through all of them.
#
# Nothing here knows which utilities exist. `conformance/record.ts` reads the recorders under
# `conformance/cases/`, `compiler/cli.ts` compiles whatever is under `source/`, and
# `conformance/drivers.ts` writes each target's replay program from the compiled signatures.
# Adding a utility therefore changes this script not at all.
#
# A utility that reaches the network is served locally for the run, over the runtime's
# `BRUTILS_BRIDGE_HTTP_ORIGIN` hook, so every target talks to the same answers the recording
# was taken from.
#
# The eighth arm is not a language: it is the C ABI the Rust crate exposes, which is what a
# hand-written binding in Python, Ruby, C#, Java or Erlang would call instead of generated
# source. `spec/BINDINGS-INVESTIGATION.md` has the numbers that make that a real option.
#
# Usage: `bash spec/bridge/conformance/run-all.sh`
set -uo pipefail

bridge="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${bridge}/out"
port="${BRUTILS_BRIDGE_PORT:-18080}"
export BRUTILS_BRIDGE_HTTP_ORIGIN="http://127.0.0.1:${port}"
status=0

step() {
	echo
	echo "── $1"
}

run() {
	local label="$1"
	shift

	if ! "$@"; then
		echo "${label}: FAILED"
		status=1
	fi
}

step "recording what the package this repository ships answers"
node "${bridge}/conformance/record.ts"

step "compiling source/ into every target"
node "${bridge}/compiler/cli.ts"
node "${bridge}/conformance/drivers.ts"

if [ ! -f "${out}/typescript/conformance.ts" ]; then
	echo
	echo "no utilities under source/: the engine has nothing to replay"
	exit 0
fi

step "serving what the generated code talks to, on ${BRUTILS_BRIDGE_HTTP_ORIGIN}"
node "${bridge}/conformance/serve.ts" "${port}" &
server=$!
trap 'kill "${server}" 2>/dev/null' EXIT
sleep 1

step "typescript"
run typescript bash -c "cd '${out}/typescript' && node conformance.ts"

step "python"
run python bash -c "cd '${out}/python' && python3 conformance.py"

step "ruby"
run ruby bash -c "cd '${out}/ruby' && ruby conformance.rb"

step "go"
run go bash -c "cd '${out}/go' && go run ./conformance"

step "rust"
run rust bash -c "cd '${out}/rust' && cargo run --quiet --release --bin conformance 2>/dev/null"

step "java"
run java bash -c "cd '${out}/java' && javac -nowarn -d classes *.java >/dev/null 2>&1 && java -cp classes Conformance"

step "c abi (the shared core every hand-written binding calls)"
run cabi bash -c "cd '${out}/rust' && cargo build --quiet --release 2>/dev/null && gcc -O2 -D_GNU_SOURCE -I. conformance_cabi.c -o conformance_cabi -Ltarget/release -lbrazilian_utils_bridge -Wl,-rpath,'${out}/rust/target/release' && ./conformance_cabi"

step "csharp"
run csharp bash -c "cd '${out}/csharp' && DOTNET_CLI_TELEMETRY_OPTOUT=1 dotnet run --verbosity quiet"

echo
if [ "${status}" -eq 0 ]; then
	echo "all seven targets, and the C ABI, match the JavaScript package"
else
	echo "at least one target diverged"
fi

exit "${status}"
