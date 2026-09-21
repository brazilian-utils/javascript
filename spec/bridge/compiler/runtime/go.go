// Package runtime holds everything the generated Go code needs that is not plain syntax.
//
// Strings are indexed by code point, not by byte, so that the generated code means the same
// thing it does in the other targets.
package runtime

import "strings"

// CharClass is a set of code points, as sorted non overlapping ranges.
type CharClass [][2]rune

// PatternStep repeats a class between Min and Max times; Max -1 means unbounded.
type PatternStep struct {
	Class   CharClass
	Min     int
	Max     int
	Capture bool
}

// The code points JavaScript's trim() strips. Go's strings.TrimSpace is a different set.
var jsWhitespace = CharClass{
	{0x09, 0x0d}, {0x20, 0x20}, {0xa0, 0xa0}, {0x1680, 0x1680}, {0x2000, 0x200a},
	{0x2028, 0x2029}, {0x202f, 0x202f}, {0x205f, 0x205f}, {0x3000, 0x3000}, {0xfeff, 0xfeff},
}

// InClass reports whether a code point belongs to a class.
func InClass(class CharClass, code rune) bool {
	for _, span := range class {
		if code >= span[0] && code <= span[1] {
			return true
		}
	}

	return false
}

// Len counts the code points of a value.
func Len(value string) int {
	return len([]rune(value))
}

// CodeAt reads one code point, or -1 when the index is out of range.
func CodeAt(value string, index int) int {
	if index < 0 {
		return -1
	}

	position := 0

	for _, char := range value {
		if position == index {
			return int(char)
		}

		position++
	}

	return -1
}

// Slice takes the code points between two indexes.
func Slice(value string, from int, to int) string {
	runes := []rune(value)

	if from < 0 {
		from = 0
	}

	if to > len(runes) {
		to = len(runes)
	}

	if from >= to {
		return ""
	}

	return string(runes[from:to])
}

// ClassHas reports whether any character of the value belongs to the class.
func ClassHas(class CharClass, value string) bool {
	for _, char := range value {
		if InClass(class, char) {
			return true
		}
	}

	return false
}

// KeepClass keeps only the characters of the value that belong to the class.
func KeepClass(class CharClass, value string) string {
	var kept strings.Builder

	for _, char := range value {
		if InClass(class, char) {
			kept.WriteRune(char)
		}
	}

	return kept.String()
}

// PatternTest runs a compiled pattern against the whole value, greedily and without backtracking.
func PatternTest(steps []PatternStep, value string) bool {
	runes := []rune(value)
	index := 0

	for _, step := range steps {
		count := 0

		for (step.Max < 0 || count < step.Max) && index < len(runes) && InClass(step.Class, runes[index]) {
			index++
			count++
		}

		if count < step.Min {
			return false
		}
	}

	return index == len(runes)
}

// JsTrim strips the code points JavaScript's trim() strips.
func JsTrim(value string) string {
	return strings.TrimFunc(value, func(char rune) bool { return InClass(jsWhitespace, char) })
}

// PadStart left pads the value with a filler up to a length, counted in code points.
func PadStart(value string, length int, filler string) string {
	missing := length - Len(value)

	if missing <= 0 {
		return value
	}

	return strings.Repeat(filler, missing) + value
}

// Upper uppercases a value.
func Upper(value string) string {
	return strings.ToUpper(value)
}

// Repeat repeats a value.
func Repeat(value string, times int) string {
	if times <= 0 {
		return ""
	}

	return strings.Repeat(value, times)
}

// DataGroup names the rows of one key of a dataset.
type DataGroup struct {
	Key  string
	Rows []int
}

// Dataset holds the rows of a table in the two orders the generated code asks for.
type Dataset struct {
	all   [][]string
	byKey map[string][][]string
}

// NewDataset materialises a dataset, resolving both orders once.
func NewDataset(rows [][]string, groups []DataGroup, fullOrder []int) *Dataset {
	table := &Dataset{all: make([][]string, 0, len(fullOrder)), byKey: make(map[string][][]string, len(groups))}

	for _, index := range fullOrder {
		table.all = append(table.all, rows[index])
	}

	for _, group := range groups {
		of := make([][]string, 0, len(group.Rows))

		for _, index := range group.Rows {
			of = append(of, rows[index])
		}

		table.byKey[group.Key] = of
	}

	return table
}

// DataAll returns every row of a dataset, in the baked full order.
func DataAll(table *Dataset) [][]string {
	return table.all
}

// DataRows returns the rows whose first column is the key given, empty when the key is unknown.
func DataRows(table *Dataset, key string) [][]string {
	if rows, ok := table.byKey[key]; ok {
		return rows
	}

	return [][]string{}
}
