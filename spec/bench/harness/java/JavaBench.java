// Java arms: handwritten source versus generated source. A JIT compiled language is the case
// where generated code has the least excuse to be slower, and this checks that it is not.

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class JavaBench {
    private JavaBench() {}

    // The code points JavaScript's trim() strips. Java's String.trim() and strip() are both
    // different sets, so the class is spelled out.
    private static final String WS =
            "\u0009\n\u000b\u000c\r           "
                    + "       　﻿";

    private static final Pattern SHAPE =
            Pattern.compile("^[0-9]{3}[" + WS + "./-]*[0-9]{3}[" + WS + "./-]*[0-9]{3}[" + WS + "./-]*[0-9]{2}$");

    private static final Pattern NON_DIGITS = Pattern.compile("[^0-9]");

    private static int checkDigit(String base) {
        int sum = 0;
        int weight = base.length() + 1;

        for (int index = 0; index < base.length(); index++) {
            sum += (base.charAt(index) - '0') * weight;
            weight--;
        }

        int digit = 11 - (sum % 11);

        return digit >= 10 ? 0 : digit;
    }

    private static String trimJs(String value) {
        int start = 0;
        int end = value.length();

        while (start < end && WS.indexOf(value.charAt(start)) >= 0) {
            start++;
        }
        while (end > start && WS.indexOf(value.charAt(end - 1)) >= 0) {
            end--;
        }

        return value.substring(start, end);
    }

    static boolean handwrittenIsValid(String cpf) {
        if (cpf == null) {
            return false;
        }

        if (!SHAPE.matcher(trimJs(cpf)).matches()) {
            return false;
        }

        String digits = NON_DIGITS.matcher(cpf).replaceAll("");

        if (digits.chars().distinct().count() == 1) {
            return false;
        }

        return digits.charAt(9) - '0' == checkDigit(digits.substring(0, 9))
                && digits.charAt(10) - '0' == checkDigit(digits.substring(0, 10));
    }

    private static List<String> readCorpus(Path path) throws IOException {
        // The corpus is a flat JSON array of strings; parsed by hand to keep the harness
        // dependency free.
        String raw = Files.readString(path);
        List<String> corpus = new ArrayList<>();
        int index = 0;

        while (index < raw.length()) {
            if (raw.charAt(index) != '"') {
                index++;
                continue;
            }

            index++;
            StringBuilder value = new StringBuilder();

            while (index < raw.length() && raw.charAt(index) != '"') {
                char current = raw.charAt(index);

                if (current == '\\') {
                    index++;
                    char escape = raw.charAt(index);

                    switch (escape) {
                        case 'u' -> {
                            value.append((char) Integer.parseInt(raw.substring(index + 1, index + 5), 16));
                            index += 4;
                        }
                        case 'n' -> value.append('\n');
                        case 'r' -> value.append('\r');
                        case 't' -> value.append('\t');
                        default -> value.append(escape);
                    }
                } else {
                    value.append(current);
                }

                index++;
            }

            index++;
            corpus.add(value.toString());
        }

        return corpus;
    }

    private static void measure(String arm, List<String> corpus, java.util.function.Predicate<String> check) {
        for (int warm = 0; warm < 20; warm++) {
            run(corpus, check);
        }

        double best = Double.POSITIVE_INFINITY;
        int valid = 0;

        for (int rep = 0; rep < 15; rep++) {
            long start = System.nanoTime();
            valid = run(corpus, check);
            double perOp = (System.nanoTime() - start) / (double) corpus.size();

            best = Math.min(best, perOp);
        }

        System.out.printf(
                "{\"lang\":\"java\",\"arm\":\"%s\",\"nsPerOp\":%.1f,\"valid\":%d}%n", arm, best, valid);
    }

    private static int run(List<String> corpus, java.util.function.Predicate<String> check) {
        int valid = 0;

        for (String value : corpus) {
            if (check.test(value)) {
                valid++;
            }
        }

        return valid;
    }

    public static void main(String[] args) throws IOException {
        List<String> corpus = readCorpus(Path.of(args[0]));

        measure("handwritten", corpus, JavaBench::handwrittenIsValid);
        measure("generated", corpus, Cpf::isValid);
    }
}
