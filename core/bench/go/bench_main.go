// Benchmarks the generated Go core against brazilian-utils/go, the handwritten package it
// replaces. Run with `go run .` from this directory (see core/bench/README.md).
//
// Convention shared by every language harness in this directory: 20,000-iteration warm-up,
// 200,000 timed iterations, same process, same inputs, 1.5x budget, ratio reported as
// generated / handwritten.
//
// Fairness note on the two variants below. Unlike the Python and (eventually) Rust ports, the Go
// port's public API (cpf.IsValid, cnpj.IsValid, cpf.Format, cnpj.Format) always normalizes its
// input itself, via helpers.OnlyNumbers -- there is no lower-level entry point that skips it. So:
//
//   - "full-pipeline": both sides receive the same raw, masked input, and each does its own
//     normalization plus validation/formatting. This is the comparison a real caller of either
//     library experiences, and it is fair because both sides are doing equivalent work.
//   - "normalized": both sides receive the same pre-stripped digit-only input. This isolates most
//     of the checksum/formatting work from the mask-stripping work, but not all of it: the Go
//     port's public functions call helpers.OnlyNumbers unconditionally, so even here the
//     handwritten side still compiles a POSIX regex and re-joins a []string on every call, a cost
//     the generated side does not pay once its input is already digits-only. This is reported as
//     an observation about what the "normalized" numbers contain, not a criticism of the port --
//     it is read-only and nothing here suggests changing it.
//
// CNPJ is compared at version "1" (numeric) only: brazilian-utils/go has no alphanumeric CNPJ
// support at all (OnlyNumbers strips letters before the length check), so there is no fair way to
// exercise the version "2" path against it.
//
// formatCurrency has no full-pipeline shape at all: the generated core's contract
// (core/docs/contracts.md) always takes an already-scaled Decimal<2> int, never a raw float --
// scaling is DX work, done once outside the core, on both sides equally here. It is therefore
// "normalized" for the same reason the CPF/CNPJ normalized rows are: pre-processed input on both
// sides. currency.FormatCurrency also has no symbol option (it always prefixes "R$"), so the
// generated side is called with symbol=true to match.
//
// getHolidays and isBusinessDay are not covered for Go: brazilian-utils/go's date package exposes
// only date.IsHoliday(time.Time, uf) -- a single-day boolean check, not a function returning a
// year's list, and it has no weekend/business-day concept at all. There is no fair counterpart, so
// both rows are left out; see core/bench/README.md.
//
// generateCpf and generateCnpj draw at random, so there is no fixed value to compare for equality;
// see the README for the "does every value validate" rule used instead. NextU32 below is backed by
// math/rand, the same non-cryptographic generator brazilian-utils/go's own cpf.Generate and
// cnpj.Generate use, so the RNG choice itself is not what a lopsided ratio would be measuring here.
package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"runtime"
	"time"

	core "coreout"
	hcnpj "github.com/brazilian-utils/go/cnpj"
	hcpf "github.com/brazilian-utils/go/cpf"
	hcurrency "github.com/brazilian-utils/go/currency"
)

// benchCapabilities is the "real" (non-fixture) environment the generated generateCpf/generateCnpj
// need: only NextU32 is ever called by them, but the Capabilities interface requires all four
// methods, so the other three are stubs that panic if ever reached.
type benchCapabilities struct{}

func (benchCapabilities) Request(request core.HttpRequest) *core.HttpResponse {
	panic("not used by generateCpf/generateCnpj")
}
func (benchCapabilities) Now() int              { panic("not used by generateCpf/generateCnpj") }
func (benchCapabilities) Sleep(milliseconds int) { panic("not used by generateCpf/generateCnpj") }
func (benchCapabilities) NextU32() int          { return int(rand.Uint32()) }

const budget = 1.5
const warmup = 20_000
const iterations = 200_000

// Raw, masked test vectors -- the numeric-only subset of the ones typescript.ts and python.py
// use, since the Go port has no alphanumeric CNPJ support (see package doc above).
var rawCPFs = []string{"123.456.789-09", "12345678909", "00000000000", "529.982.247-25"}
var rawCNPJs = []string{"12.345.678/0001-95", "12345678000195", "00000000000000"}

func onlyDigits(s string) string {
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		if s[i] >= '0' && s[i] <= '9' {
			out = append(out, s[i])
		}
	}
	return string(out)
}

func mapStrings(in []string, f func(string) string) []string {
	out := make([]string, len(in))
	for i, v := range in {
		out[i] = f(v)
	}
	return out
}

var normalizedCPFs = mapStrings(rawCPFs, onlyDigits)
var normalizedCNPJs = mapStrings(rawCNPJs, onlyDigits)

// Raw floats, the shape currency.FormatCurrency's own callers use. Includes a negative value on
// purpose -- see the README's "formatCurrency" honesty note for what that turns up.
var currencyValues = []float64{0, 1234.56, -1234.56, 0.5, 999999.99, 10}

func toCents(value float64) int {
	if value < 0 {
		return -int(-value*100 + 0.5)
	}
	return int(value*100 + 0.5)
}

type row struct {
	Utility       string  `json:"utility"`
	Variant       string  `json:"variant"`
	HandwrittenMs float64 `json:"handwrittenMs"`
	GeneratedMs   float64 `json:"generatedMs"`
	Iterations    int     `json:"iterations"`
}

type disagreement struct {
	Utility     string      `json:"utility"`
	Variant     string      `json:"variant"`
	Input       interface{} `json:"input"`
	Handwritten interface{} `json:"handwritten"`
	Generated   interface{} `json:"generated"`
}

var rows = []row{}
var disagreements = []disagreement{}

func checkAgreementBool(utility, variant string, inputs []string, handwritten, generated func(string) bool) {
	for _, input := range inputs {
		a := handwritten(input)
		b := generated(input)
		if a != b {
			disagreements = append(disagreements, disagreement{utility, variant, input, a, b})
		}
	}
}

func checkAgreementString(utility, variant string, inputs []string, handwritten, generated func(string) string) {
	for _, input := range inputs {
		a := handwritten(input)
		b := generated(input)
		if a != b {
			disagreements = append(disagreements, disagreement{utility, variant, input, a, b})
		}
	}
}

func measure(run func()) float64 {
	for i := 0; i < warmup; i++ {
		run()
	}
	started := time.Now()
	for i := 0; i < iterations; i++ {
		run()
	}
	return float64(time.Since(started)) / float64(time.Millisecond)
}

func compareBool(utility, variant string, inputs []string, handwritten, generated func(string) bool) {
	checkAgreementBool(utility, variant, inputs, handwritten, generated)

	fmt.Printf("%s (%s)\n", utility, variant)
	cursor := 0
	handwrittenMs := measure(func() {
		handwritten(inputs[cursor%len(inputs)])
		cursor++
	})
	fmt.Printf("  handwritten                  %.1f ms\n", handwrittenMs)

	cursor = 0
	generatedMs := measure(func() {
		generated(inputs[cursor%len(inputs)])
		cursor++
	})
	fmt.Printf("  generated                    %.1f ms\n", generatedMs)

	rows = append(rows, row{utility, variant, handwrittenMs, generatedMs, iterations})
}

func compareString(utility, variant string, inputs []string, handwritten, generated func(string) string) {
	checkAgreementString(utility, variant, inputs, handwritten, generated)

	fmt.Printf("%s (%s)\n", utility, variant)
	cursor := 0
	handwrittenMs := measure(func() {
		handwritten(inputs[cursor%len(inputs)])
		cursor++
	})
	fmt.Printf("  handwritten                  %.1f ms\n", handwrittenMs)

	cursor = 0
	generatedMs := measure(func() {
		generated(inputs[cursor%len(inputs)])
		cursor++
	})
	fmt.Printf("  generated                    %.1f ms\n", generatedMs)

	rows = append(rows, row{utility, variant, handwrittenMs, generatedMs, iterations})
}

func compareCurrency(utility, variant string, values []float64, handwritten func(float64) string, generated func(float64) string) {
	for _, v := range values {
		a := handwritten(v)
		b := generated(v)
		if a != b {
			disagreements = append(disagreements, disagreement{utility, variant, v, a, b})
		}
	}

	fmt.Printf("%s (%s)\n", utility, variant)
	cursor := 0
	handwrittenMs := measure(func() {
		handwritten(values[cursor%len(values)])
		cursor++
	})
	fmt.Printf("  handwritten                  %.1f ms\n", handwrittenMs)

	cursor = 0
	generatedMs := measure(func() {
		generated(values[cursor%len(values)])
		cursor++
	})
	fmt.Printf("  generated                    %.1f ms\n", generatedMs)

	rows = append(rows, row{utility, variant, handwrittenMs, generatedMs, iterations})
}

const generateSamples = 500

// checkGeneratorAgreement implements the README's generator agreement rule: generateCpf and
// generateCnpj draw at random, so there is nothing to compare for equality. Instead, every value
// either side produces must validate under BOTH validators -- its own port's and the generated
// core's -- before either side is timed.
func checkGeneratorAgreement(utility, variant string, handwrittenGenerate func() string, handwrittenIsValid func(string) bool, generatedGenerate func() string, generatedIsValid func(string) bool) {
	for i := 0; i < generateSamples; i++ {
		fromHandwritten := handwrittenGenerate()
		if !handwrittenIsValid(fromHandwritten) {
			disagreements = append(disagreements, disagreement{utility, variant, fromHandwritten, "rejected by its own port's validator", "n/a"})
		}
		if !generatedIsValid(fromHandwritten) {
			disagreements = append(disagreements, disagreement{utility, variant, fromHandwritten, "valid (own validator)", "rejected by the generated core's validator"})
		}

		fromGenerated := generatedGenerate()
		if !generatedIsValid(fromGenerated) {
			disagreements = append(disagreements, disagreement{utility, variant, fromGenerated, "n/a", "rejected by the generated core's own validator"})
		}
		if !handwrittenIsValid(fromGenerated) {
			disagreements = append(disagreements, disagreement{utility, variant, fromGenerated, "rejected by its own port's validator", "valid (own validator)"})
		}
	}
}

func compareGenerate(utility string, handwrittenGenerate func() string, generatedGenerate func() string) {
	variant := "generate"
	fmt.Printf("%s (%s)\n", utility, variant)
	handwrittenMs := measure(func() { handwrittenGenerate() })
	fmt.Printf("  handwritten                  %.1f ms\n", handwrittenMs)
	generatedMs := measure(func() { generatedGenerate() })
	fmt.Printf("  generated                    %.1f ms\n", generatedMs)
	rows = append(rows, row{utility, variant, handwrittenMs, generatedMs, iterations})
}

func main() {
	compareBool("isValidCpf", "full-pipeline", rawCPFs, hcpf.IsValid, core.IsValidCpf)
	compareBool("isValidCpf", "normalized", normalizedCPFs, hcpf.IsValid, core.IsValidCpf)

	compareBool("isValidCnpj", "full-pipeline", rawCNPJs, hcnpj.IsValid, func(v string) bool { return core.IsValidCnpj(v, "1") })
	compareBool("isValidCnpj", "normalized", normalizedCNPJs, hcnpj.IsValid, func(v string) bool { return core.IsValidCnpj(v, "1") })

	compareString("formatCnpj", "full-pipeline", rawCNPJs, hcnpj.Format, func(v string) string {
		return core.FormatCnpj(v, core.FormatCnpjOptions{Pad: false, Version: "1", Obfuscate: false})
	})

	compareCurrency("formatCurrency", "normalized", currencyValues, hcurrency.FormatCurrency, func(v float64) string {
		return core.FormatCurrency(toCents(v), true)
	})

	env := benchCapabilities{} // built once, like a real caller would, then reused
	// cnpj.Generate(0) defaults to branch=1 (fixed), not a random branch like the generated core --
	// irrelevant here, since only validity is being checked, not equality; see the README.
	checkGeneratorAgreement("generateCpf", "generate", hcpf.Generate, hcpf.IsValid, func() string { return core.GenerateCpf(env) }, core.IsValidCpf)
	compareGenerate("generateCpf", hcpf.Generate, func() string { return core.GenerateCpf(env) })

	checkGeneratorAgreement("generateCnpj", "generate", func() string { return hcnpj.Generate(0) }, hcnpj.IsValid, func() string { return core.GenerateCnpj(env) }, func(v string) bool { return core.IsValidCnpj(v, "1") })
	compareGenerate("generateCnpj", func() string { return hcnpj.Generate(0) }, func() string { return core.GenerateCnpj(env) })

	fmt.Println("\n| utility | variant | handwritten | generated | ratio | budget |")
	fmt.Println("| --- | --- | --- | --- | --- | --- |")
	for _, r := range rows {
		ratio := r.GeneratedMs / r.HandwrittenMs
		status := "within"
		if ratio > budget {
			status = "OVER"
		}
		fmt.Printf("| `%s` | %s | %.1f ms | %.1f ms | %.2fx | %s %.1fx |\n", r.Utility, r.Variant, r.HandwrittenMs, r.GeneratedMs, ratio, status, budget)
	}

	if len(disagreements) > 0 {
		fmt.Println("\nDISAGREEMENTS:")
		for _, d := range disagreements {
			fmt.Printf("  %s (%s) input=%v handwritten=%v generated=%v\n", d.Utility, d.Variant, d.Input, d.Handwritten, d.Generated)
		}
	}

	skipped := []map[string]string{
		{
			"utility": "formatCnpj (obfuscate/pad/version 2)",
			"reason":  "the Go port's Format has no pad, obfuscate or alphanumeric option, so only the plain full-pipeline case is comparable",
		},
		{
			"utility": "getHolidays",
			"reason":  "brazilian-utils/go's date package has no getHolidays: only date.IsHoliday(time.Time, uf), a single-day boolean check, not a function returning a year's list. No comparable counterpart.",
		},
		{
			"utility": "isBusinessDay",
			"reason":  "brazilian-utils/go has no isBusinessDay or business-day/weekend concept at all -- only date.IsHoliday, which does not consider weekends. No comparable counterpart.",
		},
	}
	fmt.Println("\nSKIPPED:")
	for _, s := range skipped {
		fmt.Printf("  %s: %s\n", s["utility"], s["reason"])
	}

	result := map[string]interface{}{
		"language": "go",
		"toolchain": map[string]string{
			"go": runtime.Version(),
		},
		"rows":          rows,
		"disagreements": disagreements,
		"skipped":       skipped,
	}
	out, err := json.Marshal(result)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("BENCH_JSON %s\n", out)
}
