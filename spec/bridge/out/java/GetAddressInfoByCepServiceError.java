/** Thrown by `getAddressInfoByCep` when every CEP service failed to answer. */
public class GetAddressInfoByCepServiceError extends GetAddressInfoByCepError {
    public GetAddressInfoByCepServiceError(String message) {
        super(message);
    }
}
