#!/usr/bin/env python3
"""Benchmarks the generated Python core against brazilian-utils' handwritten package.

`brutils/cpf.py` and `brutils/cnpj.py` are loaded directly by file path rather than imported as
the `brutils` package, because the package's `pyproject.toml` declares `holidays` and `num2words`
that those two modules never actually import -- see core/bench/README.md.

Fairness note: unlike the JS handwritten package, `brutils.cpf.is_valid` / `brutils.cnpj.is_valid`
do **not** strip mask characters themselves -- they require an already-digit (or, for CNPJ,
already-alphanumeric) string and return False on anything else without doing any real validation
work. Feeding them a masked string like "123.456.789-09" would not exercise their validation logic
at all, so it would not be a real speed comparison. Every row here is therefore "normalized-only":
both sides receive the same pre-sanitized, mask-free string. This means the generated core is
still doing marginally more work than strictly necessary (its regex still walks the string
checking for mask characters that are not there), which is reported plainly rather than hidden --
see the README.

formatCnpj is left out for Python entirely: `brutils.cnpj.format_cnpj` calls `is_valid` first and
returns None for a bad checksum, while the generated `formatCnpj` never validates and has no
concept of a bad checksum. That is not a normalization difference to paper over with a shared
input -- it is a different contract (validate-then-format vs. format-unconditionally), so timing
them against each other would mostly measure the checksum computation Python's port does and ours
does not.
"""

import importlib.util
import json
import os
import platform
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
# The handwritten ports are separate repositories, checked out beside this one by default.
# `BRUTILS_ROOT` overrides that for a checkout that lives somewhere else.
PORTS_ROOT = Path(os.environ.get("BRUTILS_ROOT", REPO_ROOT.parent / "brazilian-utils"))
BRUTILS_ROOT = PORTS_ROOT / "python" / "brutils"

BUDGET = 1.5
WARMUP = 20_000
ITERATIONS = 200_000


def load_module_by_path(name: str, path: Path):
	if not path.exists():
		sys.stderr.write(
			f"error: missing handwritten Python port at {path}\n"
			"Clone it first:\n"
			"  git clone https://github.com/brazilian-utils/brazilian-utils /home/user/brazilian-utils "
			"(or clone the python/ subtree separately -- see core/bench/README.md)\n"
		)
		sys.exit(1)
	spec = importlib.util.spec_from_file_location(name, path)
	module = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(module)
	return module


handwritten_cpf = load_module_by_path("brutils_cpf", BRUTILS_ROOT / "cpf.py")
handwritten_cnpj = load_module_by_path("brutils_cnpj", BRUTILS_ROOT / "cnpj.py")

# The generated core is a normal package (core/out/python/__init__.py exists), so it is imported
# the ordinary way once core/out is on sys.path.
sys.path.insert(0, str(REPO_ROOT / "core" / "out"))
from python import is_valid_cpf as generated_cpf_module  # noqa: E402
from python import is_valid_cnpj as generated_cnpj_module  # noqa: E402

generated_cpf = generated_cpf_module.is_valid_cpf
generated_cnpj = generated_cnpj_module.is_valid_cnpj

# Mask-free, since brutils' own validators require that shape (see module docstring above).
NORMALIZED_CPFS = ["12345678909", "00000000000", "52998224725", "11144477735"]
NORMALIZED_CNPJS = ["12345678000195", "00000000000000", "Q0SLFMBD7VX439"]

rows = []
disagreements = []
skipped = [
	{
		"utility": "formatCnpj",
		"reason": (
			"brutils.cnpj.format_cnpj validates the checksum and returns None on a bad one; the "
			"generated formatCnpj never validates. Different contracts, not a fair timing comparison."
		),
	}
]


def check_agreement(utility, variant, inputs, handwritten, generated):
	for value in inputs:
		a = handwritten(value)
		b = generated(value)
		if a != b:
			disagreements.append(
				{"utility": utility, "variant": variant, "input": value, "handwritten": a, "generated": b}
			)


def measure(run):
	for _ in range(WARMUP):
		run()
	started = time.perf_counter()
	for _ in range(ITERATIONS):
		run()
	return (time.perf_counter() - started) * 1000.0


def compare(utility, variant, inputs, handwritten, generated):
	check_agreement(utility, variant, inputs, handwritten, generated)

	print(f"{utility} ({variant})")
	cursor = 0

	def run_handwritten():
		nonlocal cursor
		handwritten(inputs[cursor % len(inputs)])
		cursor += 1

	handwritten_ms = measure(run_handwritten)
	print(f"  handwritten                  {handwritten_ms:.1f} ms")

	cursor = 0

	def run_generated():
		nonlocal cursor
		generated(inputs[cursor % len(inputs)])
		cursor += 1

	generated_ms = measure(run_generated)
	print(f"  generated                    {generated_ms:.1f} ms")

	rows.append(
		{"utility": utility, "variant": variant, "handwrittenMs": handwritten_ms, "generatedMs": generated_ms, "iterations": ITERATIONS}
	)


compare(
	"isValidCpf",
	"normalized",
	NORMALIZED_CPFS,
	handwritten_cpf.is_valid,
	lambda value: generated_cpf(value),
)

compare(
	"isValidCnpj",
	"normalized",
	NORMALIZED_CNPJS,
	handwritten_cnpj.is_valid,
	lambda value: generated_cnpj(value, "2"),
)

print("\n| utility | variant | handwritten | generated | ratio | budget |")
print("| --- | --- | --- | --- | --- | --- |")
for row in rows:
	ratio = row["generatedMs"] / row["handwrittenMs"]
	ok = ratio <= BUDGET
	status = "within" if ok else "OVER"
	print(
		f"| `{row['utility']}` | {row['variant']} | {row['handwrittenMs']:.1f} ms | {row['generatedMs']:.1f} ms | {ratio:.2f}x | {status} {BUDGET}x |"
	)

if disagreements:
	print("\nDISAGREEMENTS:")
	for d in disagreements:
		print(f"  {d['utility']} ({d['variant']}) input={d['input']!r} handwritten={d['handwritten']!r} generated={d['generated']!r}")

if skipped:
	print("\nSKIPPED:")
	for s in skipped:
		print(f"  {s['utility']}: {s['reason']}")

result = {
	"language": "python",
	"toolchain": {"python": platform.python_version()},
	"rows": rows,
	"disagreements": disagreements,
	"skipped": skipped,
}
print(f"BENCH_JSON {json.dumps(result)}")
