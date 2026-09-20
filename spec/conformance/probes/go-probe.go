// Runs the published Go module against the corpus on stdin, printing the results as JSON.
//
// It is built from a temporary module with a `replace` pointing at the checkout, so it needs
// no network access.
package main

import (
	"encoding/json"
	"os"

	"github.com/brazilian-utils/go/cpf"
	"github.com/brazilian-utils/go/pis"
)

func main() {
	var corpus []string

	if err := json.NewDecoder(os.Stdin).Decode(&corpus); err != nil {
		panic(err)
	}

	results := map[string]any{}
	validCpf := make([]bool, len(corpus))
	validPis := make([]bool, len(corpus))
	formatted := make([]string, len(corpus))

	for index, value := range corpus {
		validCpf[index] = cpf.IsValid(value)
		validPis[index] = pis.IsValid(value)
		formatted[index] = cpf.Format(value)
	}

	results["is-valid-cpf"] = validCpf
	results["is-valid-pis"] = validPis
	results["format-cpf"] = formatted

	if err := json.NewEncoder(os.Stdout).Encode(results); err != nil {
		panic(err)
	}
}
