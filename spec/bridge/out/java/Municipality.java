/** One Brazilian municipality, as the IBGE publishes it. */
public final class Municipality {
    /** The 7-digit IBGE municipality code. */
    public String code;

    /** The municipality name. */
    public String name;

    /** The two-letter code of the state the municipality belongs to. */
    public String stateCode;

    public Municipality(String code, String name, String stateCode) {
        this.code = code;
        this.name = name;
        this.stateCode = stateCode;
    }
}
