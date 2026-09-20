#!/usr/bin/env python3
"""Runs the published `brutils` package against the corpus on stdin, one result line per input.

Usage: python3 python-probe.py <path to the brazilian-utils/python checkout>

The modules are loaded by path rather than imported as a package, so the probe does not need
the package's runtime dependencies installed.
"""

import importlib.util
import json
import sys
from pathlib import Path


def load(root: Path, name: str):
    spec = importlib.util.spec_from_file_location(f"upstream_{name}", root / "brutils" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    root = Path(sys.argv[1])
    cpf = load(root, "cpf")
    pis = load(root, "pis")
    corpus = json.load(sys.stdin)

    results = {
        "is-valid-cpf": [bool(cpf.is_valid(value)) for value in corpus],
        "is-valid-pis": [bool(pis.is_valid(value)) for value in corpus],
        "format-cpf": [cpf.format_cpf(value) for value in corpus],
    }

    json.dump(results, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
