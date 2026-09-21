/** Raised inside a provider that did not answer. Only whether a failure was a not found is looked at when the provider failures are aggregated, so this one never leaves the module. */
public class CepProviderFailure extends RuntimeException {
    public CepProviderFailure(String message) {
        super(message);
    }
}
