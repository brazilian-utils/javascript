// Code generated from spec/bridge/source/format-cnpj.ts. DO NOT EDIT.

/** `formatCnpj`, written once. */
public final class FormatCnpj {
    private FormatCnpj() {}

    private static final int[][] CLASS0 = {{0x30, 0x39}};
    private static final int[][] CLASS1 = {{0x30, 0x39}, {0x41, 0x5a}, {0x61, 0x7a}};

    private static final String PATTERN = "00.000.000/0000-00";
    private static final String OBFUSCATED_PATTERN = "**.000.000/0000-**";

    /**
     * Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value.
     */
    public static String formatCnpj(String value, FormatCnpjOptions options) {
        long optionsVersion = -1L;
        if (options != null && options.version != null) {
            optionsVersion = options.version;
        }
        boolean optionsObfuscate = false;
        if (options != null && options.obfuscate != null) {
            optionsObfuscate = options.obfuscate;
        }
        boolean optionsPad = false;
        if (options != null && options.pad != null) {
            optionsPad = options.pad;
        }
        if (value == null) {
            return "";
        }
        String text = value;
        String cleaned = Runtime.keepClass(CLASS0, text);
        if ((optionsVersion == 2L)) {
            cleaned = Runtime.keepClass(CLASS1, text).toUpperCase(java.util.Locale.ROOT);
        }
        String pattern = PATTERN;
        if (optionsObfuscate) {
            pattern = OBFUSCATED_PATTERN;
        }
        return layout(cleaned, pattern, optionsPad);
    }

    /**
     * Lays a value over a pattern.
     */
    public static String layout(String value, String pattern, boolean pad) {
        long slots = 0L;
        for (long index = 0L; index < (long) pattern.length(); index++) {
            if (((Runtime.codeAt(pattern, index) == 48L) || (Runtime.codeAt(pattern, index) == 42L))) {
                slots = (slots + 1L);
            }
        }
        String padded = value;
        if (pad) {
            padded = Runtime.padStart(value, slots, "0");
        }
        String formatted = "";
        long cursor = 0L;
        for (long index = 0L; index < (long) pattern.length(); index++) {
            long slot = Runtime.codeAt(pattern, index);
            if (((slot == 48L) || (slot == 42L))) {
                if ((cursor >= (long) padded.length())) {
                    return formatted;
                }
                if ((slot == 42L)) {
                    formatted = (formatted + "*");
                } else {
                    formatted = (formatted + Runtime.slice(padded, cursor, (cursor + 1L)));
                }
                cursor = (cursor + 1L);
            } else {
                if ((cursor < (long) padded.length())) {
                    formatted = (formatted + Runtime.slice(pattern, index, (index + 1L)));
                }
            }
        }
        return formatted;
    }
}
