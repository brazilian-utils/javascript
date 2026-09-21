# Code generated from spec/bridge/source/format-cnpj.ts. DO NOT EDIT.
"""`formatCnpj`, written once."""

from dataclasses import dataclass
from typing import Any, List, Optional

from .runtime import (
    CharClass,
    PatternStep,
    any_failed_with,
    as_string,
    class_has,
    code_at,
    data_all,
    data_rows,
    first_success,
    http_get,
    is_list,
    is_number,
    is_truthy,
    js_trim,
    json_int,
    json_is_true,
    json_string,
    json_truthy,
    keep_class,
    list_has,
    make_dataset,
    pad_start,
    pattern_test,
    start_all,
)

class0: CharClass = ((0x30, 0x39),)
class1: CharClass = ((0x30, 0x39), (0x41, 0x5a), (0x61, 0x7a),)

PATTERN = "00.000.000/0000-00"
OBFUSCATED_PATTERN = "**.000.000/0000-**"

@dataclass
class FormatCnpjOptions:
    """Options of `formatCnpj`."""

    # Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`).
    pad: Optional[bool] = None
    # Which CNPJ format to read: `1` numeric only, `2` alphanumeric (default: `1`).
    version: Optional[int] = None
    # Whether to hide the first 2 digits and the 2 check digits with `*` (default: `false`).
    obfuscate: Optional[bool] = None

def format_cnpj(value: Any, options: Optional[FormatCnpjOptions] = None) -> str:
    """Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value.
    """
    options_version = -1
    if options is not None and options.version is not None:
        options_version = options.version
    options_obfuscate = False
    if options is not None and options.obfuscate is not None:
        options_obfuscate = options.obfuscate
    options_pad = False
    if options is not None and options.pad is not None:
        options_pad = options.pad
    if value is None:
        return ""
    text = as_string(value)
    cleaned = keep_class(class0, text)
    if (options_version == 2):
        cleaned = keep_class(class1, text).upper()
    pattern = PATTERN
    if is_truthy(options_obfuscate):
        pattern = OBFUSCATED_PATTERN
    return layout(cleaned, pattern, is_truthy(options_pad))

def layout(value: str, pattern: str, pad: bool) -> str:
    """Lays a value over a pattern.
    """
    slots = 0
    for index in range(0, len(pattern)):
        if ((code_at(pattern, index) == 48) or (code_at(pattern, index) == 42)):
            slots = (slots + 1)
    padded = value
    if pad:
        padded = pad_start(value, slots, "0")
    formatted = ""
    cursor = 0
    for index in range(0, len(pattern)):
        slot = code_at(pattern, index)
        if ((slot == 48) or (slot == 42)):
            if (cursor >= len(padded)):
                return formatted
            if (slot == 42):
                formatted = (formatted + "*")
            else:
                formatted = (formatted + padded[cursor:(cursor + 1)])
            cursor = (cursor + 1)
        else:
            if (cursor < len(padded)):
                formatted = (formatted + pattern[index:(index + 1)])
    return formatted
