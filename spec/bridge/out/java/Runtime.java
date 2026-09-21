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
        private final java.util.List<java.util.List<String>> all;
        private final java.util.Map<String, java.util.List<java.util.List<String>>> byKey;

        public Dataset(String[][] rows, String[] keys, int[][] groups, int[] fullOrder) {
            java.util.List<java.util.List<String>> shared = new java.util.ArrayList<>(rows.length);

            for (String[] row : rows) {
                shared.add(java.util.List.of(row));
            }

            this.all = new java.util.ArrayList<>(fullOrder.length);

            for (int index : fullOrder) {
                this.all.add(shared.get(index));
            }

            this.byKey = new java.util.HashMap<>(keys.length * 2);

            for (int group = 0; group < keys.length; group++) {
                java.util.List<java.util.List<String>> of = new java.util.ArrayList<>(groups[group].length);

                for (int index : groups[group]) {
                    of.add(shared.get(index));
                }

                this.byKey.put(keys[group], of);
            }
        }

        /** Every row, in the baked full order. */
        public java.util.List<java.util.List<String>> all() {
            return this.all;
        }

        /** The rows whose first column is the key given, empty when the key is unknown. */
        public java.util.List<java.util.List<String>> rows(String key) {
            return this.byKey.getOrDefault(key, java.util.List.of());
        }
    }

    /** Every row of a dataset, in the baked full order. */
    public static java.util.List<java.util.List<String>> dataAll(Dataset table) {
        return table.all();
    }

    /** The rows whose first column is the key given, empty when the key is unknown. */
    public static java.util.List<java.util.List<String>> dataRows(Dataset table, String key) {
        return table.rows(key);
    }

    /** What a provider answered: the HTTP status, whether it counts as a success, and the body. */
    public static final class HttpResponse {
        public final long status;
        public final boolean ok;
        public final Object body;

        public HttpResponse(long status, boolean ok, Object body) {
            this.status = status;
            this.ok = ok;
            this.body = body;
        }
    }

    private static final java.net.http.HttpClient HTTP = java.net.http.HttpClient.newBuilder()
        .connectTimeout(java.time.Duration.ofSeconds(15))
        .build();

    /**
     * The origin every request is sent to instead of its own, when one is set.
     *
     * This is the conformance hook: the cross language replay points all seven targets at one
     * local server, the same way the JavaScript suite points fetch at a mock.
     */
    private static String httpTarget(String url) {
        String base = System.getenv("BRUTILS_BRIDGE_HTTP_ORIGIN");

        if (base == null || base.isEmpty()) {
            return url;
        }

        return base + "/" + url.replaceFirst("^https?://", "");
    }

    /** Performs an HTTP GET, retrying a transient transport failure with a linear backoff. */
    public static HttpResponse httpGet(String url, long retries, long retryDelayMs) {
        String target = httpTarget(url);

        for (long attempt = 0; ; attempt++) {
            try {
                java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(target))
                    .timeout(java.time.Duration.ofSeconds(15))
                    .GET()
                    .build();
                java.net.http.HttpResponse<String> answer =
                    HTTP.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
                long status = answer.statusCode();
                Object body;

                try {
                    body = Json.parse(answer.body());
                } catch (RuntimeException error) {
                    body = null;
                }

                return new HttpResponse(status, status >= 200 && status < 300, body);
            } catch (Exception error) {
                if (attempt >= retries) {
                    return new HttpResponse(0, false, null);
                }

                try {
                    Thread.sleep(retryDelayMs * (attempt + 1));
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();

                    return new HttpResponse(0, false, null);
                }
            }
        }
    }

    /** Whether a list holds a value. */
    public static boolean listHas(java.util.List<String> items, String value) {
        for (String item : items) {
            if (item.equals(value)) {
                return true;
            }
        }

        return false;
    }

    /** Reads one field of a JSON body, treating anything that is not an object as empty. */
    private static Object jsonField(Object body, String key) {
        if (!(body instanceof java.util.Map)) {
            return null;
        }

        return ((java.util.Map<?, ?>) body).get(key);
    }

    /** Reads a string field of a JSON body, answering "" when it is missing. */
    public static String jsonString(Object body, String key) {
        Object found = jsonField(body, key);

        return found instanceof String ? (String) found : "";
    }

    /** Reads an integer field of a JSON body, answering -1 when it is missing. */
    public static long jsonInt(Object body, String key) {
        Object found = jsonField(body, key);

        return found instanceof Double ? (long) (double) (Double) found : -1L;
    }

    /** Whether a field of a JSON body is truthy, the way JavaScript reads truthiness. */
    public static boolean jsonTruthy(Object body, String key) {
        Object found = jsonField(body, key);

        if (found == null) {
            return false;
        }

        if (found instanceof Boolean) {
            return (Boolean) found;
        }

        if (found instanceof Double) {
            return (Double) found != 0.0;
        }

        if (found instanceof String) {
            return !((String) found).isEmpty();
        }

        return true;
    }

    /** Whether a field of a JSON body is exactly true. */
    public static boolean jsonIsTrue(Object body, String key) {
        return Boolean.TRUE.equals(jsonField(body, key));
    }

    /** A JSON reader, so the target needs nothing outside the JDK. */
    static final class Json {
        private final String text;
        private int at;

        private Json(String text) {
            this.text = text;
        }

        static Object parse(String text) {
            Json reader = new Json(text);

            reader.space();

            Object value = reader.value();

            reader.space();

            if (reader.at != text.length()) {
                throw new IllegalArgumentException("trailing JSON");
            }

            return value;
        }

        private void space() {
            while (at < text.length() && Character.isWhitespace(text.charAt(at))) {
                at++;
            }
        }

        private Object value() {
            if (at >= text.length()) {
                throw new IllegalArgumentException("empty JSON");
            }

            char head = text.charAt(at);

            if (head == '{') {
                return object();
            }

            if (head == '[') {
                return array();
            }

            if (head == '"') {
                return string();
            }

            if (text.startsWith("true", at)) {
                at += 4;

                return Boolean.TRUE;
            }

            if (text.startsWith("false", at)) {
                at += 5;

                return Boolean.FALSE;
            }

            if (text.startsWith("null", at)) {
                at += 4;

                return null;
            }

            return number();
        }

        private java.util.Map<String, Object> object() {
            java.util.Map<String, Object> found = new java.util.LinkedHashMap<>();

            at++;
            space();

            if (at < text.length() && text.charAt(at) == '}') {
                at++;

                return found;
            }

            while (true) {
                space();

                String key = string();

                space();
                at++; // ':'
                space();
                found.put(key, value());
                space();

                if (at < text.length() && text.charAt(at) == ',') {
                    at++;

                    continue;
                }

                at++; // '}'

                return found;
            }
        }

        private java.util.List<Object> array() {
            java.util.List<Object> found = new java.util.ArrayList<>();

            at++;
            space();

            if (at < text.length() && text.charAt(at) == ']') {
                at++;

                return found;
            }

            while (true) {
                space();
                found.add(value());
                space();

                if (at < text.length() && text.charAt(at) == ',') {
                    at++;

                    continue;
                }

                at++; // ']'

                return found;
            }
        }

        private String string() {
            StringBuilder out = new StringBuilder();

            at++;

            while (at < text.length()) {
                char here = text.charAt(at++);

                if (here == '"') {
                    return out.toString();
                }

                if (here != '\\') {
                    out.append(here);

                    continue;
                }

                char escaped = text.charAt(at++);

                switch (escaped) {
                    case 'n': out.append('\n'); break;
                    case 't': out.append('\t'); break;
                    case 'r': out.append('\r'); break;
                    case 'b': out.append('\b'); break;
                    case 'f': out.append('\f'); break;
                    case 'u':
                        out.append((char) Integer.parseInt(text.substring(at, at + 4), 16));
                        at += 4;
                        break;
                    default: out.append(escaped);
                }
            }

            throw new IllegalArgumentException("unterminated string");
        }

        private Double number() {
            int start = at;

            while (at < text.length() && "+-.eE0123456789".indexOf(text.charAt(at)) >= 0) {
                at++;
            }

            return Double.valueOf(text.substring(start, at));
        }
    }

    /** What one attempt of a race ended with. */
    private static final class Outcome {
        final boolean ok;
        final Object value;
        final java.util.List<String> kinds;

        Outcome(boolean ok, Object value, java.util.List<String> kinds) {
            this.ok = ok;
            this.value = value;
            this.kinds = kinds;
        }
    }

    /** One attempt of a race: the function the source named, applied to one item. */
    public interface Task {
        Object run(String item, String argument);
    }

    /** The running attempts of a race, and what each one ended with. */
    public static final class Attempts {
        private final java.util.concurrent.BlockingQueue<Outcome> settled;
        private final int total;
        private final java.util.List<Outcome> outcomes = new java.util.ArrayList<>();

        Attempts(int total) {
            this.settled = new java.util.concurrent.ArrayBlockingQueue<>(Math.max(total, 1));
            this.total = total;
        }
    }

    /** The error name and every name it inherits from, which is what a failure is matched on. */
    private static java.util.List<String> kindsOf(Throwable error) {
        java.util.List<String> kinds = new java.util.ArrayList<>();

        for (Class<?> current = error.getClass(); current != null; current = current.getSuperclass()) {
            kinds.add(current.getSimpleName());
        }

        return kinds;
    }

    /**
     * Starts one attempt per item, all at once.
     *
     * This is the only concurrency primitive of the portable subset. Java has virtual threads,
     * so the work goes on one each and the caller simply waits.
     */
    public static Attempts startAll(Task run, java.util.List<String> items, String argument) {
        Attempts attempts = new Attempts(items.size());

        for (String item : items) {
            Thread.ofVirtual().start(() -> {
                try {
                    attempts.settled.put(new Outcome(true, run.run(item, argument), java.util.List.of()));
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                } catch (Throwable error) {
                    try {
                        attempts.settled.put(new Outcome(false, null, kindsOf(error)));
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                    }
                }
            });
        }

        return attempts;
    }

    /** The value of the first attempt that succeeds, or null once every attempt has failed. */
    public static Object firstSuccess(Attempts attempts) {
        while (attempts.outcomes.size() < attempts.total) {
            Outcome outcome;

            try {
                outcome = attempts.settled.take();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();

                return null;
            }

            attempts.outcomes.add(outcome);

            if (outcome.ok) {
                return outcome.value;
            }
        }

        return null;
    }

    /** Whether any attempt failed with a given error kind. */
    public static boolean anyFailedWith(Attempts attempts, String kind) {
        for (Outcome outcome : attempts.outcomes) {
            if (!outcome.ok && outcome.kinds.contains(kind)) {
                return true;
            }
        }

        return false;
    }
}
