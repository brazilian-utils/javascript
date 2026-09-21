/** Options of `getAddressInfoByCep`. */
public final class GetAddressInfoByCepOptions {
    /** Which CEP services to race, in the order given (default: `["viacep", "brasilapi"]`; the deprecated `"widenet"` provider is excluded from the default list, but can still be requested explicitly). */
    public java.util.List<String> providers;
}
