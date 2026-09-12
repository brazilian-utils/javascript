import { PREPOSITIONS, SEPARATOR_REGEX, WHITESPACE_REGEX } from "./constants";

export type CapitalizeOptions = {
	/** Words to keep in lower case when they are not the first word (default: the Portuguese prepositions). */
	lowerCaseWords?: string[];
	/** Words to keep in upper case wherever they appear (default: `[]`). */
	upperCaseWords?: string[];
};

/**
 * Capitalizes a given string according to specific rules for lower-case and upper-case words.
 *
 * Words are separated by whitespace, by `-` and by `/`, so `"MOGI-GUAÇU"` becomes
 * `"Mogi-Guaçu"` and `"SANTANA/RS"` becomes `"Santana/Rs"`. Hyphens and slashes are kept
 * where they are, while every run of whitespace (spaces, tabs, newlines) collapses into a
 * single space and the leading and trailing whitespace is dropped.
 *
 * - Words listed in `lowerCaseWords` (default: `PREPOSITIONS`) will be converted to lower case, except for the first word.
 * - Words listed in `upperCaseWords` will be converted to upper case (none by default). The
 *   comparison ignores the case of the words given in both lists.
 * - All other words will be capitalized (first letter upper case, rest lower case).
 *
 * @param value - The input string to be capitalized.
 * @param options - Optional configuration for capitalization.
 * @param options.lowerCaseWords - Array of words to keep in lower case (default: `PREPOSITIONS`).
 * @param options.upperCaseWords - Array of words to keep in upper case (default: `[]`).
 * @returns The capitalized string according to the specified rules.
 *
 * @example
 * ```typescript
 * capitalize("JOSÉ DA SILVA"); // "José da Silva"
 * capitalize("empresa ltda"); // "Empresa Ltda"
 * capitalize("empresa ltda", { upperCaseWords: ["ltda"] }); // "Empresa LTDA"
 * capitalize("MOGI-GUAÇU"); // "Mogi-Guaçu"
 * capitalize("SANTANA/RS"); // "Santana/Rs"
 * capitalize("SANTANA/RS", { upperCaseWords: ["rs"] }); // "Santana/RS"
 * capitalize("joao\tsilva"); // "Joao Silva"
 * ```
 */
export const capitalize = (value: string, options?: CapitalizeOptions): string => {
	if (typeof value !== "string") return "";

	// Stryker disable next-line ArrayDeclaration: the default is never compared against multi-word placeholder content, so any non-empty placeholder array stays unmatched and behaviorally identical
	const { lowerCaseWords = PREPOSITIONS, upperCaseWords = [] } = options ?? {};

	const lowerCaseSet = new Set(lowerCaseWords.map((word) => word.toLocaleLowerCase("pt-BR")));

	const upperCaseSet = new Set(upperCaseWords.map((word) => word.toLocaleUpperCase("pt-BR")));

	const tokens = value.trim().split(SEPARATOR_REGEX);

	let result = "";
	let wordIndex = 0;

	for (const token of tokens) {
		if (!token) continue;

		if (WHITESPACE_REGEX.test(token)) {
			result += " ";
			continue;
		}

		if (token === "-" || token === "/") {
			result += token;
			continue;
		}

		const lowerCaseWord = token.toLocaleLowerCase("pt-BR");
		const upperCaseWord = token.toLocaleUpperCase("pt-BR");

		if (wordIndex > 0 && lowerCaseSet.has(lowerCaseWord)) {
			result += lowerCaseWord;
		} else if (upperCaseSet.has(upperCaseWord)) {
			result += upperCaseWord;
		} else {
			result += upperCaseWord.charAt(0) + lowerCaseWord.slice(1);
		}

		wordIndex++;
	}

	return result;
};
