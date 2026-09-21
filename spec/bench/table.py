"""Rewrites the results table in the investigation report from `results.jsonl`.

Usage: python3 spec/bench/table.py
"""

import collections
import json
from pathlib import Path

BENCH = Path(__file__).resolve().parent
REPORT = BENCH.parent / "BINDINGS-INVESTIGATION.md"

LABEL = {
    "handwritten": "handwritten",
    "generated": "**generated**",
    "wasm": "wasm",
    "wasm-batch": "wasm-batch",
    "wasm-callonly": "wasm-callonly",
    "ffi": "ffi (ctypes)",
    "ffi-batch": "ffi-batch",
    "uniffi": "**uniffi**",
    "uniffi-batch": "uniffi-batch",
    "cgo": "cgo",
    "cgo-batch": "cgo-batch",
}

LAYOUT = [
    ("Node", "node", ["handwritten", "generated", "wasm", "wasm-batch"]),
    (
        "Python",
        "python",
        [
            "handwritten",
            "generated",
            "wasm",
            "wasm-callonly",
            "wasm-batch",
            "ffi",
            "ffi-batch",
            "uniffi",
            "uniffi-batch",
        ],
    ),
    ("Ruby", "ruby", ["handwritten", "generated", "wasm", "wasm-batch", "ffi"]),
    ("Go", "go", ["handwritten", "generated", "wasm", "wasm-batch", "cgo", "cgo-batch"]),
    ("Java", "java", ["handwritten", "generated"]),
]


def main() -> None:
    rows = [json.loads(line) for line in (BENCH / "results.jsonl").read_text().splitlines() if line]
    by = collections.defaultdict(dict)

    for row in rows:
        by[row["lang"]][row["arm"]] = row

    lines = ["| Language | Arm | ns/op | × hand | valid |", "| --- | --- | ---: | ---: | ---: |"]

    for title, lang, arms in LAYOUT:
        base = by[lang]["handwritten"]["nsPerOp"]

        for arm in arms:
            row = by[lang][arm]
            label = LABEL[arm]

            if lang == "ruby" and arm == "ffi":
                label = "ffi (Fiddle)"
            if lang == "go" and arm == "wasm":
                label = "wasm (wazero)"

            ratio = row["nsPerOp"] / base
            emphasise = arm in ("generated", "uniffi")
            ns = f"**{row['nsPerOp']:.1f}**" if emphasise else f"{row['nsPerOp']:.1f}"
            rel = f"**{ratio:.2f}**" if emphasise else f"{ratio:.2f}"
            valid = "—" if arm.endswith("callonly") else str(row["valid"])

            if arm == "handwritten" and row["valid"] != 337:
                valid = f"**{row['valid']}**"

            lines.append(f"| {title} | {label} | {ns} | {rel} | {valid} |")

    table = "\n".join(lines)
    report = REPORT.read_text(encoding="utf-8")
    start = report.index("| Language | Arm")
    end = report.index("\n\n---", start)

    REPORT.write_text(report[:start] + table + report[end:], encoding="utf-8")
    print(table)


if __name__ == "__main__":
    main()
