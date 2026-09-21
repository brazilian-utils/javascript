"""The Python arm the first pass missed: the shared core as a CPython extension.

`ctypes` is the binding a script reaches for; a C extension is the binding a package ships.
Both are measured here against the same corpus and the same core, so the difference is the
mechanism and nothing else.
"""

import json
import os
import struct
import sys
import time
from pathlib import Path

BENCH = Path(__file__).resolve().parent.parent
CORPUS = json.loads((BENCH / "corpus.json").read_text())
REPS = int(os.environ.get("BENCH_REPS", "7"))

sys.path.insert(0, str(BENCH / ".build/native/python"))

import cpf_native  # noqa: E402

def run_cext(inputs):
    valid = 0
    is_valid = cpf_native.is_valid

    for value in inputs:
        if is_valid(value):
            valid += 1

    return valid


def run_cext_callonly(inputs):
    """Just the boundary: the same string every time, so nothing but the call is measured."""
    payload = "12345678909"
    valid = 0
    is_valid = cpf_native.is_valid

    for _ in inputs:
        if is_valid(payload):
            valid += 1

    return valid


def run_cext_batch(inputs):
    packed = bytearray()

    for value in inputs:
        encoded = value.encode("utf-8")
        packed += struct.pack("<I", len(encoded)) + encoded

    results = cpf_native.is_valid_batch((bytes(packed), len(inputs)))

    return sum(1 for byte in results if byte == 1)


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


for name, runner in (
    ("cext", run_cext),
    ("cext-callonly", run_cext_callonly),
    ("cext-batch", run_cext_batch),
):
    print(json.dumps(measure(name, runner)), flush=True)
