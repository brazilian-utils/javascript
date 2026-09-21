/** Options of `formatCnpj`. */
public final class FormatCnpjOptions {
    /** Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`). */
    public Boolean pad;

    /** Which CNPJ format to read: `1` numeric only, `2` alphanumeric (default: `1`). */
    public Long version;

    /** Whether to hide the first 2 digits and the 2 check digits with `*` (default: `false`). */
    public Boolean obfuscate;
}
