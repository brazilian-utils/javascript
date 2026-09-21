"""Python arms: handwritten source, generated source, the Rust core over wasm, and over ctypes.

Every arm validates the same 1000 inputs and reports the best nanoseconds per call over several
repetitions, plus how many it found valid, so an arm cannot win by doing less work.
"""

import ctypes
import json
import os
import re
import struct
import sys
import time
from pathlib import Path

BENCH = Path(__file__).resolve().parent.parent
CORPUS = json.loads((BENCH / "corpus.json").read_text())
REPS = int(os.environ.get("BENCH_REPS", "7"))

sys.path.insert(0, str(BENCH / ".spec-masked-strict/generated/python"))

# --- arm: handwritten, the way a contributor would write it ---------------------------------

SHAPE = re.compile(r"^\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{2}$", re.ASCII)
NON_DIGITS = re.compile(r"\D", re.ASCII)


def _check_digit(base):
    total = sum(int(digit) * (len(base) + 1 - index) for index, digit in enumerate(base))
    digit = 11 - (total % 11)

    return 0 if digit >= 10 else digit


def handwritten_is_valid(cpf):
    if not isinstance(cpf, str):
        return False

    if not SHAPE.match(cpf.strip()):
        return False

    digits = NON_DIGITS.sub("", cpf)

    if digits == digits[0] * 11:
        return False

    return int(digits[9]) == _check_digit(digits[:9]) and int(digits[10]) == _check_digit(digits[:10])


# --- arm: the generated source ---------------------------------------------------------------

from brutils.cpf import is_valid as generated_is_valid  # noqa: E402

# --- arm: what the emitter COULD generate for Python -----------------------------------------
#
# Same spec, same semantics, but the charsets are rendered as an explicit regex character class
# instead of a per code point loop, so the work happens in CPython's C regex engine. The class is
# spelled out code point by code point: `\s` would not mean the same set.

WS = "\t\n\x0b\x0c\r \xa0  -     　﻿"
WS_CHARS = "\t\n\x0b\x0c\r \xa0                　﻿"
SEP = f"[{WS}.\\-/]"
OPT_SHAPE = re.compile(f"^[0-9]{{3}}{SEP}*[0-9]{{3}}{SEP}*[0-9]{{3}}{SEP}*[0-9]{{2}}$")
OPT_NON_DIGITS = re.compile("[^0-9]")


def generated_opt_is_valid(cpf):
    if not isinstance(cpf, str):
        return False

    if not OPT_SHAPE.match(cpf.strip(WS_CHARS)):
        return False

    digits = OPT_NON_DIGITS.sub("", cpf)

    if digits == digits[0] * 11:
        return False

    return int(digits[9]) == _check_digit(digits[:9]) and int(digits[10]) == _check_digit(digits[:10])


# --- arm: one anchored regex with capture groups ---------------------------------------------
#
# The trim, the shape check and the digit extraction collapse into a single match: the leading
# and trailing whitespace become `[WS]*` and the four digit runs are captured instead of being
# filtered out of the string afterwards.

WS_CLASS = f"[{WS}]"
OPT2_SHAPE = re.compile(
    f"^{WS_CLASS}*([0-9]{{3}}){SEP}*([0-9]{{3}}){SEP}*([0-9]{{3}}){SEP}*([0-9]{{2}}){WS_CLASS}*$"
)


def generated_opt2_is_valid(cpf):
    if not isinstance(cpf, str):
        return False

    match = OPT2_SHAPE.match(cpf)

    if match is None:
        return False

    digits = "".join(match.groups())

    if digits == digits[0] * 11:
        return False

    return int(digits[9]) == _check_digit(digits[:9]) and int(digits[10]) == _check_digit(digits[:10])

# --- arms: the shared Rust core --------------------------------------------------------------

import wasmtime  # noqa: E402

WASM_PATH = BENCH / "core/target/wasm32-unknown-unknown/release/brutils_bench_core.wasm"
engine = wasmtime.Engine()
module = wasmtime.Module.from_file(engine, str(WASM_PATH))
store = wasmtime.Store(engine)
instance = wasmtime.Instance(store, module, [])
exports = instance.exports(store)
memory = exports["memory"]
wasm_is_valid = exports["cpf_is_valid"]
wasm_is_valid_batch = exports["cpf_is_valid_batch"]
arena_alloc = exports["arena_alloc"]
arena_reset = exports["arena_reset"]

arena_reset(store)
scratch = arena_alloc(store, 64)
batch_input = arena_alloc(store, 1 << 18)
batch_output = arena_alloc(store, len(CORPUS))

LIB_PATH = BENCH / "core/target/release/libbrutils_bench_core.so"
lib = ctypes.CDLL(str(LIB_PATH))
lib.cpf_is_valid.argtypes = [ctypes.c_char_p, ctypes.c_size_t]
lib.cpf_is_valid.restype = ctypes.c_int
lib.cpf_is_valid_batch.argtypes = [ctypes.c_char_p, ctypes.c_size_t, ctypes.c_char_p, ctypes.c_size_t]
lib.cpf_is_valid_batch.restype = ctypes.c_int


def run_wasm(inputs):
    valid = 0

    for value in inputs:
        encoded = value.encode("utf-8")
        memory.write(store, encoded, scratch)

        if wasm_is_valid(store, scratch, len(encoded)) == 1:
            valid += 1

    return valid


# The same arm, written the way a binding generator would: the linear memory is poked through
# its raw pointer instead of wasmtime-py's bounds checked `Memory.write`.
MEM_PTR = ctypes.cast(memory.data_ptr(store), ctypes.POINTER(ctypes.c_char))


def run_wasm_fast(inputs):
    valid = 0

    for value in inputs:
        encoded = value.encode("utf-8")
        length = len(encoded)
        ctypes.memmove(ctypes.byref(MEM_PTR.contents, scratch), encoded, length)

        if wasm_is_valid(store, scratch, length) == 1:
            valid += 1

    return valid


def run_wasm_callonly(inputs):
    """Just the boundary: the same pointer and length every time, no marshalling at all."""
    valid = 0

    for _ in inputs:
        if wasm_is_valid(store, scratch, 11) == 1:
            valid += 1

    return valid


def run_ffi_callonly(inputs):
    """Just the boundary, over ctypes."""
    payload = b"12345678909"
    valid = 0

    for _ in inputs:
        if lib.cpf_is_valid(payload, 11) == 1:
            valid += 1

    return valid


def run_wasm_batch(inputs):
    packed = bytearray()

    for value in inputs:
        encoded = value.encode("utf-8")
        packed += struct.pack("<I", len(encoded)) + encoded

    memory.write(store, bytes(packed), batch_input)
    wasm_is_valid_batch(store, batch_input, len(packed), batch_output, len(inputs))
    results = memory.read(store, batch_output, batch_output + len(inputs))

    return sum(1 for byte in results if byte == 1)


def run_ffi(inputs):
    valid = 0

    for value in inputs:
        encoded = value.encode("utf-8")

        if lib.cpf_is_valid(encoded, len(encoded)) == 1:
            valid += 1

    return valid


def run_ffi_batch(inputs):
    packed = bytearray()

    for value in inputs:
        encoded = value.encode("utf-8")
        packed += struct.pack("<I", len(encoded)) + encoded

    output = ctypes.create_string_buffer(len(inputs))
    lib.cpf_is_valid_batch(bytes(packed), len(packed), output, len(inputs))

    return sum(1 for byte in output.raw if byte == 1)


def measure(arm, run):
    for _ in range(2):
        run(CORPUS)

    best = float("inf")
    valid = 0

    for _ in range(REPS):
        start = time.perf_counter_ns()
        valid = run(CORPUS)
        elapsed = time.perf_counter_ns() - start
        best = min(best, elapsed / len(CORPUS))

    return {"lang": "python", "arm": arm, "nsPerOp": round(best, 1), "valid": valid}


def loop(function):
    def run(inputs):
        valid = 0

        for value in inputs:
            if function(value):
                valid += 1

        return valid

    return run


for name, runner in (
    ("handwritten", loop(handwritten_is_valid)),
    ("generated", loop(generated_is_valid)),
    ("generated-opt", loop(generated_opt_is_valid)),
    ("generated-opt2", loop(generated_opt2_is_valid)),
    ("wasm", run_wasm),
    ("wasm-rawmem", run_wasm_fast),
    ("wasm-batch", run_wasm_batch),
    ("ffi", run_ffi),
    ("ffi-batch", run_ffi_batch),
    ("wasm-callonly", run_wasm_callonly),
    ("ffi-callonly", run_ffi_callonly),
):
    print(json.dumps(measure(name, runner)), flush=True)
