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

formatCurrency is covered, but needs `num2words` installed (`pip install num2words`):
`brutils/currency.py` imports it at module scope even though `format_currency` never calls it, and
unlike cpf.py/cnpj.py's unused `holidays` import, this one cannot be dodged by loading the file
directly -- the import is inside currency.py itself. getHolidays and isBusinessDay are *not*
covered for Python: brutils has no counterpart to either (only `is_holiday(date, uf)`, a
single-day boolean check with no year-list form and no weekend/business-day concept at all); see
the `skipped` entries below and core/bench/README.md for the full reasoning.

generateCpf and generateCnpj are covered by the "does every value validate" rule described in
core/bench/README.md, not by equality (both sides draw at random). `python._support.Capabilities`,
the generated core's own real (non-fixture) environment, backs `next_u32` with `secrets.randbits`,
a CSPRNG; brutils' generators use the stdlib `random` module, which is not. See the README for
what that costs.
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

# currency.py imports num2words at module scope even though format_currency itself never calls it
# -- the same "declared but not used by this function" situation cpf.py/cnpj.py would have with
# `holidays`, except this one cannot be dodged by loading the file directly: the import is inside
# currency.py itself, not __init__.py's re-export chain. `pip install num2words` is required for
# this row; see core/bench/README.md.
handwritten_currency = load_module_by_path("brutils_currency", BRUTILS_ROOT / "currency.py")

# The generated core is a normal package (core/out/python/__init__.py exists), so it is imported
# the ordinary way once core/out is on sys.path.
sys.path.insert(0, str(REPO_ROOT / "core" / "out"))
from python import is_valid_cpf as generated_cpf_module  # noqa: E402
from python import is_valid_cnpj as generated_cnpj_module  # noqa: E402
from python import format_currency as generated_currency_module  # noqa: E402
from python import generate_cpf as generated_generate_cpf_module  # noqa: E402
from python import generate_cnpj as generated_generate_cnpj_module  # noqa: E402
from python._support import Capabilities as GeneratedCapabilities  # noqa: E402

generated_cpf = generated_cpf_module.is_valid_cpf
generated_cnpj = generated_cnpj_module.is_valid_cnpj
generated_format_currency = generated_currency_module.format_currency
generated_generate_cpf = generated_generate_cpf_module.generate_cpf
generated_generate_cnpj = generated_generate_cnpj_module.generate_cnpj

# Mask-free, since brutils' own validators require that shape (see module docstring above).
NORMALIZED_CPFS = ["12345678909", "00000000000", "52998224725", "11144477735"]
NORMALIZED_CNPJS = ["12345678000195", "00000000000000", "Q0SLFMBD7VX439"]

# Raw floats, the shape brutils.currency.format_currency's own callers use. Includes a negative
# value on purpose -- see the README's "formatCurrency" honesty note for what that turns up.
CURRENCY_VALUES = [0, 1234.56, -1234.56, 0.5, 999999.99, 10]


def to_cents(value):
	"""The scaled integer (Decimal<2>) the generated core's formatCurrency requires."""
	return round(value * 100)


rows = []
disagreements = []
skipped = [
	{
		"utility": "formatCnpj",
		"reason": (
			"brutils.cnpj.format_cnpj validates the checksum and returns None on a bad one; the "
			"generated formatCnpj never validates. Different contracts, not a fair timing comparison."
		),
	},
	{
		"utility": "getHolidays",
		"reason": (
			"brutils has no getHolidays: date_utils.py exposes only is_holiday(date, uf), a "
			"single-day boolean check built on the third-party `holidays` package, not a "
			"function that returns a year's list. There is no counterpart with the same shape "
			"to compare against, so the row is left out rather than comparing two different "
			"operations."
		),
	},
	{
		"utility": "isBusinessDay",
		"reason": (
			"brutils has no isBusinessDay or business-day/weekend concept at all -- only "
			"is_holiday(date, uf), which does not consider weekends and has no includeOptional "
			"equivalent. Not a fair comparison, so it is left out."
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

# formatCurrency has no full-pipeline shape to compare: the generated core's contract
# (docs/contracts.md) always takes an already-scaled Decimal<2>, never a raw float, so scaling is
# always done outside the core. "normalized" for the same reason isValidCpf/isValidCnpj are above:
# both sides receive the value pre-processed into the shape their own API expects. brutils.currency
# also has no `symbol` option -- it always prefixes "R$" -- so the generated side is called with
# symbol=True to match.
_currency_utility = "formatCurrency"
_currency_variant = "normalized"
for _value in CURRENCY_VALUES:
	_a = handwritten_currency.format_currency(_value)
	_b = generated_format_currency(to_cents(_value), True)
	if _a != _b:
		disagreements.append(
			{"utility": _currency_utility, "variant": _currency_variant, "input": _value, "handwritten": _a, "generated": _b}
		)

print(f"{_currency_utility} ({_currency_variant})")
_cursor = 0


def _run_handwritten_currency():
	global _cursor
	handwritten_currency.format_currency(CURRENCY_VALUES[_cursor % len(CURRENCY_VALUES)])
	_cursor += 1


_handwritten_currency_ms = measure(_run_handwritten_currency)
print(f"  handwritten                  {_handwritten_currency_ms:.1f} ms")
_cursor = 0


def _run_generated_currency():
	global _cursor
	generated_format_currency(to_cents(CURRENCY_VALUES[_cursor % len(CURRENCY_VALUES)]), True)
	_cursor += 1


_generated_currency_ms = measure(_run_generated_currency)
print(f"  generated                    {_generated_currency_ms:.1f} ms")
rows.append(
	{
		"utility": _currency_utility,
		"variant": _currency_variant,
		"handwrittenMs": _handwritten_currency_ms,
		"generatedMs": _generated_currency_ms,
		"iterations": ITERATIONS,
	}
)

# generateCpf / generateCnpj draw at random, so there is no fixed value to compare for equality.
# The agreement check instead: every value either side produces must validate under BOTH
# validators -- its own port's and the generated core's -- before either side is timed.
GENERATE_SAMPLES = 500
generated_capabilities = GeneratedCapabilities()  # built once, like a real caller would


def check_generator_agreement(utility, variant, handwritten_generate, handwritten_is_valid, generated_generate, generated_is_valid):
	for _ in range(GENERATE_SAMPLES):
		from_handwritten = handwritten_generate()
		if not handwritten_is_valid(from_handwritten):
			disagreements.append(
				{
					"utility": utility,
					"variant": variant,
					"input": from_handwritten,
					"handwritten": "rejected by its own port's validator",
					"generated": "n/a",
				}
			)
		if not generated_is_valid(from_handwritten):
			disagreements.append(
				{
					"utility": utility,
					"variant": variant,
					"input": from_handwritten,
					"handwritten": "valid (own validator)",
					"generated": "rejected by the generated core's validator",
				}
			)

		from_generated = generated_generate()
		if not generated_is_valid(from_generated):
			disagreements.append(
				{
					"utility": utility,
					"variant": variant,
					"input": from_generated,
					"handwritten": "n/a",
					"generated": "rejected by the generated core's own validator",
				}
			)
		if not handwritten_is_valid(from_generated):
			disagreements.append(
				{
					"utility": utility,
					"variant": variant,
					"input": from_generated,
					"handwritten": "rejected by its own port's validator",
					"generated": "valid (own validator)",
				}
			)


def compare_generate(utility, handwritten_generate, generated_generate):
	variant = "generate"
	print(f"{utility} ({variant})")
	handwritten_ms = measure(handwritten_generate)
	print(f"  handwritten                  {handwritten_ms:.1f} ms")
	generated_ms = measure(generated_generate)
	print(f"  generated                    {generated_ms:.1f} ms")
	rows.append({"utility": utility, "variant": variant, "handwrittenMs": handwritten_ms, "generatedMs": generated_ms, "iterations": ITERATIONS})


# brutils.cnpj.generate defaults to branch=1 (fixed), not a random branch like the generated core
# -- irrelevant here, since only validity is being checked, not equality; see the README.
check_generator_agreement(
	"generateCpf",
	"generate",
	handwritten_cpf.generate,
	handwritten_cpf.is_valid,
	lambda: generated_generate_cpf(generated_capabilities),
	generated_cpf,
)
compare_generate("generateCpf", handwritten_cpf.generate, lambda: generated_generate_cpf(generated_capabilities))

check_generator_agreement(
	"generateCnpj",
	"generate",
	handwritten_cnpj.generate,
	handwritten_cnpj.is_valid,
	lambda: generated_generate_cnpj(generated_capabilities),
	lambda value: generated_cnpj(value, "1"),
)
compare_generate("generateCnpj", handwritten_cnpj.generate, lambda: generated_generate_cnpj(generated_capabilities))

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
