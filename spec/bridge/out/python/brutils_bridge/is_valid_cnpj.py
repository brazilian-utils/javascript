# Code generated from spec/bridge/source/is-valid-cnpj.ts. DO NOT EDIT.
"""`isValidCnpj`, written once."""

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

class0: CharClass = ((0x30, 0x39), (0x41, 0x5a),)
class1: CharClass = ((0x9, 0xd), (0x20, 0x20), (0x2d, 0x2f), (0xa0, 0xa0), (0x1680, 0x1680), (0x2000, 0x200a), (0x2028, 0x2029), (0x202f, 0x202f), (0x205f, 0x205f), (0x3000, 0x3000), (0xfeff, 0xfeff),)
class2: CharClass = ((0x30, 0x39),)
class3: CharClass = ((0x41, 0x5a),)
class4: CharClass = ((0x30, 0x39), (0x41, 0x5a), (0x61, 0x7a),)

PATTERN_ALPHANUMERIC_FORMAT = (
    PatternStep(class0, 2, 2, False),
    PatternStep(class1, 0, -1, False),
    PatternStep(class0, 3, 3, False),
    PatternStep(class1, 0, -1, False),
    PatternStep(class0, 3, 3, False),
    PatternStep(class1, 0, -1, False),
    PatternStep(class0, 4, 4, False),
    PatternStep(class1, 0, -1, False),
    PatternStep(class2, 2, 2, False),
)

PATTERN_NUMERIC_FORMAT = (
    PatternStep(class2, 2, 2, False),
    PatternStep(class1, 0, -1, False),
    PatternStep(class2, 3, 3, False),
    PatternStep(class1, 0, -1, False),
    PatternStep(class2, 3, 3, False),
    PatternStep(class1, 0, -1, False),
    PatternStep(class2, 4, 4, False),
    PatternStep(class1, 0, -1, False),
    PatternStep(class2, 2, 2, False),
)

FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

@dataclass
class IsValidCnpjOptions:
    """Options of `isValidCnpj`."""

    # Which CNPJ format to accept: `1` numeric only, `2` alphanumeric (default: `1`).
    version: Optional[int] = None

def is_valid_cnpj(cnpj: Any, options: Optional[IsValidCnpjOptions] = None) -> bool:
    """Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
    
    Supports both numeric (version 1) and alphanumeric (version 2) CNPJ formats, and accepts the
    usual mask characters (`.`, `-`, `/`) and whitespace around and between groups.
    """
    options_version = -1
    if options is not None and options.version is not None:
        options_version = options.version
    if not isinstance(cnpj, str):
        return False
    trimmed = js_trim(cnpj)
    if (options_version == 2):
        cleaned = keep_class(class4, cnpj).upper()
        if class_has(class3, cleaned):
            if not pattern_test(PATTERN_ALPHANUMERIC_FORMAT, trimmed.upper()):
                return False
            return has_valid_checksum(cleaned)
    numeric = keep_class(class2, cnpj)
    if not pattern_test(PATTERN_NUMERIC_FORMAT, trimmed):
        return False
    if is_repeated(numeric):
        return False
    return has_valid_checksum(numeric)

def check_digit(base: str, weights: List[int]) -> int:
    """Computes one CNPJ check digit from the base and its weight vector.
    """
    sum = 0
    for index in range(0, len(weights)):
        sum = (sum + ((code_at(base, index) - 48) * weights[index]))
    remainder = (sum % 11)
    if (remainder < 2):
        return 0
    return (11 - remainder)

def has_valid_checksum(cnpj: str) -> bool:
    """Whether both check digits of a sanitized 14 character CNPJ match its base.
    """
    if ((code_at(cnpj, 12) - 48) != check_digit(cnpj, FIRST_DIGIT_WEIGHTS)):
        return False
    return ((code_at(cnpj, 13) - 48) == check_digit(cnpj, SECOND_DIGIT_WEIGHTS))

def is_repeated(value: str) -> bool:
    """Whether every character of the value is the same one.
    """
    if (len(value) == 0):
        return False
    for index in range(1, len(value)):
        if (code_at(value, index) != code_at(value, 0)):
            return False
    return True
