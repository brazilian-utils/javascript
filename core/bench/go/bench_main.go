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
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"time"

	core "coreout"
	hcnpj "github.com/brazilian-utils/go/cnpj"
	hcpf "github.com/brazilian-utils/go/cpf"
)

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

func main() {
	compareBool("isValidCpf", "full-pipeline", rawCPFs, hcpf.IsValid, core.IsValidCpf)
	compareBool("isValidCpf", "normalized", normalizedCPFs, hcpf.IsValid, core.IsValidCpf)

	compareBool("isValidCnpj", "full-pipeline", rawCNPJs, hcnpj.IsValid, func(v string) bool { return core.IsValidCnpj(v, "1") })
	compareBool("isValidCnpj", "normalized", normalizedCNPJs, hcnpj.IsValid, func(v string) bool { return core.IsValidCnpj(v, "1") })

	compareString("formatCnpj", "full-pipeline", rawCNPJs, hcnpj.Format, func(v string) string {
		return core.FormatCnpj(v, core.FormatCnpjOptions{Pad: false, Version: "1", Obfuscate: false})
	})

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
