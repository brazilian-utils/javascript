/** Thrown by `getAddressInfoByCep` when no CEP service knows the CEP. */
public class GetAddressInfoByCepNotFoundError extends GetAddressInfoByCepError {
    public GetAddressInfoByCepNotFoundError(String message) {
        super(message);
    }
}
