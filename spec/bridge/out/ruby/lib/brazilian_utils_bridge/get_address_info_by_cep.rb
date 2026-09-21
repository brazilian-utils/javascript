# frozen_string_literal: true

# Code generated from spec/bridge/source/get-address-info-by-cep.ts. DO NOT EDIT.

require_relative 'runtime'

module BrazilianUtilsBridge
  # Address lookup by CEP, written once.
  module GetAddressInfoByCep
    CLASS0 = [[0x30, 0x39]].freeze

    PATTERN_CEP_FORMAT = [
      Runtime::PatternStep.new(CLASS0, 8, 8, false),
    ].freeze

    DEFAULT_PROVIDERS = ["viacep", "brasilapi"].freeze
    KNOWN_PROVIDERS = ["viacep", "widenet", "brasilapi"].freeze
    BRASIL_API_NOT_FOUND_STATUS = 404.freeze
    HTTP_RETRIES = 2.freeze
    HTTP_RETRY_DELAY_MS = 250.freeze

    # Base class of every error `getAddressInfoByCep` rejects with.
    class GetAddressInfoByCepError < StandardError; end

    # Thrown by `getAddressInfoByCep` when the value given is not a valid CEP.
    class GetAddressInfoByCepValidationError < GetAddressInfoByCepError; end

    # Thrown by `getAddressInfoByCep` when no CEP service knows the CEP.
    class GetAddressInfoByCepNotFoundError < GetAddressInfoByCepError; end

    # Thrown by `getAddressInfoByCep` when every CEP service failed to answer.
    class GetAddressInfoByCepServiceError < GetAddressInfoByCepError; end

    # Raised inside a provider that did not answer. Only whether a failure was a not found is looked at when the provider failures are aggregated, so this one never leaves the module.
    class CepProviderFailure < StandardError; end

    # The address `getAddressInfoByCep` returns for a CEP.
    AddressInfo = Struct.new(:cep, :state, :city, :neighborhood, :street, keyword_init: true)

    # Options of `getAddressInfoByCep`.
    GetAddressInfoByCepOptions = Struct.new(:providers, keyword_init: true)



    # Reads the address ViaCEP answers with.
    #
    # @see Based on: https://viacep.com.br/
    def self.fetch_via_cep(cep)
      response = Runtime.http_get((("https://viacep.com.br/ws/" + cep) + "/json/"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS)
      if !response.ok
        raise CepProviderFailure, "ViaCEP request failed"
      end
      found = Runtime.json_string(response.body, "cep")
      if (Runtime.json_truthy(response.body, "erro") || (found == ""))
        raise GetAddressInfoByCepNotFoundError, "CEP n\u{e3}o encontrado"
      end
      return AddressInfo.new(cep: Runtime.keep_class(CLASS0, found), state: Runtime.json_string(response.body, "uf"), city: Runtime.json_string(response.body, "localidade"), neighborhood: Runtime.json_string(response.body, "bairro"), street: Runtime.json_string(response.body, "logradouro"))
    end

    # Reads the address Widenet answers with.
    def self.fetch_widenet(cep)
      response = Runtime.http_get((("https://apps.widenet.com.br/busca-cep/api/cep/" + cep) + ".json"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS)
      if !response.ok
        raise CepProviderFailure, "Widenet request failed"
      end
      found = Runtime.json_string(response.body, "code")
      if (((Runtime.json_int(response.body, "status") != 200) || !Runtime.json_is_true(response.body, "ok")) || (found == ""))
        raise GetAddressInfoByCepNotFoundError, "CEP n\u{e3}o encontrado"
      end
      return AddressInfo.new(cep: Runtime.keep_class(CLASS0, found), state: Runtime.json_string(response.body, "state"), city: Runtime.json_string(response.body, "city"), neighborhood: Runtime.json_string(response.body, "district"), street: Runtime.json_string(response.body, "address"))
    end

    # Reads the address BrasilAPI answers with.
    #
    # @see Based on: https://brasilapi.com.br/docs#tag/CEP
    def self.fetch_brasil_api(cep)
      response = Runtime.http_get((("https://brasilapi.com.br/api/cep/v1/" + cep) + ""), HTTP_RETRIES, HTTP_RETRY_DELAY_MS)
      if (response.status == BRASIL_API_NOT_FOUND_STATUS)
        raise GetAddressInfoByCepNotFoundError, "CEP n\u{e3}o encontrado"
      end
      if !response.ok
        raise CepProviderFailure, "BrasilAPI request failed"
      end
      found = Runtime.json_string(response.body, "cep")
      if (Runtime.json_truthy(response.body, "errors") || (found == ""))
        raise GetAddressInfoByCepNotFoundError, "CEP n\u{e3}o encontrado"
      end
      return AddressInfo.new(cep: Runtime.keep_class(CLASS0, found), state: Runtime.json_string(response.body, "state"), city: Runtime.json_string(response.body, "city"), neighborhood: Runtime.json_string(response.body, "neighborhood"), street: Runtime.json_string(response.body, "street"))
    end

    # Asks one named provider for a CEP.
    def self.fetch_provider(provider, cep)
      if (provider == "viacep")
        return fetch_via_cep(cep)
      end
      if (provider == "widenet")
        return fetch_widenet(cep)
      end
      return fetch_brasil_api(cep)
    end

    # The providers of a list that are known, in the order they were given.
    def self.known_providers(given)
      kept = []
      given.each do |provider|
        if Runtime.list_has(KNOWN_PROVIDERS, provider)
          kept.push(provider)
        end
      end
      return kept
    end

    # Fetches address information for a given CEP using multiple providers simultaneously.
    # Returns the result from the first provider that responds successfully.
    #
    # The providers are started together and raced, not tried one after the other, so a provider
    # that is retrying delays nothing for the others: its retries only push back the moment its own
    # failure lands, and therefore the moment an all-failed rejection can surface.
    #
    # @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
    # @see Based on: https://viacep.com.br/
    # ViaCEP, one of the two default providers. A third-party service, not a Correios one.
    # @see Based on: https://brasilapi.com.br/docs#tag/CEP
    # BrasilAPI, the other default provider. A third-party service, not a Correios one.
    def self.get_address_info_by_cep(cep, options = nil)
      options_providers = nil
      options_providers = options.providers unless options.nil? || options.providers.nil?
      digits = Runtime.keep_class(CLASS0, Runtime.as_string(cep))
      if Runtime.is_number(cep)
        digits = Runtime.pad_start(digits, 8, "0")
      end
      if !Runtime.pattern_test(PATTERN_CEP_FORMAT, digits)
        raise GetAddressInfoByCepValidationError, "CEP inv\u{e1}lido"
      end
      chosen = DEFAULT_PROVIDERS
      if !options_providers.nil?
        if !Runtime.is_list(options_providers)
          raise GetAddressInfoByCepValidationError, "Nenhum provedor v\u{e1}lido especificado"
        end
        chosen = known_providers(options_providers)
        if (chosen.length == 0)
          raise GetAddressInfoByCepValidationError, "Nenhum provedor v\u{e1}lido especificado"
        end
      end
      attempts = Runtime.start_all(method(:fetch_provider), chosen, digits)
      found = Runtime.first_success(attempts)
      if !found.nil?
        return found
      end
      if Runtime.any_failed_with(attempts, "GetAddressInfoByCepNotFoundError")
        raise GetAddressInfoByCepNotFoundError, "CEP n\u{e3}o encontrado em nenhum servi\u{e7}o"
      end
      raise GetAddressInfoByCepServiceError, "Todos os servi\u{e7}os est\u{e3}o fora de servi\u{e7}o ou indispon\u{ed}veis"
    end
  end
end
