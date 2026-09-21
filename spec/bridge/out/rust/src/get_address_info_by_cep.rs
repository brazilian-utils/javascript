// Code generated from spec/bridge/source/get-address-info-by-cep.ts. DO NOT EDIT.

//! Address lookup by CEP, written once.

use crate::runtime;

const CLASS0: runtime::CharClass = &[(0x30, 0x39)];

const PATTERN_CEP_FORMAT: &[runtime::PatternStep] = &[
	runtime::PatternStep { class: CLASS0, min: 8, max: 8, capture: false },
];

const DEFAULT_PROVIDERS: &[&str] = &["viacep", "brasilapi"];
const KNOWN_PROVIDERS: &[&str] = &["viacep", "widenet", "brasilapi"];
const BRASIL_API_NOT_FOUND_STATUS: i64 = 404;
const HTTP_RETRIES: i64 = 2;
const HTTP_RETRY_DELAY_MS: i64 = 250;

/// Base class of every error `getAddressInfoByCep` rejects with.
pub const GET_ADDRESS_INFO_BY_CEP_ERROR_KINDS: &[&str] = &["GetAddressInfoByCepError"];

/// Whether a failure is a GetAddressInfoByCepError.
pub fn is_get_address_info_by_cep_error(error: &runtime::Error) -> bool {
	error.is_kind("GetAddressInfoByCepError")
}

/// Thrown by `getAddressInfoByCep` when the value given is not a valid CEP.
pub const GET_ADDRESS_INFO_BY_CEP_VALIDATION_ERROR_KINDS: &[&str] = &["GetAddressInfoByCepValidationError", "GetAddressInfoByCepError"];

/// Whether a failure is a GetAddressInfoByCepValidationError.
pub fn is_get_address_info_by_cep_validation_error(error: &runtime::Error) -> bool {
	error.is_kind("GetAddressInfoByCepValidationError")
}

/// Thrown by `getAddressInfoByCep` when no CEP service knows the CEP.
pub const GET_ADDRESS_INFO_BY_CEP_NOT_FOUND_ERROR_KINDS: &[&str] = &["GetAddressInfoByCepNotFoundError", "GetAddressInfoByCepError"];

/// Whether a failure is a GetAddressInfoByCepNotFoundError.
pub fn is_get_address_info_by_cep_not_found_error(error: &runtime::Error) -> bool {
	error.is_kind("GetAddressInfoByCepNotFoundError")
}

/// Thrown by `getAddressInfoByCep` when every CEP service failed to answer.
pub const GET_ADDRESS_INFO_BY_CEP_SERVICE_ERROR_KINDS: &[&str] = &["GetAddressInfoByCepServiceError", "GetAddressInfoByCepError"];

/// Whether a failure is a GetAddressInfoByCepServiceError.
pub fn is_get_address_info_by_cep_service_error(error: &runtime::Error) -> bool {
	error.is_kind("GetAddressInfoByCepServiceError")
}

/// Raised inside a provider that did not answer. Only whether a failure was a not found is looked at when the provider failures are aggregated, so this one never leaves the module.
pub const CEP_PROVIDER_FAILURE_KINDS: &[&str] = &["CepProviderFailure"];

/// Whether a failure is a CepProviderFailure.
pub fn is_cep_provider_failure(error: &runtime::Error) -> bool {
	error.is_kind("CepProviderFailure")
}

/// The address `getAddressInfoByCep` returns for a CEP.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct AddressInfo {
	/// The 8 digit CEP, no mask.
	pub cep: String,
	/// Two letter state code, e.g. "SP".
	pub state: String,
	/// City name.
	pub city: String,
	/// Neighborhood name, empty when the CEP covers a whole city.
	pub neighborhood: String,
	/// Street name, empty when the CEP covers a whole city.
	pub street: String,
}

/// Options of `getAddressInfoByCep`.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct GetAddressInfoByCepOptions {
	/// Which CEP services to race, in the order given (default: `["viacep", "brasilapi"]`; the deprecated `"widenet"` provider is excluded from the default list, but can still be requested explicitly).
	pub providers: Option<Vec<String>>,
}



/// Reads the address ViaCEP answers with.
///
/// @see Based on: https://viacep.com.br/
pub fn fetch_via_cep(cep: &str) -> Result<AddressInfo, runtime::Error> {
	let response: runtime::HttpResponse = runtime::http_get(&format!("{}{}", format!("{}{}", "https://viacep.com.br/ws/", cep), "/json/"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
	if !response.ok {
		return Err(runtime::Error::new(CEP_PROVIDER_FAILURE_KINDS, "ViaCEP request failed"));
	}
	let found: String = runtime::json_string(&response.body, "cep");
	if (runtime::json_truthy(&response.body, "erro") || (found == "")) {
		return Err(runtime::Error::new(GET_ADDRESS_INFO_BY_CEP_NOT_FOUND_ERROR_KINDS, "CEP n\u{e3}o encontrado"));
	}
	return Ok(AddressInfo { cep: runtime::keep_class(CLASS0, &found), state: runtime::json_string(&response.body, "uf"), city: runtime::json_string(&response.body, "localidade"), neighborhood: runtime::json_string(&response.body, "bairro"), street: runtime::json_string(&response.body, "logradouro") });
}

/// Reads the address Widenet answers with.
pub fn fetch_widenet(cep: &str) -> Result<AddressInfo, runtime::Error> {
	let response: runtime::HttpResponse = runtime::http_get(&format!("{}{}", format!("{}{}", "https://apps.widenet.com.br/busca-cep/api/cep/", cep), ".json"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
	if !response.ok {
		return Err(runtime::Error::new(CEP_PROVIDER_FAILURE_KINDS, "Widenet request failed"));
	}
	let found: String = runtime::json_string(&response.body, "code");
	if (((runtime::json_int(&response.body, "status") != 200) || !runtime::json_is_true(&response.body, "ok")) || (found == "")) {
		return Err(runtime::Error::new(GET_ADDRESS_INFO_BY_CEP_NOT_FOUND_ERROR_KINDS, "CEP n\u{e3}o encontrado"));
	}
	return Ok(AddressInfo { cep: runtime::keep_class(CLASS0, &found), state: runtime::json_string(&response.body, "state"), city: runtime::json_string(&response.body, "city"), neighborhood: runtime::json_string(&response.body, "district"), street: runtime::json_string(&response.body, "address") });
}

/// Reads the address BrasilAPI answers with.
///
/// @see Based on: https://brasilapi.com.br/docs#tag/CEP
pub fn fetch_brasil_api(cep: &str) -> Result<AddressInfo, runtime::Error> {
	let response: runtime::HttpResponse = runtime::http_get(&format!("{}{}", format!("{}{}", "https://brasilapi.com.br/api/cep/v1/", cep), ""), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
	if (response.status == BRASIL_API_NOT_FOUND_STATUS) {
		return Err(runtime::Error::new(GET_ADDRESS_INFO_BY_CEP_NOT_FOUND_ERROR_KINDS, "CEP n\u{e3}o encontrado"));
	}
	if !response.ok {
		return Err(runtime::Error::new(CEP_PROVIDER_FAILURE_KINDS, "BrasilAPI request failed"));
	}
	let found: String = runtime::json_string(&response.body, "cep");
	if (runtime::json_truthy(&response.body, "errors") || (found == "")) {
		return Err(runtime::Error::new(GET_ADDRESS_INFO_BY_CEP_NOT_FOUND_ERROR_KINDS, "CEP n\u{e3}o encontrado"));
	}
	return Ok(AddressInfo { cep: runtime::keep_class(CLASS0, &found), state: runtime::json_string(&response.body, "state"), city: runtime::json_string(&response.body, "city"), neighborhood: runtime::json_string(&response.body, "neighborhood"), street: runtime::json_string(&response.body, "street") });
}

/// Asks one named provider for a CEP.
pub fn fetch_provider(provider: &str, cep: &str) -> Result<AddressInfo, runtime::Error> {
	if (provider == "viacep") {
		return fetch_via_cep(&cep);
	}
	if (provider == "widenet") {
		return fetch_widenet(&cep);
	}
	return fetch_brasil_api(&cep);
}

/// The providers of a list that are known, in the order they were given.
pub fn known_providers(given: &[String]) -> Vec<String> {
	let mut kept: Vec<String> = vec![];
	for provider in given {
		if runtime::list_has(KNOWN_PROVIDERS, &provider) {
			kept.push(provider.to_string());
		}
	}
	return kept;
}

/// Fetches address information for a given CEP using multiple providers simultaneously.
/// Returns the result from the first provider that responds successfully.
///
/// The providers are started together and raced, not tried one after the other, so a provider
/// that is retrying delays nothing for the others: its retries only push back the moment its own
/// failure lands, and therefore the moment an all-failed rejection can surface.
///
/// @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
/// @see Based on: https://viacep.com.br/
/// ViaCEP, one of the two default providers. A third-party service, not a Correios one.
/// @see Based on: https://brasilapi.com.br/docs#tag/CEP
/// BrasilAPI, the other default provider. A third-party service, not a Correios one.
pub fn get_address_info_by_cep(cep: &str, options: Option<&GetAddressInfoByCepOptions>) -> Result<AddressInfo, runtime::Error> {
	let options_providers = match options {
		None => None,
		Some(value) => value.providers.clone(),
	};
	let mut digits: String = runtime::keep_class(CLASS0, &cep.to_string());
	if false {
		digits = runtime::pad_start(&digits, 8, "0");
	}
	if !runtime::pattern_test(PATTERN_CEP_FORMAT, &digits) {
		return Err(runtime::Error::new(GET_ADDRESS_INFO_BY_CEP_VALIDATION_ERROR_KINDS, "CEP inv\u{e1}lido"));
	}
	let mut chosen: Vec<String> = DEFAULT_PROVIDERS.iter().map(|value| value.to_string()).collect();
	if options_providers.is_some() {
		if !true {
			return Err(runtime::Error::new(GET_ADDRESS_INFO_BY_CEP_VALIDATION_ERROR_KINDS, "Nenhum provedor v\u{e1}lido especificado"));
		}
		chosen = known_providers(&options_providers.clone().unwrap());
		if ((chosen.len() as i64) == 0) {
			return Err(runtime::Error::new(GET_ADDRESS_INFO_BY_CEP_VALIDATION_ERROR_KINDS, "Nenhum provedor v\u{e1}lido especificado"));
		}
	}
	let mut attempts: runtime::Attempts<AddressInfo> = runtime::start_all(fetch_provider, &chosen, &digits);
	let found: Option<AddressInfo> = runtime::first_success(&mut attempts);
	if found.is_some() {
		return Ok(found.clone().unwrap());
	}
	if runtime::any_failed_with(&attempts, "GetAddressInfoByCepNotFoundError") {
		return Err(runtime::Error::new(GET_ADDRESS_INFO_BY_CEP_NOT_FOUND_ERROR_KINDS, "CEP n\u{e3}o encontrado em nenhum servi\u{e7}o"));
	}
	return Err(runtime::Error::new(GET_ADDRESS_INFO_BY_CEP_SERVICE_ERROR_KINDS, "Todos os servi\u{e7}os est\u{e3}o fora de servi\u{e7}o ou indispon\u{ed}veis"));
}
