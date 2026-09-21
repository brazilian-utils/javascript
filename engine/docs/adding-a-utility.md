# Adding a utility

A utility is one exported function in one file at the source root. Everything it needs that is not
an intrinsic goes under `source/lib/`.

## 1. Measure the behavior first

Write down what the existing implementation does, including the parts that look like accidents:
the exact separator, whether a mask character is allowed between groups, what an empty string
answers. `core/docs/contracts.md` is where those measurements live. Never invent behavior.

Split the measurement in two: what the **core** does, and what the **DX** does (coercing a number
to a string, defaulting an option, converting a host `Date`). The core takes already-normalized
values.

## 2. Write the source

```ts
// source/is-valid-example.ts
import { digitAt, keepDigits } from "./lib/digits";

const FORMAT = /^[0-9]{5}$/;

/**
 * One sentence about what this validates, and one about what the DX still owes it.
 */
export function isValidExample(value: string): boolean {
	if (!re.test(FORMAT, str.trim(value))) {
		return false;
	}

	const digits = keepDigits(value);

	if (digits.length !== 5) {
		return false;
	}

	return digitAt(digits, 4) === 7;
}
```

Three habits that make the checker's job possible:

- **guard, don't assert.** A guard (`if (value.length !== 5) return false;`) narrows the type; a
  predicate function does not, because the checker reads a guard, not a called function.
- **annotate an accumulator** with the range you expect (`let sum: IntRange<0, 1000> = 0;`). The
  checker proves the real range and tells you when it disagrees.
- **let a helper be a helper.** Library code is specialized per call site, so a helper that takes
  `Digits` will be checked against the exact length its caller proved.

## 3. Check, generate, verify

```sh
npm run check          # types, ranges, refinements, effects
npm run dump           # the annotated Core, for reviewing what was proven
npm run build          # every target, in both idiom modes
npm run verify         # everything, including conformance
```

If the checker refuses something, read the suggestion: most rejections name the construct to write
instead. If it refuses something that is genuinely expressible, that is a bug or a missing
refinement — open it as one rather than weakening the checker.

## 4. Add conformance cases

In `conformance/cases.ts`, add the vectors that pin the documented edges, plus seeded random
inputs over the shape the DX really passes. In `conformance/run.ts`, add the published
implementation to `REFERENCE`, with the DX conversion written explicitly — that conversion is part
of the contract you measured.

## 5. Review the generated code

Read `out/typescript/<utility>.ts`, `out/python/<utility>.py` and `out/go/<utility>.go`. They
should look like code a fluent author would have written. If one of them does not, the answer is
usually a missing candidate in that target's capability table, not a change to the source.

`out/<target>/LOWERING.md` says which lowering was selected for every operation and why.
