// Code generated from spec/bridge/source/get-address-info-by-cep.ts. DO NOT EDIT.

namespace BrazilianUtils.Bridge
{
    /// <summary>Base class of every error `getAddressInfoByCep` rejects with.</summary>
    public class GetAddressInfoByCepError : System.Exception
    {
        public GetAddressInfoByCepError(string message) : base(message)
        {
        }
    }

    /// <summary>Thrown by `getAddressInfoByCep` when the value given is not a valid CEP.</summary>
    public class GetAddressInfoByCepValidationError : GetAddressInfoByCepError
    {
        public GetAddressInfoByCepValidationError(string message) : base(message)
        {
        }
    }

    /// <summary>Thrown by `getAddressInfoByCep` when no CEP service knows the CEP.</summary>
    public class GetAddressInfoByCepNotFoundError : GetAddressInfoByCepError
    {
        public GetAddressInfoByCepNotFoundError(string message) : base(message)
        {
        }
    }

    /// <summary>Thrown by `getAddressInfoByCep` when every CEP service failed to answer.</summary>
    public class GetAddressInfoByCepServiceError : GetAddressInfoByCepError
    {
        public GetAddressInfoByCepServiceError(string message) : base(message)
        {
        }
    }

    /// <summary>Raised inside a provider that did not answer. Only whether a failure was a not found is looked at when the provider failures are aggregated, so this one never leaves the module.</summary>
    public class CepProviderFailure : System.Exception
    {
        public CepProviderFailure(string message) : base(message)
        {
        }
    }

    /// <summary>The address `getAddressInfoByCep` returns for a CEP.</summary>
    public sealed class AddressInfo
    {
        /// <summary>The 8 digit CEP, no mask.</summary>
        public string Cep { get; set; }

        /// <summary>Two letter state code, e.g. "SP".</summary>
        public string State { get; set; }

        /// <summary>City name.</summary>
        public string City { get; set; }

        /// <summary>Neighborhood name, empty when the CEP covers a whole city.</summary>
        public string Neighborhood { get; set; }

        /// <summary>Street name, empty when the CEP covers a whole city.</summary>
        public string Street { get; set; }

        public AddressInfo(string cep, string state, string city, string neighborhood, string street)
        {
            Cep = cep;
            State = state;
            City = city;
            Neighborhood = neighborhood;
            Street = street;
        }
    }

    /// <summary>Options of `getAddressInfoByCep`.</summary>
    public sealed class GetAddressInfoByCepOptions
    {
        /// <summary>Which CEP services to race, in the order given (default: `["viacep", "brasilapi"]`; the deprecated `"widenet"` provider is excluded from the default list, but can still be requested explicitly).</summary>
        public System.Collections.Generic.List<string> Providers { get; set; }
    }

    /// <summary>Address lookup by CEP, written once.</summary>
    public static class GetAddressInfoByCepUtility
    {
        private static readonly int[][] CLASS0 = { new[] { 0x30, 0x39 } };

        private static readonly PatternStep[] PATTERN_CEP_FORMAT =
        {
            new PatternStep(CLASS0, 8, 8, false),
        };

        private static readonly System.Collections.Generic.List<string> DEFAULT_PROVIDERS = new System.Collections.Generic.List<string> { "viacep", "brasilapi" };
        private static readonly System.Collections.Generic.List<string> KNOWN_PROVIDERS = new System.Collections.Generic.List<string> { "viacep", "widenet", "brasilapi" };
        private const long BRASIL_API_NOT_FOUND_STATUS = 404L;
        private const long HTTP_RETRIES = 2L;
        private const long HTTP_RETRY_DELAY_MS = 250L;



        /// <summary>
        /// Reads the address ViaCEP answers with.
        ///
        /// @see Based on: https://viacep.com.br/
        /// </summary>
        public static async System.Threading.Tasks.Task<AddressInfo> FetchViaCep(string cep)
        {
            HttpResponse response = await Net.HttpGet((("https://viacep.com.br/ws/" + cep) + "/json/"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
            if (!response.Ok)
            {
                throw new CepProviderFailure("ViaCEP request failed");
            }
            string found = Net.JsonString(response.Body, "cep");
            if ((Net.JsonTruthy(response.Body, "erro") || (found == "")))
            {
                throw new GetAddressInfoByCepNotFoundError("CEP n\u00e3o encontrado");
            }
            return new AddressInfo(Runtime.KeepClass(CLASS0, found), Net.JsonString(response.Body, "uf"), Net.JsonString(response.Body, "localidade"), Net.JsonString(response.Body, "bairro"), Net.JsonString(response.Body, "logradouro"));
        }

        /// <summary>
        /// Reads the address Widenet answers with.
        /// </summary>
        public static async System.Threading.Tasks.Task<AddressInfo> FetchWidenet(string cep)
        {
            HttpResponse response = await Net.HttpGet((("https://apps.widenet.com.br/busca-cep/api/cep/" + cep) + ".json"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
            if (!response.Ok)
            {
                throw new CepProviderFailure("Widenet request failed");
            }
            string found = Net.JsonString(response.Body, "code");
            if ((((Net.JsonInt(response.Body, "status") != 200L) || !Net.JsonIsTrue(response.Body, "ok")) || (found == "")))
            {
                throw new GetAddressInfoByCepNotFoundError("CEP n\u00e3o encontrado");
            }
            return new AddressInfo(Runtime.KeepClass(CLASS0, found), Net.JsonString(response.Body, "state"), Net.JsonString(response.Body, "city"), Net.JsonString(response.Body, "district"), Net.JsonString(response.Body, "address"));
        }

        /// <summary>
        /// Reads the address BrasilAPI answers with.
        ///
        /// @see Based on: https://brasilapi.com.br/docs#tag/CEP
        /// </summary>
        public static async System.Threading.Tasks.Task<AddressInfo> FetchBrasilApi(string cep)
        {
            HttpResponse response = await Net.HttpGet((("https://brasilapi.com.br/api/cep/v1/" + cep) + ""), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
            if ((response.Status == BRASIL_API_NOT_FOUND_STATUS))
            {
                throw new GetAddressInfoByCepNotFoundError("CEP n\u00e3o encontrado");
            }
            if (!response.Ok)
            {
                throw new CepProviderFailure("BrasilAPI request failed");
            }
            string found = Net.JsonString(response.Body, "cep");
            if ((Net.JsonTruthy(response.Body, "errors") || (found == "")))
            {
                throw new GetAddressInfoByCepNotFoundError("CEP n\u00e3o encontrado");
            }
            return new AddressInfo(Runtime.KeepClass(CLASS0, found), Net.JsonString(response.Body, "state"), Net.JsonString(response.Body, "city"), Net.JsonString(response.Body, "neighborhood"), Net.JsonString(response.Body, "street"));
        }

        /// <summary>
        /// Asks one named provider for a CEP.
        /// </summary>
        public static async System.Threading.Tasks.Task<AddressInfo> FetchProvider(string provider, string cep)
        {
            if ((provider == "viacep"))
            {
                return await FetchViaCep(cep);
            }
            if ((provider == "widenet"))
            {
                return await FetchWidenet(cep);
            }
            return await FetchBrasilApi(cep);
        }

        /// <summary>
        /// The providers of a list that are known, in the order they were given.
        /// </summary>
        public static System.Collections.Generic.List<string> KnownProviders(System.Collections.Generic.List<string> given)
        {
            System.Collections.Generic.List<string> kept = new System.Collections.Generic.List<string> {  };
            foreach (var provider in given)
            {
                if (Net.ListHas(KNOWN_PROVIDERS, provider))
                {
                    kept.Add(provider);
                }
            }
            return kept;
        }

        /// <summary>
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
        /// </summary>
        public static async System.Threading.Tasks.Task<AddressInfo> GetAddressInfoByCep(string cep, GetAddressInfoByCepOptions options = null)
        {
            System.Collections.Generic.List<string> optionsProviders = null;
            if (options != null && options.Providers != null)
            {
                optionsProviders = options.Providers;
            }
            string digits = Runtime.KeepClass(CLASS0, cep);
            if (false)
            {
                digits = Runtime.PadStart(digits, 8L, "0");
            }
            if (!Runtime.PatternTest(PATTERN_CEP_FORMAT, digits))
            {
                throw new GetAddressInfoByCepValidationError("CEP inv\u00e1lido");
            }
            System.Collections.Generic.List<string> chosen = DEFAULT_PROVIDERS;
            if ((optionsProviders != null))
            {
                if (!true)
                {
                    throw new GetAddressInfoByCepValidationError("Nenhum provedor v\u00e1lido especificado");
                }
                chosen = KnownProviders(optionsProviders);
                if (((long) chosen.Count == 0L))
                {
                    throw new GetAddressInfoByCepValidationError("Nenhum provedor v\u00e1lido especificado");
                }
            }
            Attempts<AddressInfo> attempts = Net.StartAll(FetchProvider, chosen, digits);
            AddressInfo found = await Net.FirstSuccess(attempts);
            if ((found != null))
            {
                return found;
            }
            if (Net.AnyFailedWith(attempts, "GetAddressInfoByCepNotFoundError"))
            {
                throw new GetAddressInfoByCepNotFoundError("CEP n\u00e3o encontrado em nenhum servi\u00e7o");
            }
            throw new GetAddressInfoByCepServiceError("Todos os servi\u00e7os est\u00e3o fora de servi\u00e7o ou indispon\u00edveis");
        }
    }
}
