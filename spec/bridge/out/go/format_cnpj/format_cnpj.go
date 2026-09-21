// Code generated from spec/bridge/source/format-cnpj.ts. DO NOT EDIT.

// Package format_cnpj holds the generated format-cnpj utility.
package format_cnpj

import "brazilianutils/bridge/runtime"

var class0 = runtime.CharClass{{0x30, 0x39}}
var class1 = runtime.CharClass{{0x30, 0x39}, {0x41, 0x5a}, {0x61, 0x7a}}



const PATTERN = "00.000.000/0000-00"
const OBFUSCATED_PATTERN = "**.000.000/0000-**"



// FormatCnpjOptions Options of `formatCnpj`.
type FormatCnpjOptions struct {
	// Whether to left pad the value with zeros up to the number of slots in the pattern (default: `false`).
	Pad *bool
	// Which CNPJ format to read: `1` numeric only, `2` alphanumeric (default: `1`).
	Version *int64
	// Whether to hide the first 2 digits and the 2 check digits with `*` (default: `false`).
	Obfuscate *bool
}



// FormatCnpj Formats a given CNPJ (Cadastro Nacional da Pessoa Jurídica) value.
func FormatCnpj(value string, options *FormatCnpjOptions) string {
	var optionsVersion int64 = -1
	if options != nil && options.Version != nil {
		optionsVersion = *options.Version
	}
	var optionsObfuscate bool = false
	if options != nil && options.Obfuscate != nil {
		optionsObfuscate = *options.Obfuscate
	}
	var optionsPad bool = false
	if options != nil && options.Pad != nil {
		optionsPad = *options.Pad
	}
	text := value
	cleaned := runtime.KeepClass(class0, text)
	if (optionsVersion == 2) {
		cleaned = runtime.Upper(runtime.KeepClass(class1, text))
	}
	pattern := PATTERN
	if optionsObfuscate {
		pattern = OBFUSCATED_PATTERN
	}
	return layout(cleaned, pattern, optionsPad)
}

// layout Lays a value over a pattern.
func layout(value string, pattern string, pad bool) string {
	var slots int64 = 0
	for index := int64(0); index < int64(runtime.Len(pattern)); index++ {
		if ((int64(runtime.CodeAt(pattern, int(index))) == 48) || (int64(runtime.CodeAt(pattern, int(index))) == 42)) {
			slots = (slots + 1)
		}
	}
	padded := value
	if pad {
		padded = runtime.PadStart(value, int(slots), "0")
	}
	formatted := ""
	var cursor int64 = 0
	for index := int64(0); index < int64(runtime.Len(pattern)); index++ {
		var slot int64 = int64(runtime.CodeAt(pattern, int(index)))
		if ((slot == 48) || (slot == 42)) {
			if (cursor >= int64(runtime.Len(padded))) {
				return formatted
			}
			if (slot == 42) {
				formatted = (formatted + "*")
			} else {
				formatted = (formatted + runtime.Slice(padded, int(cursor), int((cursor + 1))))
			}
			cursor = (cursor + 1)
		} else {
			if (cursor < int64(runtime.Len(padded))) {
				formatted = (formatted + runtime.Slice(pattern, int(index), int((index + 1))))
			}
		}
	}
	return formatted
}
