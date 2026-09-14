import {
	PREPOSITIONS,
	PUNCTUATION_REGEX,
	SEPARATOR_REGEX,
	STATE_CODES,
	UPPER_CASE_WORDS,
	WHITESPACE_REGEX,
} from "./constants";

/** Options of `capitalize`. */
export type CapitalizeOptions = {
	/** Words to keep in lower case when they are not the first word (default: the Portuguese prepositions). */
	lowerCaseWords?: string[];
	/** Words to keep in upper case wherever they appear (default: the Brazilian company designations, document abbreviations and roman numerals). */
	upperCaseWords?: string[];
};

const stateCodeSet: Set<string> = new Set(STATE_CODES);

const toWordSet = (
	words: unknown,
	fallback: readonly string[],
	fold: (word: string) => string,
): Set<string> => {
	const source: readonly unknown[] = Array.isArray(words) ? words : fallback;

	return new Set(source.filter((word) => typeof word === "string").map((word) => fold(word)));
};

/**
 * Capitalizes a given string according to the way a Brazilian name, company name or address is
 * written, with no configuration needed: `"jose da silva"` becomes `"Jose da Silva"`,
 * `"empresa ltda"` becomes `"Empresa LTDA"` and `"santana/rs"` becomes `"Santana/RS"`.
 *
 * Words are separated by whitespace, by `-` and `/`, by the apostrophe (`"d'oeste"` becomes
 * `"d'Oeste"`) and by punctuation that touches a word (`"(empresa)"` becomes `"(Empresa)"`,
 * `"bairro:centro"` becomes `"Bairro:Centro"`), so `"MOGI-GUAÇU"` becomes `"Mogi-Guaçu"`. The
 * separators are kept where they are, while every run of whitespace (spaces, tabs, newlines)
 * collapses into a single space and the leading and trailing whitespace is dropped. The particles
 * of foreign-origin names (`d'`, `del`, `della`, `di`, `du`, `van`, `von`, `der`, `den`) stay lower
 * case like the Portuguese prepositions, so `"luiz von schmidt"` becomes `"Luiz von Schmidt"`.
 *
 * - Words listed in `lowerCaseWords` are converted to lower case, except for the first word. The
 *   default list is the Portuguese prepositions, articles and conjunctions that stay in lower
 *   case inside a proper name ("de", "da", "do", "e", ...), so `"JOSÉ DA SILVA"` becomes
 *   `"José da Silva"`.
 * - Words listed in `upperCaseWords` are converted to upper case wherever they appear. The
 *   default list is the company designations and document abbreviations that are written in upper
 *   case in Brazilian usage (`LTDA`, `S.A.`, `S/A`, `S.S.`, `S/S`, `ME`, `EPP`, `MEI`, `EIRELI`,
 *   `CIA`, `SCP`, `CNPJ`, `CPF`, `RG`, `CEP`, `UF`) plus the roman numerals that appear in names
 *   and addresses (`II` through `XXIII`, except `VI`, so `"joão paulo ii"` becomes
 *   `"João Paulo II"` and `"rua xv de novembro"` becomes `"Rua XV de Novembro"`). `ME` matches
 *   the pronoun "me" too, so free text such as `"diga-me"` becomes `"Diga-ME"`: pass an
 *   `upperCaseWords` of your own when the input is not a name. A designation
 *   written around a slash, `S/A` and `S/S`, is matched across that slash even though a slash
 *   separates words, so `"casa de carnes s/a"` becomes `"Casa de Carnes S/A"`.
 * - A two letter word that follows a `/` is converted to upper case when it is the code of a
 *   Brazilian state, the way a municipality and its Federative Unit are written together, so
 *   `"porto alegre/rs"` becomes `"Porto Alegre/RS"` while `"santana/br"` becomes `"Santana/Br"`.
 *   A state code that does not follow a `/` is left alone (`"santana rs"` becomes
 *   `"Santana Rs"`), and so is any other two letter word.
 * - All other words are capitalized (first letter upper case, rest lower case).
 *
 * Both lists are compared ignoring the case of the words, and either one given in `options`
 * replaces its default list entirely, so `capitalize("empresa ltda", { upperCaseWords: [] })`
 * gives `"Empresa Ltda"`. A `lowerCaseWords`/`upperCaseWords` that is not an array falls back to
 * its default, and a member of either list that is not a string is ignored, so a malformed
 * option never throws.
 *
 * @param {string} value - The input string to be capitalized.
 * @param {CapitalizeOptions} [options] - Optional configuration for capitalization.
 * @param {string[]} [options.lowerCaseWords] - Array of words to keep in lower case (default: the Portuguese prepositions).
 * @param {string[]} [options.upperCaseWords] - Array of words to keep in upper case (default: the Brazilian company designations, document abbreviations and roman numerals).
 * @returns {string} The capitalized string according to the specified rules.
 *
 * The default `lowerCaseWords` list is the set of prepositions and conjunctions the Manual de
 * Redação da Presidência da República keeps in lower case inside a proper name, and the default
 * `upperCaseWords` list is sourced in `constants.ts` from the laws that create each designation.
 *
 * @see Official: https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica/manual-de-redacao.pdf
 * Manual de Redação da Presidência da República, 3ª edição (Portaria nº 1.369/2018), item 5.1.8
 * b) and item 10.2 a).
 * @see Official: https://www4.planalto.gov.br/centrodeestudos/assuntos/manual-de-redacao-da-presidencia-da-republica
 * The Presidência page that publishes it.
 *
 * @example
 * ```typescript
 * capitalize("JOSÉ DA SILVA"); // "José da Silva"
 * capitalize("empresa ltda"); // "Empresa LTDA"
 * capitalize("banco do brasil s.a."); // "Banco do Brasil S.A."
 * capitalize("santa bárbara d'oeste"); // "Santa Bárbara d'Oeste"
 * capitalize("(empresa) ltda"); // "(Empresa) LTDA"
 * capitalize("luiz von schmidt"); // "Luiz von Schmidt"
 * capitalize("casa de carnes s/a"); // "Casa de Carnes S/A"
 * capitalize("MOGI-GUAÇU"); // "Mogi-Guaçu"
 * capitalize("santana/rs"); // "Santana/RS"
 * capitalize("rua xv de novembro"); // "Rua XV de Novembro"
 * capitalize("empresa ltda", { upperCaseWords: [] }); // "Empresa Ltda"
 * capitalize("joao\tsilva"); // "Joao Silva"
 * ```
 */
export const capitalize = (value: string, options?: CapitalizeOptions): string => {
	if (typeof value !== "string") return "";

	const { lowerCaseWords, upperCaseWords } = options ?? {};

	const lowerCaseSet = toWordSet(lowerCaseWords, PREPOSITIONS, (word) =>
		word.toLocaleLowerCase("pt-BR"),
	);

	const upperCaseSet = toWordSet(upperCaseWords, UPPER_CASE_WORDS, (word) =>
		word.toLocaleUpperCase("pt-BR"),
	);

	const tokens = value.trim().split(SEPARATOR_REGEX);

	const output: string[] = [];
	let wordIndex = 0;

	for (const token of tokens) {
		if (!token) continue;

		if (WHITESPACE_REGEX.test(token)) {
			output.push(" ");
			continue;
		}

		if (PUNCTUATION_REGEX.test(token)) {
			output.push(token);
			continue;
		}

		const lowerCaseWord = token.toLocaleLowerCase("pt-BR");
		const upperCaseWord = token.toLocaleUpperCase("pt-BR");
		const designation = (output.slice(-2).join("") + upperCaseWord).toLocaleUpperCase("pt-BR");

		if (upperCaseSet.has(designation)) {
			output.splice(-2, 2, designation);
		} else if (wordIndex > 0 && lowerCaseSet.has(lowerCaseWord)) {
			output.push(lowerCaseWord);
		} else if (upperCaseSet.has(upperCaseWord)) {
			output.push(upperCaseWord);
		} else if (output.at(-1) === "/" && stateCodeSet.has(upperCaseWord)) {
			output.push(upperCaseWord);
		} else {
			output.push(upperCaseWord.charAt(0) + lowerCaseWord.slice(1));
		}

		wordIndex++;
	}

	return output.join("");
};
