// Code generated from spec/bridge/source/get-address-info-by-cep.ts. DO NOT EDIT.

// Package get_address_info_by_cep holds the generated get-address-info-by-cep utility.
package get_address_info_by_cep

import "brazilianutils/bridge/runtime"

var class0 = runtime.CharClass{{0x30, 0x39}}

var PATTERN_CEP_FORMAT = []runtime.PatternStep{
	{Class: class0, Min: 8, Max: 8, Capture: false},
}

var DEFAULT_PROVIDERS = []string{"viacep", "brasilapi"}
var KNOWN_PROVIDERS = []string{"viacep", "widenet", "brasilapi"}
const BRASIL_API_NOT_FOUND_STATUS = 404
const HTTP_RETRIES = 2
const HTTP_RETRY_DELAY_MS = 250

// GetAddressInfoByCepErrorKinds names GetAddressInfoByCepError: Base class of every error `getAddressInfoByCep` rejects with.
var GetAddressInfoByCepErrorKinds = []string{"GetAddressInfoByCepError"}

// IsGetAddressInfoByCepError reports whether err is a GetAddressInfoByCepError.
func IsGetAddressInfoByCepError(err error) bool {
	return runtime.IsKind(err, "GetAddressInfoByCepError")
}

// GetAddressInfoByCepValidationErrorKinds names GetAddressInfoByCepValidationError: Thrown by `getAddressInfoByCep` when the value given is not a valid CEP.
var GetAddressInfoByCepValidationErrorKinds = []string{"GetAddressInfoByCepValidationError", "GetAddressInfoByCepError"}

// IsGetAddressInfoByCepValidationError reports whether err is a GetAddressInfoByCepValidationError.
func IsGetAddressInfoByCepValidationError(err error) bool {
	return runtime.IsKind(err, "GetAddressInfoByCepValidationError")
}

// GetAddressInfoByCepNotFoundErrorKinds names GetAddressInfoByCepNotFoundError: Thrown by `getAddressInfoByCep` when no CEP service knows the CEP.
var GetAddressInfoByCepNotFoundErrorKinds = []string{"GetAddressInfoByCepNotFoundError", "GetAddressInfoByCepError"}

// IsGetAddressInfoByCepNotFoundError reports whether err is a GetAddressInfoByCepNotFoundError.
func IsGetAddressInfoByCepNotFoundError(err error) bool {
	return runtime.IsKind(err, "GetAddressInfoByCepNotFoundError")
}

// GetAddressInfoByCepServiceErrorKinds names GetAddressInfoByCepServiceError: Thrown by `getAddressInfoByCep` when every CEP service failed to answer.
var GetAddressInfoByCepServiceErrorKinds = []string{"GetAddressInfoByCepServiceError", "GetAddressInfoByCepError"}

// IsGetAddressInfoByCepServiceError reports whether err is a GetAddressInfoByCepServiceError.
func IsGetAddressInfoByCepServiceError(err error) bool {
	return runtime.IsKind(err, "GetAddressInfoByCepServiceError")
}

// CepProviderFailureKinds names CepProviderFailure: Raised inside a provider that did not answer. Only whether a failure was a not found is looked at when the provider failures are aggregated, so this one never leaves the module.
var CepProviderFailureKinds = []string{"CepProviderFailure"}

// IsCepProviderFailure reports whether err is a CepProviderFailure.
func IsCepProviderFailure(err error) bool {
	return runtime.IsKind(err, "CepProviderFailure")
}

// AddressInfo The address `getAddressInfoByCep` returns for a CEP.
type AddressInfo struct {
	// The 8 digit CEP, no mask.
	Cep string
	// Two letter state code, e.g. "SP".
	State string
	// City name.
	City string
	// Neighborhood name, empty when the CEP covers a whole city.
	Neighborhood string
	// Street name, empty when the CEP covers a whole city.
	Street string
}

// GetAddressInfoByCepOptions Options of `getAddressInfoByCep`.
type GetAddressInfoByCepOptions struct {
	// Which CEP services to race, in the order given (default: `["viacep", "brasilapi"]`; the deprecated `"widenet"` provider is excluded from the default list, but can still be requested explicitly).
	Providers *[]string
}



// fetchViaCep Reads the address ViaCEP answers with.
//
// @see Based on: https://viacep.com.br/
func fetchViaCep(cep string) (*AddressInfo, error) {
	response := runtime.HttpGet((("https://viacep.com.br/ws/" + cep) + "/json/"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS)
	if !response.Ok {
		return nil, runtime.NewError(CepProviderFailureKinds, "ViaCEP request failed")
	}
	found := runtime.JsonString(response.Body, "cep")
	if (runtime.JsonTruthy(response.Body, "erro") || (found == "")) {
		return nil, runtime.NewError(GetAddressInfoByCepNotFoundErrorKinds, "CEP n\u00e3o encontrado")
	}
	return &AddressInfo{Cep: runtime.KeepClass(class0, found), State: runtime.JsonString(response.Body, "uf"), City: runtime.JsonString(response.Body, "localidade"), Neighborhood: runtime.JsonString(response.Body, "bairro"), Street: runtime.JsonString(response.Body, "logradouro")}, nil
}

// fetchWidenet Reads the address Widenet answers with.
func fetchWidenet(cep string) (*AddressInfo, error) {
	response := runtime.HttpGet((("https://apps.widenet.com.br/busca-cep/api/cep/" + cep) + ".json"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS)
	if !response.Ok {
		return nil, runtime.NewError(CepProviderFailureKinds, "Widenet request failed")
	}
	found := runtime.JsonString(response.Body, "code")
	if (((runtime.JsonInt(response.Body, "status") != 200) || !runtime.JsonIsTrue(response.Body, "ok")) || (found == "")) {
		return nil, runtime.NewError(GetAddressInfoByCepNotFoundErrorKinds, "CEP n\u00e3o encontrado")
	}
	return &AddressInfo{Cep: runtime.KeepClass(class0, found), State: runtime.JsonString(response.Body, "state"), City: runtime.JsonString(response.Body, "city"), Neighborhood: runtime.JsonString(response.Body, "district"), Street: runtime.JsonString(response.Body, "address")}, nil
}

// fetchBrasilApi Reads the address BrasilAPI answers with.
//
// @see Based on: https://brasilapi.com.br/docs#tag/CEP
func fetchBrasilApi(cep string) (*AddressInfo, error) {
	response := runtime.HttpGet((("https://brasilapi.com.br/api/cep/v1/" + cep) + ""), HTTP_RETRIES, HTTP_RETRY_DELAY_MS)
	if (response.Status == BRASIL_API_NOT_FOUND_STATUS) {
		return nil, runtime.NewError(GetAddressInfoByCepNotFoundErrorKinds, "CEP n\u00e3o encontrado")
	}
	if !response.Ok {
		return nil, runtime.NewError(CepProviderFailureKinds, "BrasilAPI request failed")
	}
	found := runtime.JsonString(response.Body, "cep")
	if (runtime.JsonTruthy(response.Body, "errors") || (found == "")) {
		return nil, runtime.NewError(GetAddressInfoByCepNotFoundErrorKinds, "CEP n\u00e3o encontrado")
	}
	return &AddressInfo{Cep: runtime.KeepClass(class0, found), State: runtime.JsonString(response.Body, "state"), City: runtime.JsonString(response.Body, "city"), Neighborhood: runtime.JsonString(response.Body, "neighborhood"), Street: runtime.JsonString(response.Body, "street")}, nil
}

// fetchProvider Asks one named provider for a CEP.
func fetchProvider(provider string, cep string) (*AddressInfo, error) {
	if (provider == "viacep") {
		return fetchViaCep(cep)
	}
	if (provider == "widenet") {
		return fetchWidenet(cep)
	}
	return fetchBrasilApi(cep)
}

// knownProviders The providers of a list that are known, in the order they were given.
func knownProviders(given []string) []string {
	kept := []string{}
	for _, provider := range given {
		if runtime.ListHas(KNOWN_PROVIDERS, provider) {
			kept = append(kept, provider)
		}
	}
	return kept
}

// GetAddressInfoByCep Fetches address information for a given CEP using multiple providers simultaneously.
// Returns the result from the first provider that responds successfully.
//
// The providers are started together and raced, not tried one after the other, so a provider
// that is retrying delays nothing for the others: its retries only push back the moment its own
// failure lands, and therefore the moment an all-failed rejection can surface.
//
// @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
// @see Based on: https://viacep.com.br/
// ViaCEP, one of the two default providers. A third-party service, not a Correios one.
// @see Based on: https://brasilapi.com.br/docs#tag/CEP
// BrasilAPI, the other default provider. A third-party service, not a Correios one.
func GetAddressInfoByCep(cep string, options *GetAddressInfoByCepOptions) (*AddressInfo, error) {
	var optionsProviders []string = nil
	if options != nil && options.Providers != nil {
		optionsProviders = *options.Providers
	}
	digits := runtime.KeepClass(class0, cep)
	if false {
		digits = runtime.PadStart(digits, int(8), "0")
	}
	if !runtime.PatternTest(PATTERN_CEP_FORMAT, digits) {
		return nil, runtime.NewError(GetAddressInfoByCepValidationErrorKinds, "CEP inv\u00e1lido")
	}
	chosen := DEFAULT_PROVIDERS
	if (optionsProviders != nil) {
		if !true {
			return nil, runtime.NewError(GetAddressInfoByCepValidationErrorKinds, "Nenhum provedor v\u00e1lido especificado")
		}
		chosen = knownProviders(optionsProviders)
		if (int64(len(chosen)) == 0) {
			return nil, runtime.NewError(GetAddressInfoByCepValidationErrorKinds, "Nenhum provedor v\u00e1lido especificado")
		}
	}
	attempts := runtime.StartAll(func(item string, argument string) (any, error) { return fetchProvider(item, argument) }, chosen, digits)
	found := runtime.FirstSuccessOf[*AddressInfo](attempts)
	if (found != nil) {
		return found, nil
	}
	if runtime.AnyFailedWith(attempts, "GetAddressInfoByCepNotFoundError") {
		return nil, runtime.NewError(GetAddressInfoByCepNotFoundErrorKinds, "CEP n\u00e3o encontrado em nenhum servi\u00e7o")
	}
	return nil, runtime.NewError(GetAddressInfoByCepServiceErrorKinds, "Todos os servi\u00e7os est\u00e3o fora de servi\u00e7o ou indispon\u00edveis")
}
