"""The portable runtime for the Python target.

Everything the generated code needs that is not plain syntax lives here. The compiled character
classes and patterns are passed in as data, so this file never changes when a utility does.
"""

from typing import Any, List, Optional, Sequence, Tuple

CharClass = Sequence[Tuple[int, int]]

# The code points JavaScript's `trim()` strips. Python's `str.strip()` is a different set, so
# the set is spelled out here rather than inherited from the host.
_JS_WHITESPACE = frozenset(
    [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF]
    + list(range(0x2000, 0x200B))
)


class PatternStep:
    """One step of a compiled pattern: repeat a class between `min` and `max` times."""

    __slots__ = ("char_class", "min", "max", "capture")

    def __init__(self, char_class: CharClass, minimum: int, maximum: int, capture: bool) -> None:
        self.char_class = char_class
        self.min = minimum
        self.max = maximum
        self.capture = capture


def in_class(char_class: CharClass, code: int) -> bool:
    """Whether a code point belongs to a class."""
    for start, end in char_class:
        if start <= code <= end:
            return True

    return False


def code_at(value: str, index: int) -> int:
    """Reads one code unit, or -1 when the index is out of range."""
    if index < 0 or index >= len(value):
        return -1

    return ord(value[index])


def class_has(char_class: CharClass, value: str) -> bool:
    """Whether any character of the value belongs to the class."""
    for char in value:
        if in_class(char_class, ord(char)):
            return True

    return False


def keep_class(char_class: CharClass, value: str) -> str:
    """Keeps only the characters of the value that belong to the class."""
    return "".join(char for char in value if in_class(char_class, ord(char)))


def pattern_test(steps: Sequence[PatternStep], value: str) -> bool:
    """Runs a compiled pattern against the whole value, greedily and without backtracking."""
    index = 0

    for step in steps:
        count = 0

        while (
            (step.max < 0 or count < step.max)
            and index < len(value)
            and in_class(step.char_class, ord(value[index]))
        ):
            index += 1
            count += 1

        if count < step.min:
            return False

    return index == len(value)


def js_trim(value: str) -> str:
    """Strips the code points JavaScript's `trim()` strips."""
    start = 0
    end = len(value)

    while start < end and ord(value[start]) in _JS_WHITESPACE:
        start += 1
    while end > start and ord(value[end - 1]) in _JS_WHITESPACE:
        end -= 1

    return value[start:end]


def pad_start(value: str, length: int, filler: str) -> str:
    """Left pads the value with a filler up to a length."""
    return value.rjust(length, filler)


def as_string(value: Any) -> str:
    """Reads a value as a string the way JavaScript's `String(value)` does."""
    if isinstance(value, str):
        return value
    if value is True:
        return "true"
    if value is False:
        return "false"
    if value is None:
        return "null"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return str(int(value)) if value.is_integer() else str(value)

    try:
        return str(value)
    except Exception:  # noqa: BLE001 - a value with no string form reads as empty, as in JavaScript
        return ""


def is_truthy(value: Any) -> bool:
    """Reads an optional flag the way JavaScript reads truthiness."""
    return bool(value)


def list_get(values: List[Any], index: int) -> Any:
    """Reads one element, or None when the index is out of range."""
    if index < 0 or index >= len(values):
        return None

    return values[index]


class Dataset:
    """A dataset: the rows in the baked full order, and the rows of each key."""

    __slots__ = ("all", "by_key")

    def __init__(self, rows, groups, full_order):
        self.all = [rows[index] for index in full_order]
        self.by_key = {key: [rows[index] for index in indexes] for key, indexes in groups}


def make_dataset(rows, groups, full_order):
    """Materialises a dataset, resolving both orders once."""
    return Dataset(rows, groups, full_order)


def data_all(table):
    """Every row of a dataset, in the baked full order."""
    return table.all


def data_rows(table, key):
    """The rows whose first column is the key given, empty when the key is unknown."""
    return table.by_key.get(key, [])
