// Package runtime holds everything the generated Go code needs that is not plain syntax.
//
// Strings are indexed by code point, not by byte, so that the generated code means the same
// thing it does in the other targets.
package runtime

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
)

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

// HttpResponse is what a provider answered: the status, whether it counts as a success, and
// the decoded body.
type HttpResponse struct {
	Status int64
	Ok     bool
	Body   any
}

// httpTarget is the origin every request is sent to instead of its own, when one is set.
//
// This is the conformance hook: the cross language replay points all seven targets at one
// local server, the same way the JavaScript suite points fetch at a mock.
func httpTarget(url string) string {
	base := os.Getenv("BRUTILS_BRIDGE_HTTP_ORIGIN")

	if base == "" {
		return url
	}

	return base + "/" + originPrefix.ReplaceAllString(url, "")
}

var originPrefix = regexp.MustCompile(`^https?://`)

var httpClient = &http.Client{Timeout: 15 * time.Second}

// HttpGet performs an HTTP GET, retrying a transient transport failure with a linear backoff.
func HttpGet(url string, retries int64, retryDelayMs int64) *HttpResponse {
	target := httpTarget(url)

	for attempt := int64(0); ; attempt++ {
		answer, err := httpClient.Get(target)

		if err != nil {
			if attempt >= retries {
				return &HttpResponse{Status: 0, Ok: false, Body: nil}
			}

			time.Sleep(time.Duration(retryDelayMs*(attempt+1)) * time.Millisecond)

			continue
		}

		raw, readErr := io.ReadAll(answer.Body)
		answer.Body.Close()

		var body any

		if readErr == nil {
			if json.Unmarshal(raw, &body) != nil {
				body = nil
			}
		}

		status := int64(answer.StatusCode)

		return &HttpResponse{Status: status, Ok: status >= 200 && status < 300, Body: body}
	}
}

// ListHas reports whether a list holds a value.
func ListHas(items []string, value string) bool {
	for _, item := range items {
		if item == value {
			return true
		}
	}

	return false
}

// jsonField reads one field of a JSON body, treating anything that is not an object as empty.
func jsonField(body any, key string) any {
	object, ok := body.(map[string]any)

	if !ok {
		return nil
	}

	return object[key]
}

// JsonString reads a string field of a JSON body, answering "" when it is missing.
func JsonString(body any, key string) string {
	found, ok := jsonField(body, key).(string)

	if !ok {
		return ""
	}

	return found
}

// JsonInt reads an integer field of a JSON body, answering -1 when it is missing.
func JsonInt(body any, key string) int64 {
	found, ok := jsonField(body, key).(float64)

	if !ok {
		return -1
	}

	return int64(found)
}

// JsonTruthy reports whether a field of a JSON body is truthy, the way JavaScript reads it.
func JsonTruthy(body any, key string) bool {
	switch found := jsonField(body, key).(type) {
	case nil:
		return false
	case bool:
		return found
	case float64:
		return found != 0
	case string:
		return found != ""
	default:
		return true
	}
}

// JsonIsTrue reports whether a field of a JSON body is exactly true.
func JsonIsTrue(body any, key string) bool {
	found, ok := jsonField(body, key).(bool)

	return ok && found
}

// Error is a failure raised by the generated code. Go has no exception hierarchy, so the kinds
// the source declared travel with the value.
type Error struct {
	Kinds   []string
	Message string
}

// Error returns the message.
func (e *Error) Error() string {
	return e.Message
}

// Kind returns the most specific kind of the failure.
func (e *Error) Kind() string {
	if len(e.Kinds) == 0 {
		return ""
	}

	return e.Kinds[0]
}

// NewError builds a failure of the given kinds.
func NewError(kinds []string, message string) error {
	return &Error{Kinds: kinds, Message: message}
}

// IsKind reports whether an error is of a kind, its bases included.
func IsKind(err error, kind string) bool {
	var found *Error

	if !errors.As(err, &found) {
		return false
	}

	for _, candidate := range found.Kinds {
		if candidate == kind {
			return true
		}
	}

	return false
}

// Outcome is what one attempt of a race ended with.
type Outcome struct {
	Ok    bool
	Value any
	Kinds []string
}

// Attempts holds the running attempts of a race and what each one ended with.
type Attempts struct {
	settled  chan Outcome
	total    int
	Outcomes []Outcome
}

// StartAll starts one attempt per item, all at once.
//
// This is the only concurrency primitive of the portable subset: the author never writes a
// goroutine, and the emitter never has to decide where one belongs.
func StartAll(run func(string, string) (any, error), items []string, argument string) *Attempts {
	attempts := &Attempts{settled: make(chan Outcome, len(items)), total: len(items)}

	for _, item := range items {
		go func(item string) {
			value, err := run(item, argument)

			if err != nil {
				kinds := []string{}

				var raised *Error

				if errors.As(err, &raised) {
					kinds = raised.Kinds
				}

				attempts.settled <- Outcome{Ok: false, Kinds: kinds}

				return
			}

			attempts.settled <- Outcome{Ok: true, Value: value}
		}(item)
	}

	return attempts
}

// FirstSuccessOf returns the value of the first attempt that succeeds, or the zero value once
// every attempt has failed.
func FirstSuccessOf[T any](attempts *Attempts) T {
	var zero T

	for len(attempts.Outcomes) < attempts.total {
		outcome := <-attempts.settled
		attempts.Outcomes = append(attempts.Outcomes, outcome)

		if outcome.Ok {
			found, ok := outcome.Value.(T)

			if ok {
				return found
			}

			return zero
		}
	}

	return zero
}

// AnyFailedWith reports whether any attempt failed with a given error kind.
func AnyFailedWith(attempts *Attempts, kind string) bool {
	for _, outcome := range attempts.Outcomes {
		if outcome.Ok {
			continue
		}

		for _, candidate := range outcome.Kinds {
			if candidate == kind {
				return true
			}
		}
	}

	return false
}
