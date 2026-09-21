/** The address `getAddressInfoByCep` returns for a CEP. */
public final class AddressInfo {
    /** The 8 digit CEP, no mask. */
    public String cep;

    /** Two letter state code, e.g. "SP". */
    public String state;

    /** City name. */
    public String city;

    /** Neighborhood name, empty when the CEP covers a whole city. */
    public String neighborhood;

    /** Street name, empty when the CEP covers a whole city. */
    public String street;

    public AddressInfo(String cep, String state, String city, String neighborhood, String street) {
        this.cep = cep;
        this.state = state;
        this.city = city;
        this.neighborhood = neighborhood;
        this.street = street;
    }
}
