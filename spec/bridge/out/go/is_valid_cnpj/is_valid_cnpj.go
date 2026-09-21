// Code generated from spec/bridge/source/is-valid-cnpj.ts. DO NOT EDIT.

// Package is_valid_cnpj holds the generated is-valid-cnpj utility.
package is_valid_cnpj

import "brazilianutils/bridge/runtime"

var class0 = runtime.CharClass{{0x30, 0x39}, {0x41, 0x5a}}
var class1 = runtime.CharClass{{0x9, 0xd}, {0x20, 0x20}, {0x2d, 0x2f}, {0xa0, 0xa0}, {0x1680, 0x1680}, {0x2000, 0x200a}, {0x2028, 0x2029}, {0x202f, 0x202f}, {0x205f, 0x205f}, {0x3000, 0x3000}, {0xfeff, 0xfeff}}
var class2 = runtime.CharClass{{0x30, 0x39}}
var class3 = runtime.CharClass{{0x41, 0x5a}}
var class4 = runtime.CharClass{{0x30, 0x39}, {0x41, 0x5a}, {0x61, 0x7a}}

var PATTERN_ALPHANUMERIC_FORMAT = []runtime.PatternStep{
	{Class: class0, Min: 2, Max: 2, Capture: false},
	{Class: class1, Min: 0, Max: -1, Capture: false},
	{Class: class0, Min: 3, Max: 3, Capture: false},
	{Class: class1, Min: 0, Max: -1, Capture: false},
	{Class: class0, Min: 3, Max: 3, Capture: false},
	{Class: class1, Min: 0, Max: -1, Capture: false},
	{Class: class0, Min: 4, Max: 4, Capture: false},
	{Class: class1, Min: 0, Max: -1, Capture: false},
	{Class: class2, Min: 2, Max: 2, Capture: false},
}

var PATTERN_NUMERIC_FORMAT = []runtime.PatternStep{
	{Class: class2, Min: 2, Max: 2, Capture: false},
	{Class: class1, Min: 0, Max: -1, Capture: false},
	{Class: class2, Min: 3, Max: 3, Capture: false},
	{Class: class1, Min: 0, Max: -1, Capture: false},
	{Class: class2, Min: 3, Max: 3, Capture: false},
	{Class: class1, Min: 0, Max: -1, Capture: false},
	{Class: class2, Min: 4, Max: 4, Capture: false},
	{Class: class1, Min: 0, Max: -1, Capture: false},
	{Class: class2, Min: 2, Max: 2, Capture: false},
}

var FIRST_DIGIT_WEIGHTS = []int64{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
var SECOND_DIGIT_WEIGHTS = []int64{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}



// IsValidCnpjOptions Options of `isValidCnpj`.
type IsValidCnpjOptions struct {
	// Which CNPJ format to accept: `1` numeric only, `2` alphanumeric (default: `1`).
	Version *int64
}



// IsValidCnpj Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
//
// Supports both numeric (version 1) and alphanumeric (version 2) CNPJ formats, and accepts the
// usual mask characters (`.`, `-`, `/`) and whitespace around and between groups.
func IsValidCnpj(cnpj string, options *IsValidCnpjOptions) bool {
	var optionsVersion int64 = -1
	if options != nil && options.Version != nil {
		optionsVersion = *options.Version
	}
	trimmed := runtime.JsTrim(cnpj)
	if (optionsVersion == 2) {
		cleaned := runtime.Upper(runtime.KeepClass(class4, cnpj))
		if runtime.ClassHas(class3, cleaned) {
			if !runtime.PatternTest(PATTERN_ALPHANUMERIC_FORMAT, runtime.Upper(trimmed)) {
				return false
			}
			return hasValidChecksum(cleaned)
		}
	}
	numeric := runtime.KeepClass(class2, cnpj)
	if !runtime.PatternTest(PATTERN_NUMERIC_FORMAT, trimmed) {
		return false
	}
	if isRepeated(numeric) {
		return false
	}
	return hasValidChecksum(numeric)
}

// checkDigit Computes one CNPJ check digit from the base and its weight vector.
func checkDigit(base string, weights []int64) int64 {
	var sum int64 = 0
	for index := int64(0); index < int64(len(weights)); index++ {
		sum = (sum + ((int64(runtime.CodeAt(base, int(index))) - 48) * weights[index]))
	}
	var remainder int64 = (sum % 11)
	if (remainder < 2) {
		return 0
	}
	return (11 - remainder)
}

// hasValidChecksum Whether both check digits of a sanitized 14 character CNPJ match its base.
func hasValidChecksum(cnpj string) bool {
	if ((int64(runtime.CodeAt(cnpj, int(12))) - 48) != checkDigit(cnpj, FIRST_DIGIT_WEIGHTS)) {
		return false
	}
	return ((int64(runtime.CodeAt(cnpj, int(13))) - 48) == checkDigit(cnpj, SECOND_DIGIT_WEIGHTS))
}

// isRepeated Whether every character of the value is the same one.
func isRepeated(value string) bool {
	if (int64(runtime.Len(value)) == 0) {
		return false
	}
	for index := int64(1); index < int64(runtime.Len(value)); index++ {
		if (int64(runtime.CodeAt(value, int(index))) != int64(runtime.CodeAt(value, int(0)))) {
			return false
		}
	}
	return true
}
