// Go arms: handwritten source, generated source, the Rust core over wazero (a pure Go wasm
// runtime) and the same core over cgo.
package main

/*
#cgo LDFLAGS: -L${SRCDIR}/../../core/target/release -lbrutils_bench_core -Wl,-rpath,${SRCDIR}/../../core/target/release
#include <stddef.h>
int cpf_is_valid(const unsigned char *ptr, size_t len);
int cpf_is_valid_batch(const unsigned char *input, size_t input_len, unsigned char *output, size_t count);
*/
import "C"

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
	"unsafe"

	"github.com/tetratelabs/wazero"

	generated "brutilsbench/generated/cpf"
)

// --- arm: handwritten, the way a contributor would write it ---------------------------------

var shape = regexp.MustCompile(`^[0-9]{3}[\s.\-/]*[0-9]{3}[\s.\-/]*[0-9]{3}[\s.\-/]*[0-9]{2}$`)
var nonDigits = regexp.MustCompile(`[^0-9]`)

// The code points JavaScript's trim() strips; Go's strings.TrimSpace is a different set.
var jsSpace = string([]rune{0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff})

func checkDigit(base string) int {
	sum := 0
	weight := len(base) + 1

	for index := 0; index < len(base); index++ {
		sum += int(base[index]-'0') * weight
		weight--
	}

	digit := 11 - (sum % 11)

	if digit >= 10 {
		return 0
	}

	return digit
}

func handwrittenIsValid(cpf string) bool {
	if !shape.MatchString(strings.Trim(cpf, jsSpace)) {
		return false
	}

	digits := nonDigits.ReplaceAllString(cpf, "")

	if digits == strings.Repeat(digits[:1], 11) {
		return false
	}

	first, _ := strconv.Atoi(digits[9:10])
	second, _ := strconv.Atoi(digits[10:11])

	return first == checkDigit(digits[:9]) && second == checkDigit(digits[:10])
}

type result struct {
	Lang    string  `json:"lang"`
	Arm     string  `json:"arm"`
	NsPerOp float64 `json:"nsPerOp"`
	Valid   int     `json:"valid"`
}

func measure(arm string, corpus []string, run func([]string) int) result {
	reps := 7

	if value := os.Getenv("BENCH_REPS"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			reps = parsed
		}
	}

	for warm := 0; warm < 3; warm++ {
		run(corpus)
	}

	best := math.Inf(1)
	valid := 0

	for rep := 0; rep < reps; rep++ {
		start := time.Now()
		valid = run(corpus)
		elapsed := float64(time.Since(start).Nanoseconds()) / float64(len(corpus))

		if elapsed < best {
			best = elapsed
		}
	}

	return result{Lang: "go", Arm: arm, NsPerOp: math.Round(best*10) / 10, Valid: valid}
}

func pack(inputs []string) []byte {
	packed := make([]byte, 0, 16*len(inputs))
	header := make([]byte, 4)

	for _, value := range inputs {
		binary.LittleEndian.PutUint32(header, uint32(len(value)))
		packed = append(packed, header...)
		packed = append(packed, value...)
	}

	return packed
}

func main() {
	root, _ := filepath.Abs(filepath.Join("..", ".."))
	raw, err := os.ReadFile(filepath.Join(root, "corpus.json"))

	if err != nil {
		panic(err)
	}

	var corpus []string

	if err := json.Unmarshal(raw, &corpus); err != nil {
		panic(err)
	}

	results := []result{}

	results = append(results, measure("handwritten", corpus, func(inputs []string) int {
		valid := 0

		for _, value := range inputs {
			if handwrittenIsValid(value) {
				valid++
			}
		}

		return valid
	}))

	results = append(results, measure("generated", corpus, func(inputs []string) int {
		valid := 0

		for _, value := range inputs {
			if generated.IsValid(value) {
				valid++
			}
		}

		return valid
	}))

	// --- the shared core over wazero ---------------------------------------------------------
	ctx := context.Background()
	runtimeConfig := wazero.NewRuntimeConfigCompiler()
	wasmRuntime := wazero.NewRuntimeWithConfig(ctx, runtimeConfig)
	defer wasmRuntime.Close(ctx)

	wasmBytes, err := os.ReadFile(filepath.Join(root, "core/target/wasm32-unknown-unknown/release/brutils_bench_core.wasm"))

	if err != nil {
		panic(err)
	}

	instance, err := wasmRuntime.Instantiate(ctx, wasmBytes)

	if err != nil {
		panic(err)
	}

	memory := instance.Memory()
	wasmIsValid := instance.ExportedFunction("cpf_is_valid")
	wasmIsValidBatch := instance.ExportedFunction("cpf_is_valid_batch")
	arenaAlloc := instance.ExportedFunction("arena_alloc")

	allocate := func(size uint64) uint32 {
		out, err := arenaAlloc.Call(ctx, size)

		if err != nil {
			panic(err)
		}

		return uint32(out[0])
	}

	scratch := allocate(64)
	batchInput := allocate(1 << 18)
	batchOutput := allocate(uint64(len(corpus)))

	results = append(results, measure("wasm", corpus, func(inputs []string) int {
		valid := 0

		for _, value := range inputs {
			memory.Write(scratch, []byte(value))
			out, err := wasmIsValid.Call(ctx, uint64(scratch), uint64(len(value)))

			if err != nil {
				panic(err)
			}

			if out[0] == 1 {
				valid++
			}
		}

		return valid
	}))

	results = append(results, measure("wasm-batch", corpus, func(inputs []string) int {
		packed := pack(inputs)
		memory.Write(batchInput, packed)

		if _, err := wasmIsValidBatch.Call(ctx, uint64(batchInput), uint64(len(packed)), uint64(batchOutput), uint64(len(inputs))); err != nil {
			panic(err)
		}

		out, _ := memory.Read(batchOutput, uint32(len(inputs)))
		valid := 0

		for _, byteValue := range out {
			if byteValue == 1 {
				valid++
			}
		}

		return valid
	}))

	results = append(results, measure("wasm-callonly", corpus, func(inputs []string) int {
		valid := 0

		for range inputs {
			out, _ := wasmIsValid.Call(ctx, uint64(scratch), 11)

			if out[0] == 1 {
				valid++
			}
		}

		return valid
	}))

	// --- the shared core over cgo -------------------------------------------------------------
	results = append(results, measure("cgo", corpus, func(inputs []string) int {
		valid := 0

		for _, value := range inputs {
			bytes := []byte(value)

			if len(bytes) == 0 {
				continue
			}

			if C.cpf_is_valid((*C.uchar)(unsafe.Pointer(&bytes[0])), C.size_t(len(bytes))) == 1 {
				valid++
			}

			runtime.KeepAlive(bytes)
		}

		return valid
	}))

	results = append(results, measure("cgo-batch", corpus, func(inputs []string) int {
		packed := pack(inputs)
		output := make([]byte, len(inputs))

		C.cpf_is_valid_batch(
			(*C.uchar)(unsafe.Pointer(&packed[0])),
			C.size_t(len(packed)),
			(*C.uchar)(unsafe.Pointer(&output[0])),
			C.size_t(len(inputs)),
		)

		valid := 0

		for _, byteValue := range output {
			if byteValue == 1 {
				valid++
			}
		}

		return valid
	}))

	payload := []byte("12345678909")

	results = append(results, measure("cgo-callonly", corpus, func(inputs []string) int {
		valid := 0

		for range inputs {
			if C.cpf_is_valid((*C.uchar)(unsafe.Pointer(&payload[0])), 11) == 1 {
				valid++
			}
		}

		return valid
	}))

	for _, entry := range results {
		line, _ := json.Marshal(entry)
		fmt.Println(string(line))
	}
}
