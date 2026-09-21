#!/usr/bin/env bash
# Regenerates every target and replays the recorded vectors through all seven of them.
#
# The vectors and the municipality dump are recordings of the JavaScript package this
# repository ships, so a green run means the generated code answers exactly what the
# handwritten code answers, in every language.
#
# Usage: `bash spec/bridge/conformance/run-all.sh`
set -uo pipefail

bridge="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${bridge}/out"
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

step "recording the expectations from the package this repository ships"
node "${bridge}/conformance/vectors.ts"
node "${bridge}/conformance/municipalities.ts"

step "compiling source/ into every target"
node "${bridge}/compiler/cli.ts"
node "${bridge}/conformance/drivers.ts"

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
run java bash -c "cd '${out}/java' && javac -nowarn -d classes *.java >/dev/null 2>&1 && java -cp classes Conformance ../../conformance/vectors.tsv"

step "csharp"
run csharp bash -c "cd '${out}/csharp' && DOTNET_CLI_TELEMETRY_OPTOUT=1 dotnet run --verbosity quiet -- ../../conformance/vectors.tsv"

echo
if [ "${status}" -eq 0 ]; then
	echo "all seven targets match the JavaScript package"
else
	echo "at least one target diverged"
fi

exit "${status}"
