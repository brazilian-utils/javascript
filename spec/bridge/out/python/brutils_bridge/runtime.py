"""The portable runtime for the Python target.

Everything the generated code needs that is not plain syntax lives here. The compiled character
classes and patterns are passed in as data, so this file never changes when a utility does.
"""

import json
import os
import queue
import re
import threading
import time
import urllib.error
import urllib.request
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


class HttpResponse:
    """What a provider answered: the HTTP status, whether it counts as a success, and the body."""

    __slots__ = ("status", "ok", "body")

    def __init__(self, status, ok, body):
        self.status = status
        self.ok = ok
        self.body = body


def _http_target(url):
    """The origin every request is sent to instead of its own, when one is set.

    This is the conformance hook: the cross language replay points all seven targets at one
    local server, the same way the JavaScript suite points `fetch` at a mock.
    """
    base = os.environ.get("BRUTILS_BRIDGE_HTTP_ORIGIN", "")

    if base == "":
        return url

    return base + "/" + re.sub(r"^https?://", "", url)


def http_get(url, retries, retry_delay_ms):
    """Performs an HTTP GET, retrying a transient transport failure with a linear backoff."""
    target = _http_target(url)
    attempt = 0

    while True:
        try:
            with urllib.request.urlopen(target, timeout=15) as response:
                raw = response.read()
                status = response.status
        except urllib.error.HTTPError as error:
            raw = error.read()
            status = error.code
        except Exception:
            if attempt >= retries:
                return HttpResponse(0, False, None)

            time.sleep(retry_delay_ms * (attempt + 1) / 1000)
            attempt += 1
            continue

        try:
            body = json.loads(raw.decode("utf-8"))
        except Exception:
            body = None

        return HttpResponse(status, 200 <= status < 300, body)


def is_number(value):
    """Whether the caller handed a number where a string or a number was declared."""
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def is_list(value):
    """Whether a value is a list."""
    return isinstance(value, (list, tuple))


def list_has(items, value):
    """Whether a list holds a value."""
    return value in items


def _json_field(body, key):
    """Reads one field of a JSON body, treating anything that is not an object as empty."""
    if not isinstance(body, dict):
        return None

    return body.get(key)


def json_string(body, key):
    """Reads a string field of a JSON body, answering "" when it is missing or not a string."""
    found = _json_field(body, key)

    return found if isinstance(found, str) else ""


def json_int(body, key):
    """Reads an integer field of a JSON body, answering -1 when it is missing or not a number."""
    found = _json_field(body, key)

    if isinstance(found, bool) or not isinstance(found, (int, float)):
        return -1

    return int(found)


def json_truthy(body, key):
    """Whether a field of a JSON body is truthy, the way JavaScript reads truthiness."""
    return bool(_json_field(body, key))


def json_is_true(body, key):
    """Whether a field of a JSON body is exactly True."""
    return _json_field(body, key) is True


class Attempts:
    """The running attempts of a race, and what each one ended with."""

    __slots__ = ("settled", "total", "outcomes")

    def __init__(self, total):
        self.settled = queue.Queue()
        self.total = total
        self.outcomes = []


def _kinds_of(error):
    """The error name and every name it inherits from, which is what a failure is matched on."""
    return [kind.__name__ for kind in type(error).__mro__ if kind is not object]


def start_all(run, items, argument):
    """Starts one attempt per item, all at once.

    This is the only concurrency primitive of the portable subset. Python has no promise to
    colour a function with, so the work goes on threads and the caller simply waits.
    """
    attempts = Attempts(len(items))

    for item in items:
        def work(item=item):
            try:
                attempts.settled.put((True, run(item, argument), []))
            except Exception as error:  # noqa: BLE001
                attempts.settled.put((False, None, _kinds_of(error)))

        threading.Thread(target=work, daemon=True).start()

    return attempts


def first_success(attempts):
    """The value of the first attempt that succeeds, or None once every attempt has failed."""
    while len(attempts.outcomes) < attempts.total:
        outcome = attempts.settled.get()
        attempts.outcomes.append(outcome)

        if outcome[0]:
            return outcome[1]

    return None


def any_failed_with(attempts, kind):
    """Whether any attempt failed with a given error kind."""
    return any(not ok and kind in kinds for ok, _value, kinds in attempts.outcomes)
