// Code generated from spec/bridge/source/format-cnpj.ts. DO NOT EDIT.

//! `formatCnpj`, written once.

use crate::runtime;

const CLASS0: runtime::CharClass = &[(0x30, 0x39)];
const CLASS1: runtime::CharClass = &[(0x30, 0x39), (0x41, 0x5a), (0x61, 0x7a)];



const PATTERN: &str = "00.000.000/0000-00";
const OBFUSCATED_PATTERN: &str = "**.000.000/0000-**";



/// Options of `formatCnpj`.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct FormatCnpjOptions {
	/// Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`).
	pub pad: Option<bool>,
	/// Which CNPJ format to read: `1` numeric only, `2` alphanumeric (default: `1`).
	pub version: Option<i64>,
	/// Whether to hide the first 2 digits and the 2 check digits with `*` (default: `false`).
	pub obfuscate: Option<bool>,
}



/// Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value.
pub fn format_cnpj(value: &str, options: Option<&FormatCnpjOptions>) -> String {
	let options_version = match options {
		None => -1,
		Some(value) => value.version.unwrap_or(-1),
	};
	let options_obfuscate = match options {
		None => false,
		Some(value) => value.obfuscate.unwrap_or(false),
	};
	let options_pad = match options {
		None => false,
		Some(value) => value.pad.unwrap_or(false),
	};
	let text: String = value.to_string();
	let mut cleaned: String = runtime::keep_class(CLASS0, &text);
	if (options_version == 2) {
		cleaned = runtime::upper(&runtime::keep_class(CLASS1, &text));
	}
	let mut pattern: String = PATTERN.to_string();
	if options_obfuscate {
		pattern = OBFUSCATED_PATTERN.to_string();
	}
	return layout(&cleaned, &pattern, options_pad);
}

/// Lays a value over a pattern.
pub fn layout(value: &str, pattern: &str, pad: bool) -> String {
	let mut slots: i64 = 0;
	for index in 0..runtime::len(&pattern) {
		if ((runtime::code_at(&pattern, index) == 48) || (runtime::code_at(&pattern, index) == 42)) {
			slots = (slots + 1);
		}
	}
	let mut padded: String = value.to_string();
	if pad {
		padded = runtime::pad_start(&value, slots, "0");
	}
	let mut formatted: String = "".to_string();
	let mut cursor: i64 = 0;
	for index in 0..runtime::len(&pattern) {
		let slot: i64 = runtime::code_at(&pattern, index);
		if ((slot == 48) || (slot == 42)) {
			if (cursor >= runtime::len(&padded)) {
				return formatted;
			}
			if (slot == 42) {
				formatted = format!("{}{}", formatted, "*");
			} else {
				formatted = format!("{}{}", formatted, runtime::slice(&padded, cursor, (cursor + 1)));
			}
			cursor = (cursor + 1);
		} else {
			if (cursor < runtime::len(&padded)) {
				formatted = format!("{}{}", formatted, runtime::slice(&pattern, index, (index + 1)));
			}
		}
	}
	return formatted;
}
