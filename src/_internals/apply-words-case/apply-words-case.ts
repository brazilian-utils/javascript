import type { WordsCase } from "../number-to-words/number-to-words";

/**
 * Applies a `WordsCase` to a "por extenso" string already written out in lowercase.
 *
 * `"sentence"` capitalizes only the first letter; `"upper"` uppercases the whole string with
 * `toLocaleUpperCase("pt-BR")`, which keeps accents intact ("três" -> "TRÊS"). Any value other
 * than `"sentence"` or `"upper"` (including `"lower"`, `undefined` or an invalid value) returns
 * `text` unchanged, since it is already written in lowercase.
 *
 * @param {string} text - The lowercase "por extenso" string to transform.
 * @param {WordsCase} [wordsCase] - The case to apply. Defaults to `"lower"` (no change).
 * @returns {string} `text` with the requested case applied.
 *
 * @example
 * ```typescript
 * applyWordsCase("três reais"); // "três reais"
 * applyWordsCase("três reais", "sentence"); // "Três reais"
 * applyWordsCase("três reais", "upper"); // "TRÊS REAIS"
 * ```
 */
export const applyWordsCase = (text: string, wordsCase?: WordsCase): string => {
	if (wordsCase === "upper") return text.toLocaleUpperCase("pt-BR");
	if (wordsCase === "sentence") return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);

	return text;
};
