"""The same Rust core, reached through UniFFI generated Python bindings instead of hand rolled
ctypes, so the cost of an off the shelf binding generator is measured rather than assumed.

Build first:
    cargo build --release --manifest-path spec/bench/uniffi/Cargo.toml
    cd spec/bench/uniffi && ./target/release/uniffi-bindgen generate \
        --library target/release/libbrutils_uniffi.so --language python --out-dir ../.build/uniffi-python
    cp spec/bench/uniffi/target/release/libbrutils_uniffi.so spec/bench/.build/uniffi-python/
"""

import json
import os
import sys
import time
from pathlib import Path

BENCH = Path(__file__).resolve().parent.parent
CORPUS = json.loads((BENCH / "corpus.json").read_text())
REPS = int(os.environ.get("BENCH_REPS", "7"))

sys.path.insert(0, str(BENCH / ".build/uniffi-python"))

import brutils_uniffi  # noqa: E402


def measure(arm, run):
    for _ in range(2):
        run(CORPUS)

    best = float("inf")
    valid = 0

    for _ in range(REPS):
        start = time.perf_counter_ns()
        valid = run(CORPUS)
        best = min(best, (time.perf_counter_ns() - start) / len(CORPUS))

    return {"lang": "python", "arm": arm, "nsPerOp": round(best, 1), "valid": valid}


print(
    json.dumps(
        measure(
            "uniffi",
            lambda inputs: sum(1 for value in inputs if brutils_uniffi.cpf_is_valid(value)),
        )
    )
)
print(
    json.dumps(
        measure("uniffi-batch", lambda inputs: sum(brutils_uniffi.cpf_is_valid_batch(inputs)))
    )
)
