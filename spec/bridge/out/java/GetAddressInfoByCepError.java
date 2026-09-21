/** Base class of every error `getAddressInfoByCep` rejects with. */
public class GetAddressInfoByCepError extends RuntimeException {
    public GetAddressInfoByCepError(String message) {
        super(message);
    }
}
