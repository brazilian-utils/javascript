/** Thrown by `getAddressInfoByCep` when the value given is not a valid CEP. */
public class GetAddressInfoByCepValidationError extends GetAddressInfoByCepError {
    public GetAddressInfoByCepValidationError(String message) {
        super(message);
    }
}
