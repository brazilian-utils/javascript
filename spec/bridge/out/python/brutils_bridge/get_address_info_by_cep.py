# Code generated from spec/bridge/source/get-address-info-by-cep.ts. DO NOT EDIT.
"""Address lookup by CEP, written once."""

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

PATTERN_CEP_FORMAT = (
    PatternStep(class0, 8, 8, False),
)

DEFAULT_PROVIDERS = ["viacep", "brasilapi"]
KNOWN_PROVIDERS = ["viacep", "widenet", "brasilapi"]
BRASIL_API_NOT_FOUND_STATUS = 404
HTTP_RETRIES = 2
HTTP_RETRY_DELAY_MS = 250


class GetAddressInfoByCepError(Exception):
    """Base class of every error `getAddressInfoByCep` rejects with."""


class GetAddressInfoByCepValidationError(GetAddressInfoByCepError):
    """Thrown by `getAddressInfoByCep` when the value given is not a valid CEP."""


class GetAddressInfoByCepNotFoundError(GetAddressInfoByCepError):
    """Thrown by `getAddressInfoByCep` when no CEP service knows the CEP."""


class GetAddressInfoByCepServiceError(GetAddressInfoByCepError):
    """Thrown by `getAddressInfoByCep` when every CEP service failed to answer."""


class CepProviderFailure(Exception):
    """Raised inside a provider that did not answer. Only whether a failure was a not found is looked at when the provider failures are aggregated, so this one never leaves the module."""


@dataclass
class AddressInfo:
    """The address `getAddressInfoByCep` returns for a CEP."""

    # The 8 digit CEP, no mask.
    cep: str
    # Two letter state code, e.g. "SP".
    state: str
    # City name.
    city: str
    # Neighborhood name, empty when the CEP covers a whole city.
    neighborhood: str
    # Street name, empty when the CEP covers a whole city.
    street: str


@dataclass
class GetAddressInfoByCepOptions:
    """Options of `getAddressInfoByCep`."""

    # Which CEP services to race, in the order given (default: `["viacep", "brasilapi"]`; the deprecated `"widenet"` provider is excluded from the default list, but can still be requested explicitly).
    providers: Optional[List[str]] = None





def fetch_via_cep(cep: str) -> AddressInfo:
    """Reads the address ViaCEP answers with.
    
    @see Based on: https://viacep.com.br/
    """
    response = http_get((("https://viacep.com.br/ws/" + cep) + "/json/"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS)
    if not response.ok:
        raise CepProviderFailure("ViaCEP request failed")
    found = json_string(response.body, "cep")
    if (json_truthy(response.body, "erro") or (found == "")):
        raise GetAddressInfoByCepNotFoundError("CEP n\U000000e3o encontrado")
    return AddressInfo(cep=keep_class(class0, found), state=json_string(response.body, "uf"), city=json_string(response.body, "localidade"), neighborhood=json_string(response.body, "bairro"), street=json_string(response.body, "logradouro"))


def fetch_widenet(cep: str) -> AddressInfo:
    """Reads the address Widenet answers with.
    """
    response = http_get((("https://apps.widenet.com.br/busca-cep/api/cep/" + cep) + ".json"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS)
    if not response.ok:
        raise CepProviderFailure("Widenet request failed")
    found = json_string(response.body, "code")
    if (((json_int(response.body, "status") != 200) or not json_is_true(response.body, "ok")) or (found == "")):
        raise GetAddressInfoByCepNotFoundError("CEP n\U000000e3o encontrado")
    return AddressInfo(cep=keep_class(class0, found), state=json_string(response.body, "state"), city=json_string(response.body, "city"), neighborhood=json_string(response.body, "district"), street=json_string(response.body, "address"))


def fetch_brasil_api(cep: str) -> AddressInfo:
    """Reads the address BrasilAPI answers with.
    
    @see Based on: https://brasilapi.com.br/docs#tag/CEP
    """
    response = http_get((("https://brasilapi.com.br/api/cep/v1/" + cep) + ""), HTTP_RETRIES, HTTP_RETRY_DELAY_MS)
    if (response.status == BRASIL_API_NOT_FOUND_STATUS):
        raise GetAddressInfoByCepNotFoundError("CEP n\U000000e3o encontrado")
    if not response.ok:
        raise CepProviderFailure("BrasilAPI request failed")
    found = json_string(response.body, "cep")
    if (json_truthy(response.body, "errors") or (found == "")):
        raise GetAddressInfoByCepNotFoundError("CEP n\U000000e3o encontrado")
    return AddressInfo(cep=keep_class(class0, found), state=json_string(response.body, "state"), city=json_string(response.body, "city"), neighborhood=json_string(response.body, "neighborhood"), street=json_string(response.body, "street"))


def fetch_provider(provider: str, cep: str) -> AddressInfo:
    """Asks one named provider for a CEP.
    """
    if (provider == "viacep"):
        return fetch_via_cep(cep)
    if (provider == "widenet"):
        return fetch_widenet(cep)
    return fetch_brasil_api(cep)


def known_providers(given: List[str]) -> List[str]:
    """The providers of a list that are known, in the order they were given.
    """
    kept = []
    for provider in given:
        if list_has(KNOWN_PROVIDERS, provider):
            kept.append(provider)
    return kept


def get_address_info_by_cep(cep: Any, options: Optional[GetAddressInfoByCepOptions] = None) -> AddressInfo:
    """Fetches address information for a given CEP using multiple providers simultaneously.
    Returns the result from the first provider that responds successfully.
    
    The providers are started together and raced, not tried one after the other, so a provider
    that is retrying delays nothing for the others: its retries only push back the moment its own
    failure lands, and therefore the moment an all-failed rejection can surface.
    
    @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
    @see Based on: https://viacep.com.br/
    ViaCEP, one of the two default providers. A third-party service, not a Correios one.
    @see Based on: https://brasilapi.com.br/docs#tag/CEP
    BrasilAPI, the other default provider. A third-party service, not a Correios one.
    """
    options_providers = None
    if options is not None and options.providers is not None:
        options_providers = options.providers
    digits = keep_class(class0, as_string(cep))
    if is_number(cep):
        digits = pad_start(digits, 8, "0")
    if not pattern_test(PATTERN_CEP_FORMAT, digits):
        raise GetAddressInfoByCepValidationError("CEP inv\U000000e1lido")
    chosen = DEFAULT_PROVIDERS
    if (options_providers is not None):
        if not is_list(options_providers):
            raise GetAddressInfoByCepValidationError("Nenhum provedor v\U000000e1lido especificado")
        chosen = known_providers(options_providers)
        if (len(chosen) == 0):
            raise GetAddressInfoByCepValidationError("Nenhum provedor v\U000000e1lido especificado")
    attempts = start_all(fetch_provider, chosen, digits)
    found = first_success(attempts)
    if (found is not None):
        return found
    if any_failed_with(attempts, "GetAddressInfoByCepNotFoundError"):
        raise GetAddressInfoByCepNotFoundError("CEP n\U000000e3o encontrado em nenhum servi\U000000e7o")
    raise GetAddressInfoByCepServiceError("Todos os servi\U000000e7os est\U000000e3o fora de servi\U000000e7o ou indispon\U000000edveis")
