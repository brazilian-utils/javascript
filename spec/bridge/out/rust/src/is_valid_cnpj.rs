// Code generated from spec/bridge/source/is-valid-cnpj.ts. DO NOT EDIT.

//! `isValidCnpj`, written once.

use crate::runtime;

const CLASS0: runtime::CharClass = &[(0x30, 0x39), (0x41, 0x5a)];
const CLASS1: runtime::CharClass = &[(0x9, 0xd), (0x20, 0x20), (0x2d, 0x2f), (0xa0, 0xa0), (0x1680, 0x1680), (0x2000, 0x200a), (0x2028, 0x2029), (0x202f, 0x202f), (0x205f, 0x205f), (0x3000, 0x3000), (0xfeff, 0xfeff)];
const CLASS2: runtime::CharClass = &[(0x30, 0x39)];
const CLASS3: runtime::CharClass = &[(0x41, 0x5a)];
const CLASS4: runtime::CharClass = &[(0x30, 0x39), (0x41, 0x5a), (0x61, 0x7a)];

const PATTERN_ALPHANUMERIC_FORMAT: &[runtime::PatternStep] = &[
	runtime::PatternStep { class: CLASS0, min: 2, max: 2, capture: false },
	runtime::PatternStep { class: CLASS1, min: 0, max: -1, capture: false },
	runtime::PatternStep { class: CLASS0, min: 3, max: 3, capture: false },
	runtime::PatternStep { class: CLASS1, min: 0, max: -1, capture: false },
	runtime::PatternStep { class: CLASS0, min: 3, max: 3, capture: false },
	runtime::PatternStep { class: CLASS1, min: 0, max: -1, capture: false },
	runtime::PatternStep { class: CLASS0, min: 4, max: 4, capture: false },
	runtime::PatternStep { class: CLASS1, min: 0, max: -1, capture: false },
	runtime::PatternStep { class: CLASS2, min: 2, max: 2, capture: false },
];

const PATTERN_NUMERIC_FORMAT: &[runtime::PatternStep] = &[
	runtime::PatternStep { class: CLASS2, min: 2, max: 2, capture: false },
	runtime::PatternStep { class: CLASS1, min: 0, max: -1, capture: false },
	runtime::PatternStep { class: CLASS2, min: 3, max: 3, capture: false },
	runtime::PatternStep { class: CLASS1, min: 0, max: -1, capture: false },
	runtime::PatternStep { class: CLASS2, min: 3, max: 3, capture: false },
	runtime::PatternStep { class: CLASS1, min: 0, max: -1, capture: false },
	runtime::PatternStep { class: CLASS2, min: 4, max: 4, capture: false },
	runtime::PatternStep { class: CLASS1, min: 0, max: -1, capture: false },
	runtime::PatternStep { class: CLASS2, min: 2, max: 2, capture: false },
];

const FIRST_DIGIT_WEIGHTS: [i64; 12] = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS: [i64; 13] = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/// Options of `isValidCnpj`.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct IsValidCnpjOptions {
	/// Which CNPJ format to accept: `1` numeric only, `2` alphanumeric (default: `1`).
	pub version: Option<i64>,
}

/// Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
///
/// Supports both numeric (version 1) and alphanumeric (version 2) CNPJ formats, and accepts the
/// usual mask characters (`.`, `-`, `/`) and whitespace around and between groups.
pub fn is_valid_cnpj(cnpj: &str, options: Option<&IsValidCnpjOptions>) -> bool {
	let options_version = match options {
		None => -1,
		Some(value) => value.version.unwrap_or(-1),
	};
	let trimmed: String = runtime::js_trim(&cnpj);
	if (options_version == 2) {
		let cleaned: String = runtime::upper(&runtime::keep_class(CLASS4, &cnpj));
		if runtime::class_has(CLASS3, &cleaned) {
			if !runtime::pattern_test(PATTERN_ALPHANUMERIC_FORMAT, &runtime::upper(&trimmed)) {
				return false;
			}
			return has_valid_checksum(&cleaned);
		}
	}
	let numeric: String = runtime::keep_class(CLASS2, &cnpj);
	if !runtime::pattern_test(PATTERN_NUMERIC_FORMAT, &trimmed) {
		return false;
	}
	if is_repeated(&numeric) {
		return false;
	}
	return has_valid_checksum(&numeric);
}

/// Computes one CNPJ check digit from the base and its weight vector.
pub fn check_digit(base: &str, weights: &[i64]) -> i64 {
	let mut sum: i64 = 0;
	for index in 0..(weights.len() as i64) {
		sum = (sum + ((runtime::code_at(&base, index) - 48) * weights[index as usize]));
	}
	let remainder: i64 = (sum % 11);
	if (remainder < 2) {
		return 0;
	}
	return (11 - remainder);
}

/// Whether both check digits of a sanitized 14 character CNPJ match its base.
pub fn has_valid_checksum(cnpj: &str) -> bool {
	if ((runtime::code_at(&cnpj, 12) - 48) != check_digit(&cnpj, &FIRST_DIGIT_WEIGHTS)) {
		return false;
	}
	return ((runtime::code_at(&cnpj, 13) - 48) == check_digit(&cnpj, &SECOND_DIGIT_WEIGHTS));
}

/// Whether every character of the value is the same one.
pub fn is_repeated(value: &str) -> bool {
	if (runtime::len(&value) == 0) {
		return false;
	}
	for index in 1..runtime::len(&value) {
		if (runtime::code_at(&value, index) != runtime::code_at(&value, 0)) {
			return false;
		}
	}
	return true;
}
