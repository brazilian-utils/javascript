// Code generated from spec/bridge/source/get-address-info-by-cep.ts. DO NOT EDIT.

/** Address lookup by CEP, written once. */
public final class GetAddressInfoByCep {
    private GetAddressInfoByCep() {}

    private static final int[][] CLASS0 = {{0x30, 0x39}};

    private static final Runtime.PatternStep[] PATTERN_CEP_FORMAT = {
        new Runtime.PatternStep(CLASS0, 8, 8, false),
    };

    private static final java.util.List<String> DEFAULT_PROVIDERS = new java.util.ArrayList<String>(java.util.List.of("viacep", "brasilapi"));
    private static final java.util.List<String> KNOWN_PROVIDERS = new java.util.ArrayList<String>(java.util.List.of("viacep", "widenet", "brasilapi"));
    private static final long BRASIL_API_NOT_FOUND_STATUS = 404L;
    private static final long HTTP_RETRIES = 2L;
    private static final long HTTP_RETRY_DELAY_MS = 250L;



    /**
     * Reads the address ViaCEP answers with.
     *
     * @see Based on: https://viacep.com.br/
     */
    public static AddressInfo fetchViaCep(String cep) {
        Runtime.HttpResponse response = Runtime.httpGet((("https://viacep.com.br/ws/" + cep) + "/json/"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
        if (!response.ok) {
            throw new CepProviderFailure("ViaCEP request failed");
        }
        String found = Runtime.jsonString(response.body, "cep");
        if ((Runtime.jsonTruthy(response.body, "erro") || found.equals(""))) {
            throw new GetAddressInfoByCepNotFoundError("CEP n\u00e3o encontrado");
        }
        return new AddressInfo(Runtime.keepClass(CLASS0, found), Runtime.jsonString(response.body, "uf"), Runtime.jsonString(response.body, "localidade"), Runtime.jsonString(response.body, "bairro"), Runtime.jsonString(response.body, "logradouro"));
    }

    /**
     * Reads the address Widenet answers with.
     */
    public static AddressInfo fetchWidenet(String cep) {
        Runtime.HttpResponse response = Runtime.httpGet((("https://apps.widenet.com.br/busca-cep/api/cep/" + cep) + ".json"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
        if (!response.ok) {
            throw new CepProviderFailure("Widenet request failed");
        }
        String found = Runtime.jsonString(response.body, "code");
        if ((((Runtime.jsonInt(response.body, "status") != 200L) || !Runtime.jsonIsTrue(response.body, "ok")) || found.equals(""))) {
            throw new GetAddressInfoByCepNotFoundError("CEP n\u00e3o encontrado");
        }
        return new AddressInfo(Runtime.keepClass(CLASS0, found), Runtime.jsonString(response.body, "state"), Runtime.jsonString(response.body, "city"), Runtime.jsonString(response.body, "district"), Runtime.jsonString(response.body, "address"));
    }

    /**
     * Reads the address BrasilAPI answers with.
     *
     * @see Based on: https://brasilapi.com.br/docs#tag/CEP
     */
    public static AddressInfo fetchBrasilApi(String cep) {
        Runtime.HttpResponse response = Runtime.httpGet((("https://brasilapi.com.br/api/cep/v1/" + cep) + ""), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
        if ((response.status == BRASIL_API_NOT_FOUND_STATUS)) {
            throw new GetAddressInfoByCepNotFoundError("CEP n\u00e3o encontrado");
        }
        if (!response.ok) {
            throw new CepProviderFailure("BrasilAPI request failed");
        }
        String found = Runtime.jsonString(response.body, "cep");
        if ((Runtime.jsonTruthy(response.body, "errors") || found.equals(""))) {
            throw new GetAddressInfoByCepNotFoundError("CEP n\u00e3o encontrado");
        }
        return new AddressInfo(Runtime.keepClass(CLASS0, found), Runtime.jsonString(response.body, "state"), Runtime.jsonString(response.body, "city"), Runtime.jsonString(response.body, "neighborhood"), Runtime.jsonString(response.body, "street"));
    }

    /**
     * Asks one named provider for a CEP.
     */
    public static AddressInfo fetchProvider(String provider, String cep) {
        if (provider.equals("viacep")) {
            return fetchViaCep(cep);
        }
        if (provider.equals("widenet")) {
            return fetchWidenet(cep);
        }
        return fetchBrasilApi(cep);
    }

    /**
     * The providers of a list that are known, in the order they were given.
     */
    public static java.util.List<String> knownProviders(java.util.List<String> given) {
        java.util.List<String> kept = new java.util.ArrayList<String>(java.util.List.of());
        for (var provider : given) {
            if (Runtime.listHas(KNOWN_PROVIDERS, provider)) {
                kept.add(provider);
            }
        }
        return kept;
    }

    /**
     * Fetches address information for a given CEP using multiple providers simultaneously.
     * Returns the result from the first provider that responds successfully.
     *
     * The providers are started together and raced, not tried one after the other, so a provider
     * that is retrying delays nothing for the others: its retries only push back the moment its own
     * failure lands, and therefore the moment an all-failed rejection can surface.
     *
     * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
     * @see Based on: https://viacep.com.br/
     * ViaCEP, one of the two default providers. A third-party service, not a Correios one.
     * @see Based on: https://brasilapi.com.br/docs#tag/CEP
     * BrasilAPI, the other default provider. A third-party service, not a Correios one.
     */
    public static AddressInfo getAddressInfoByCep(String cep, GetAddressInfoByCepOptions options) {
        java.util.List<String> optionsProviders = null;
        if (options != null && options.providers != null) {
            optionsProviders = options.providers;
        }
        String digits = Runtime.keepClass(CLASS0, cep);
        if (false) {
            digits = Runtime.padStart(digits, 8L, "0");
        }
        if (!Runtime.patternTest(PATTERN_CEP_FORMAT, digits)) {
            throw new GetAddressInfoByCepValidationError("CEP inv\u00e1lido");
        }
        java.util.List<String> chosen = DEFAULT_PROVIDERS;
        if ((optionsProviders != null)) {
            if (!true) {
                throw new GetAddressInfoByCepValidationError("Nenhum provedor v\u00e1lido especificado");
            }
            chosen = knownProviders(optionsProviders);
            if (((long) chosen.size() == 0L)) {
                throw new GetAddressInfoByCepValidationError("Nenhum provedor v\u00e1lido especificado");
            }
        }
        Runtime.Attempts attempts = Runtime.startAll(GetAddressInfoByCep::fetchProvider, chosen, digits);
        AddressInfo found = (AddressInfo) Runtime.firstSuccess(attempts);
        if ((found != null)) {
            return found;
        }
        if (Runtime.anyFailedWith(attempts, "GetAddressInfoByCepNotFoundError")) {
            throw new GetAddressInfoByCepNotFoundError("CEP n\u00e3o encontrado em nenhum servi\u00e7o");
        }
        throw new GetAddressInfoByCepServiceError("Todos os servi\u00e7os est\u00e3o fora de servi\u00e7o ou indispon\u00edveis");
    }
}
