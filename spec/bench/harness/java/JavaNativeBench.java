// The Java arm the first pass missed: the shared core over the Foreign Function & Memory API.
//
// Panama is the cheapest boundary the JVM has, but only if it is written the way a real binding
// writes it. Two things matter and both are easy to get wrong:
//
//  * the `MethodHandle` has to be `static final`, or the JIT cannot fold the downcall stub into
//    the caller and every call goes through a generic invoker;
//  * `Linker.Option.isTrivial()` (renamed `critical` in JDK 22) tells the runtime the callee
//    returns quickly and never calls back, which lets it skip the thread state transition.
//
// What Panama cannot skip on JDK 21 is marshalling: a trivial downcall may not touch the heap,
// so the string is encoded and copied off-heap before the call. That copy is measured as part
// of the `ffm` arm, because a real binding cannot avoid it either.

import java.io.IOException;
import java.lang.foreign.Arena;
import java.lang.foreign.FunctionDescriptor;
import java.lang.foreign.Linker;
import java.lang.foreign.MemorySegment;
import java.lang.foreign.SymbolLookup;
import java.lang.foreign.ValueLayout;
import java.lang.invoke.MethodHandle;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public final class JavaNativeBench {
    private JavaNativeBench() {}

    // A global arena: its segments need no liveness check, which a shared one would pay per call.
    private static final Arena ARENA = Arena.global();
    private static final MemorySegment SCRATCH = ARENA.allocate(256);
    private static final FunctionDescriptor DESCRIPTOR =
            FunctionDescriptor.of(ValueLayout.JAVA_INT, ValueLayout.ADDRESS, ValueLayout.JAVA_LONG);
    private static final SymbolLookup LOOKUP =
            SymbolLookup.libraryLookup(Path.of(System.getProperty("core.library")), ARENA);
    private static final MemorySegment SYMBOL = LOOKUP.find("cpf_is_valid").orElseThrow();

    /** The trivial downcall option, absent on a JDK that does not have it yet. */
    private static final Linker.Option TRIVIAL = trivialOption();

    private static final MethodHandle CPF_IS_VALID = TRIVIAL == null
            ? Linker.nativeLinker().downcallHandle(SYMBOL, DESCRIPTOR)
            : Linker.nativeLinker().downcallHandle(SYMBOL, DESCRIPTOR, TRIVIAL);

    private static final MethodHandle CPF_IS_VALID_PLAIN =
            Linker.nativeLinker().downcallHandle(SYMBOL, DESCRIPTOR);

    private static Linker.Option trivialOption() {
        for (var method : Linker.Option.class.getMethods()) {
            if (method.getName().equals("isTrivial") && method.getParameterCount() == 0) {
                try {
                    return (Linker.Option) method.invoke(null);
                } catch (ReflectiveOperationException ignored) {
                    return null;
                }
            }
        }

        return null;
    }

    private static boolean ffmIsValid(String value) throws Throwable {
        byte[] encoded = value.getBytes(StandardCharsets.UTF_8);

        MemorySegment.copy(encoded, 0, SCRATCH, ValueLayout.JAVA_BYTE, 0, encoded.length);

        return (int) CPF_IS_VALID.invokeExact(SCRATCH, (long) encoded.length) == 1;
    }

    private static int runFfm(List<String> corpus) throws Throwable {
        int valid = 0;

        for (String value : corpus) {
            if (ffmIsValid(value)) {
                valid++;
            }
        }

        return valid;
    }

    /** Just the boundary: the same pointer and length every time, no marshalling at all. */
    private static int runFfmCallOnly(List<String> corpus) throws Throwable {
        writePayload();

        int valid = 0;

        for (int index = 0; index < corpus.size(); index++) {
            if ((int) CPF_IS_VALID.invokeExact(SCRATCH, 11L) == 1) {
                valid++;
            }
        }

        return valid;
    }

    /** The same boundary without the trivial option, to show what the option is worth. */
    private static int runFfmPlainCallOnly(List<String> corpus) throws Throwable {
        writePayload();

        int valid = 0;

        for (int index = 0; index < corpus.size(); index++) {
            if ((int) CPF_IS_VALID_PLAIN.invokeExact(SCRATCH, 11L) == 1) {
                valid++;
            }
        }

        return valid;
    }

    private static void writePayload() {
        byte[] payload = "12345678909".getBytes(StandardCharsets.UTF_8);

        MemorySegment.copy(payload, 0, SCRATCH, ValueLayout.JAVA_BYTE, 0, payload.length);
    }

    private static List<String> readCorpus(Path path) throws IOException {
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

    private interface Run {
        int over(List<String> corpus) throws Throwable;
    }

    private static void measure(String arm, List<String> corpus, Run run) throws Throwable {
        for (int warm = 0; warm < 50; warm++) {
            run.over(corpus);
        }

        double best = Double.POSITIVE_INFINITY;
        int valid = 0;

        for (int rep = 0; rep < 15; rep++) {
            long start = System.nanoTime();

            valid = run.over(corpus);

            double perOp = (System.nanoTime() - start) / (double) corpus.size();

            best = Math.min(best, perOp);
        }

        System.out.printf(
                "{\"lang\":\"java\",\"arm\":\"%s\",\"nsPerOp\":%.1f,\"valid\":%d}%n", arm, best, valid);
    }

    public static void main(String[] args) throws Throwable {
        List<String> corpus = readCorpus(Path.of(args[0]));

        if (TRIVIAL == null) {
            System.err.println("note: no trivial downcall option on this JDK");
        }

        measure("ffm", corpus, JavaNativeBench::runFfm);
        measure("ffm-callonly", corpus, JavaNativeBench::runFfmCallOnly);
        measure("ffm-plain-callonly", corpus, JavaNativeBench::runFfmPlainCallOnly);
    }
}
