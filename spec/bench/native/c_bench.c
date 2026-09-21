/*
 * The floor: the shared core called from C, over the same shared library every binding uses.
 *
 * A call through the PLT costs a couple of nanoseconds, so this is as close to "just the work"
 * as the benchmark gets. Every other arm pays this plus whatever its own boundary costs, which
 * is what lets the table say how much of a binding's total is crossing rather than validating.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

extern int cpf_is_valid(const unsigned char *ptr, size_t len);

typedef struct {
    const unsigned char *ptr;
    size_t len;
} Input;

static long now_ns(void) {
    struct timespec spec;

    clock_gettime(CLOCK_MONOTONIC, &spec);

    return spec.tv_sec * 1000000000L + spec.tv_nsec;
}

static int run(const Input *corpus, size_t count) {
    int valid = 0;

    for (size_t index = 0; index < count; index++) {
        valid += cpf_is_valid(corpus[index].ptr, corpus[index].len);
    }

    return valid;
}

/*
 * The same loop over one cached, always valid input. Every language's "callonly" arm does
 * exactly this, so subtracting this number from theirs leaves the boundary and nothing else.
 */
static int run_fixed(size_t count) {
    static const unsigned char payload[] = "12345678909";
    int valid = 0;

    for (size_t index = 0; index < count; index++) {
        valid += cpf_is_valid(payload, 11);
    }

    return valid;
}

int main(int argc, char **argv) {
    const char *path = argc > 1 ? argv[1] : "corpus.bin";
    FILE *handle = fopen(path, "rb");
    unsigned char *raw = NULL;
    long size = 0;
    size_t count = 0;
    size_t offset = 0;
    Input *corpus = NULL;
    const char *reps_env = getenv("BENCH_REPS");
    int reps = reps_env == NULL ? 7 : atoi(reps_env);
    double best = 1e18;
    int valid = 0;

    if (handle == NULL) {
        fprintf(stderr, "cannot open %s\n", path);

        return 1;
    }

    fseek(handle, 0, SEEK_END);
    size = ftell(handle);
    fseek(handle, 0, SEEK_SET);
    raw = malloc((size_t)size);

    if (fread(raw, 1, (size_t)size, handle) != (size_t)size) {
        fprintf(stderr, "short read\n");

        return 1;
    }

    fclose(handle);

    while (offset + 4 <= (size_t)size) {
        unsigned int length = (unsigned int)raw[offset] | ((unsigned int)raw[offset + 1] << 8)
                              | ((unsigned int)raw[offset + 2] << 16)
                              | ((unsigned int)raw[offset + 3] << 24);

        offset += 4 + length;
        count++;
    }

    corpus = malloc(count * sizeof(Input));
    offset = 0;
    count = 0;

    while (offset + 4 <= (size_t)size) {
        unsigned int length = (unsigned int)raw[offset] | ((unsigned int)raw[offset + 1] << 8)
                              | ((unsigned int)raw[offset + 2] << 16)
                              | ((unsigned int)raw[offset + 3] << 24);

        offset += 4;
        corpus[count].ptr = raw + offset;
        corpus[count].len = length;
        offset += length;
        count++;
    }

    for (int warm = 0; warm < 3; warm++) {
        run(corpus, count);
    }

    for (int rep = 0; rep < reps; rep++) {
        long started = now_ns();

        valid = run(corpus, count);

        double per_op = (double)(now_ns() - started) / (double)count;

        if (per_op < best) {
            best = per_op;
        }
    }

    printf("{\"lang\":\"c\",\"arm\":\"core-direct\",\"nsPerOp\":%.1f,\"valid\":%d}\n", best, valid);

    for (int warm = 0; warm < 3; warm++) {
        run_fixed(count);
    }

    best = 1e18;

    for (int rep = 0; rep < reps; rep++) {
        long started = now_ns();

        valid = run_fixed(count);

        double per_op = (double)(now_ns() - started) / (double)count;

        if (per_op < best) {
            best = per_op;
        }
    }

    printf("{\"lang\":\"c\",\"arm\":\"core-direct-callonly\",\"nsPerOp\":%.1f,\"valid\":%d}\n",
           best, valid);

    return 0;
}
