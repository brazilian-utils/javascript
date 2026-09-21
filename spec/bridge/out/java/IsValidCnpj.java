// Code generated from spec/bridge/source/is-valid-cnpj.ts. DO NOT EDIT.

/** `isValidCnpj`, written once. */
public final class IsValidCnpj {
    private IsValidCnpj() {}

    private static final int[][] CLASS0 = {{0x30, 0x39}, {0x41, 0x5a}};
    private static final int[][] CLASS1 = {{0x9, 0xd}, {0x20, 0x20}, {0x2d, 0x2f}, {0xa0, 0xa0}, {0x1680, 0x1680}, {0x2000, 0x200a}, {0x2028, 0x2029}, {0x202f, 0x202f}, {0x205f, 0x205f}, {0x3000, 0x3000}, {0xfeff, 0xfeff}};
    private static final int[][] CLASS2 = {{0x30, 0x39}};
    private static final int[][] CLASS3 = {{0x41, 0x5a}};
    private static final int[][] CLASS4 = {{0x30, 0x39}, {0x41, 0x5a}, {0x61, 0x7a}};

    private static final Runtime.PatternStep[] PATTERN_ALPHANUMERIC_FORMAT = {
        new Runtime.PatternStep(CLASS0, 2, 2, false),
        new Runtime.PatternStep(CLASS1, 0, -1, false),
        new Runtime.PatternStep(CLASS0, 3, 3, false),
        new Runtime.PatternStep(CLASS1, 0, -1, false),
        new Runtime.PatternStep(CLASS0, 3, 3, false),
        new Runtime.PatternStep(CLASS1, 0, -1, false),
        new Runtime.PatternStep(CLASS0, 4, 4, false),
        new Runtime.PatternStep(CLASS1, 0, -1, false),
        new Runtime.PatternStep(CLASS2, 2, 2, false),
    };

    private static final Runtime.PatternStep[] PATTERN_NUMERIC_FORMAT = {
        new Runtime.PatternStep(CLASS2, 2, 2, false),
        new Runtime.PatternStep(CLASS1, 0, -1, false),
        new Runtime.PatternStep(CLASS2, 3, 3, false),
        new Runtime.PatternStep(CLASS1, 0, -1, false),
        new Runtime.PatternStep(CLASS2, 3, 3, false),
        new Runtime.PatternStep(CLASS1, 0, -1, false),
        new Runtime.PatternStep(CLASS2, 4, 4, false),
        new Runtime.PatternStep(CLASS1, 0, -1, false),
        new Runtime.PatternStep(CLASS2, 2, 2, false),
    };

    private static final long[] FIRST_DIGIT_WEIGHTS = new long[] {5L, 4L, 3L, 2L, 9L, 8L, 7L, 6L, 5L, 4L, 3L, 2L};
    private static final long[] SECOND_DIGIT_WEIGHTS = new long[] {6L, 5L, 4L, 3L, 2L, 9L, 8L, 7L, 6L, 5L, 4L, 3L, 2L};



    /**
     * Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
     *
     * Supports both numeric (version 1) and alphanumeric (version 2) CNPJ formats, and accepts the
     * usual mask characters (`.`, `-`, `/`) and whitespace around and between groups.
     */
    public static boolean isValidCnpj(String cnpj, IsValidCnpjOptions options) {
        long optionsVersion = -1L;
        if (options != null && options.version != null) {
            optionsVersion = options.version;
        }
        if (cnpj == null) {
            return false;
        }
        String trimmed = Runtime.jsTrim(cnpj);
        if ((optionsVersion == 2L)) {
            String cleaned = Runtime.keepClass(CLASS4, cnpj).toUpperCase(java.util.Locale.ROOT);
            if (Runtime.classHas(CLASS3, cleaned)) {
                if (!Runtime.patternTest(PATTERN_ALPHANUMERIC_FORMAT, trimmed.toUpperCase(java.util.Locale.ROOT))) {
                    return false;
                }
                return hasValidChecksum(cleaned);
            }
        }
        String numeric = Runtime.keepClass(CLASS2, cnpj);
        if (!Runtime.patternTest(PATTERN_NUMERIC_FORMAT, trimmed)) {
            return false;
        }
        if (isRepeated(numeric)) {
            return false;
        }
        return hasValidChecksum(numeric);
    }

    /**
     * Computes one CNPJ check digit from the base and its weight vector.
     */
    public static long checkDigit(String base, long[] weights) {
        long sum = 0L;
        for (long index = 0L; index < (long) weights.length; index++) {
            sum = (sum + ((Runtime.codeAt(base, index) - 48L) * weights[(int) index]));
        }
        long remainder = (sum % 11L);
        if ((remainder < 2L)) {
            return 0L;
        }
        return (11L - remainder);
    }

    /**
     * Whether both check digits of a sanitized 14 character CNPJ match its base.
     */
    public static boolean hasValidChecksum(String cnpj) {
        if (((Runtime.codeAt(cnpj, 12L) - 48L) != checkDigit(cnpj, FIRST_DIGIT_WEIGHTS))) {
            return false;
        }
        return ((Runtime.codeAt(cnpj, 13L) - 48L) == checkDigit(cnpj, SECOND_DIGIT_WEIGHTS));
    }

    /**
     * Whether every character of the value is the same one.
     */
    public static boolean isRepeated(String value) {
        if (((long) value.length() == 0L)) {
            return false;
        }
        for (long index = 1L; index < (long) value.length(); index++) {
            if ((Runtime.codeAt(value, index) != Runtime.codeAt(value, 0L))) {
                return false;
            }
        }
        return true;
    }
}
