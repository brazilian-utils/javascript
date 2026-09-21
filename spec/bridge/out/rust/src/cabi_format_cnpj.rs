// Code generated from spec/bridge/source/format-cnpj.ts. DO NOT EDIT.
//
// The C ABI of this module: what a hand-written binding in Python, Ruby, C#, Java or Erlang
// calls. Everything is a pointer, a length or an integer, and nothing crosses that either side
// has to free.

use crate::format_cnpj;

/// Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value.
#[no_mangle]
pub unsafe extern "C" fn format_cnpj(value_ptr: *const u8, value_len: usize, options_version: i64, options_obfuscate: i32, options_pad: i32, out: *mut u8, out_len: usize) -> isize {
	let value_value = match std::str::from_utf8(unsafe {
		std::slice::from_raw_parts(value_ptr, value_len)
	}) {
		Ok(value) => value,
		Err(_) => return -1,
	};
	let options = format_cnpj::FormatCnpjOptions {
		version: if options_version == -1 { None } else { Some(options_version) },
		obfuscate: if options_obfuscate == 0 { None } else { Some(options_obfuscate != 0) },
		pad: if options_pad == 0 { None } else { Some(options_pad != 0) },
		..Default::default()
	};
	let answer = format_cnpj::format_cnpj(value_value, Some(&options));
	let bytes = answer.as_bytes();

	if out.is_null() || out_len < bytes.len() {
		// The caller sizes its own buffer: answering the length lets it try again.
		return bytes.len() as isize;
	}

	unsafe { std::ptr::copy_nonoverlapping(bytes.as_ptr(), out, bytes.len()) };

	bytes.len() as isize
}
