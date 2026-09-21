// The portable runtime for the Java target.
//
// Java strings are UTF-16, the same as JavaScript's, so indexes and lengths already line up;
// what is here is the rest: the compiled classes and patterns, and the JavaScript specific
// trimming and coercion rules.

/** Helpers shared by the generated utilities. */
public final class Runtime {
    private Runtime() {}

    /** The code points JavaScript's trim() strips. Java's String.strip() is a different set. */
    private static final int[][] JS_WHITESPACE = {
        {0x09, 0x0d}, {0x20, 0x20}, {0xa0, 0xa0}, {0x1680, 0x1680}, {0x2000, 0x200a},
        {0x2028, 0x2029}, {0x202f, 0x202f}, {0x205f, 0x205f}, {0x3000, 0x3000}, {0xfeff, 0xfeff}
    };

    /** One step of a compiled pattern: repeat a class between min and max times. */
    public static final class PatternStep {
        public final int[][] charClass;
        public final long min;
        public final long max;
        public final boolean capture;

        public PatternStep(int[][] charClass, long min, long max, boolean capture) {
            this.charClass = charClass;
            this.min = min;
            this.max = max;
            this.capture = capture;
        }
    }

    /** Whether a code point belongs to a class. */
    public static boolean inClass(int[][] charClass, int code) {
        for (int[] span : charClass) {
            if (code >= span[0] && code <= span[1]) {
                return true;
            }
        }

        return false;
    }

    /** Reads one code unit, or -1 when the index is out of range. */
    public static long codeAt(String value, long index) {
        if (index < 0 || index >= value.length()) {
            return -1;
        }

        return value.charAt((int) index);
    }

    /** Takes the code units between two indexes, clamping like JavaScript's slice. */
    public static String slice(String value, long from, long to) {
        long start = Math.max(0, from);
        long end = Math.min(value.length(), to);

        if (start >= end) {
            return "";
        }

        return value.substring((int) start, (int) end);
    }

    /** Whether any character of the value belongs to the class. */
    public static boolean classHas(int[][] charClass, String value) {
        for (int index = 0; index < value.length(); index++) {
            if (inClass(charClass, value.charAt(index))) {
                return true;
            }
        }

        return false;
    }

    /** Keeps only the characters of the value that belong to the class. */
    public static String keepClass(int[][] charClass, String value) {
        StringBuilder kept = new StringBuilder();

        for (int index = 0; index < value.length(); index++) {
            if (inClass(charClass, value.charAt(index))) {
                kept.append(value.charAt(index));
            }
        }

        return kept.toString();
    }

    /** Runs a compiled pattern against the whole value, greedily and without backtracking. */
    public static boolean patternTest(PatternStep[] steps, String value) {
        int index = 0;

        for (PatternStep step : steps) {
            long count = 0;

            while ((step.max < 0 || count < step.max)
                    && index < value.length()
                    && inClass(step.charClass, value.charAt(index))) {
                index++;
                count++;
            }

            if (count < step.min) {
                return false;
            }
        }

        return index == value.length();
    }

    /** Strips the code points JavaScript's trim() strips. */
    public static String jsTrim(String value) {
        int start = 0;
        int end = value.length();

        while (start < end && inClass(JS_WHITESPACE, value.charAt(start))) {
            start++;
        }
        while (end > start && inClass(JS_WHITESPACE, value.charAt(end - 1))) {
            end--;
        }

        return value.substring(start, end);
    }

    /** Left pads the value with a filler up to a length. */
    public static String padStart(String value, long length, String filler) {
        StringBuilder padded = new StringBuilder();

        while (padded.length() + value.length() < length) {
            padded.append(filler);
        }

        return padded + value;
    }

    /** Repeats a value. */
    public static String repeat(String value, long times) {
        return times <= 0 ? "" : value.repeat((int) times);
    }

    /** Reads an optional flag the way JavaScript reads truthiness. */
    public static boolean isTruthy(Boolean value) {
        return value != null && value;
    }

    /** A dataset: the rows in the baked full order, and the rows of each key. */
    public static final class Dataset {
        private final String[][] all;
        private final java.util.Map<String, String[][]> byKey;

        public Dataset(String[][] rows, String[] keys, int[][] groups, int[] fullOrder) {
            this.all = new String[fullOrder.length][];

            for (int index = 0; index < fullOrder.length; index++) {
                this.all[index] = rows[fullOrder[index]];
            }

            this.byKey = new java.util.HashMap<>(keys.length * 2);

            for (int group = 0; group < keys.length; group++) {
                String[][] of = new String[groups[group].length][];

                for (int index = 0; index < groups[group].length; index++) {
                    of[index] = rows[groups[group][index]];
                }

                this.byKey.put(keys[group], of);
            }
        }

        /** Every row, in the baked full order. */
        public String[][] all() {
            return this.all;
        }

        /** The rows whose first column is the key given, empty when the key is unknown. */
        public String[][] rows(String key) {
            String[][] found = this.byKey.get(key);

            return found == null ? new String[0][] : found;
        }
    }

    /** Every row of a dataset, in the baked full order. */
    public static String[][] dataAll(Dataset table) {
        return table.all();
    }

    /** The rows whose first column is the key given, empty when the key is unknown. */
    public static String[][] dataRows(Dataset table, String key) {
        return table.rows(key);
    }
}
