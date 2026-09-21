// Code generated from spec/bridge/source/is-valid-cnpj.ts. DO NOT EDIT.
//
// The C ABI of this module: what a hand-written binding in Python, Ruby, C#, Java or Erlang
// calls. Everything is a pointer, a length or an integer, and nothing crosses that either side
// has to free.

use crate::is_valid_cnpj;

/// Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
#[no_mangle]
pub unsafe extern "C" fn is_valid_cnpj(cnpj_ptr: *const u8, cnpj_len: usize, options_version: i64) -> i32 {
	let cnpj_value = match std::str::from_utf8(unsafe {
		std::slice::from_raw_parts(cnpj_ptr, cnpj_len)
	}) {
		Ok(value) => value,
		Err(_) => return 0,
	};
	let options = is_valid_cnpj::IsValidCnpjOptions {
		version: if options_version == -1 { None } else { Some(options_version) },
		..Default::default()
	};
	i32::from(is_valid_cnpj::is_valid_cnpj(cnpj_value, Some(&options)))
}
