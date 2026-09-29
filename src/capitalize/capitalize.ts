import { isStateCode } from "../_internals/is-state-code/is-state-code";
import {
	APOSTROPHE_REGEX,
	COMPANY_DESIGNATIONS,
	DOCUMENT_ABBREVIATIONS,
	ELIDED_PARTICLE,
	ENCLISIS_REGEX,
	JOINER_REGEX,
	PREPOSITIONS,
	PUNCTUATION_REGEX,
	ROMAN_NUMERALS,
	SEPARATOR_REGEX,
	TRAILING_DESIGNATIONS,
	UF_SEPARATORS,
	WHITESPACE_REGEX,
	WORD_REGEX,
} from "./constants";

/** Options of `capitalize`. */
export type CapitalizeOptions = {
	/** Words to keep in lower case when they are not the first word (default: the Portuguese prepositions). */
	lowerCaseWords?: string[];
	/** Words to keep in upper case wherever they appear (default: the Brazilian company designations, document abbreviations and roman numerals). */
	upperCaseWords?: string[];
};

const foldToLowerCase = (word: string): string => word.toLowerCase();

const foldToUpperCase = (word: string): string => word.toUpperCase();

let defaultLowerCaseSet: Set<string> | undefined;

let defaultUpperCaseSet: Set<string> | undefined;

const toWordSet = (
	words: unknown,
	fallback: readonly string[],
	fold: (word: string) => string,
): Set<string> => {
	const source: readonly unknown[] = Array.isArray(words) ? words : fallback;

	return new Set(source.filter((word) => typeof word === "string").map((word) => fold(word)));
};

const readLowerCaseSet = (words: unknown): Set<string> => {
	if (Array.isArray(words)) return toWordSet(words, PREPOSITIONS, foldToLowerCase);

	defaultLowerCaseSet ??= toWordSet(words, PREPOSITIONS, foldToLowerCase);

	return defaultLowerCaseSet;
};

/**
 * The upper case word list in force: the words given, or the default list, which is assembled
 * here on the first call and kept, not in a module-level constant, so a bundle that never calls
 * `capitalize` does not keep the spread.
 *
 * @param {unknown} words - The `upperCaseWords` option as given.
 * @returns {Set<string>} The words to keep in upper case, in upper case.
 */
const readUpperCaseSet = (words: unknown): Set<string> => {
	if (Array.isArray(words)) return toWordSet(words, [], foldToUpperCase);

	defaultUpperCaseSet ??= toWordSet(
		words,
		[...COMPANY_DESIGNATIONS, ...DOCUMENT_ABBREVIATIONS, ...ROMAN_NUMERALS],
		foldToUpperCase,
	);

	return defaultUpperCaseSet;
};

/**
 * A token that carries a word, as opposed to a separator or the empty token between two of them.
 *
 * @param {string} token - The token to classify.
 * @returns {boolean} `true` when the token is a word.
 */
const isWord = (token: string): boolean => WORD_REGEX.test(token);

/**
 * An apostrophe token, the one that elides the particle of `d'Oeste` and marks the possessive of
 * `Bob's`.
 *
 * @param {string} token - The token to classify.
 * @returns {boolean} `true` when the token is an apostrophe.
 */
const isApostrophe = (token: string): boolean => APOSTROPHE_REGEX.test(token);

/**
 * The index of the next word of the value after `index`, `tokens.length` when there is none.
 *
 * @param {string[]} tokens - Every token of the value, words and separators alike.
 * @param {number} index - The index to look ahead from.
 * @returns {number} The index of the next word.
 */
const nextWordIndex = (tokens: string[], index: number): number => {
	// Stryker disable next-line EqualityOperator: the extra pass reads `tokens[tokens.length]`, which is `undefined`; `WORD_REGEX.test(undefined)` tests the string "undefined" and matches, so it returns `tokens.length`, the value the function returns when the loop ends.
	for (let position = index + 1; position < tokens.length; position++) {
		if (isWord(tokens[position])) return position;
	}

	return tokens.length;
};

/**
 * What follows the word at `index`: whether the next word is joined to it, that is, whether only
 * whitespace, `-`, `/` or an apostrophe stands between the two, and the designation the next
 * word forms, which is the word itself (`"EPP"`) or the word and the one after it when a slash
 * alone joins them (`"S/A"`); `""` when no word follows.
 *
 * @param {string[]} tokens - Every token of the value, words and separators alike.
 * @param {number} index - The index of the word to look ahead from.
 * @returns {{ joined: boolean; designation: string }} Whether the next word is joined to the word at `index` and the designation it forms.
 */
const lookAhead = (tokens: string[], index: number): { joined: boolean; designation: string } => {
	const position = nextWordIndex(tokens, index);

	if (position === tokens.length) return { joined: false, designation: "" };

	const joined = tokens
		.slice(index + 1, position)
		.every((token) => token === "" || JOINER_REGEX.test(token));
	const next = tokens[position];
	const following = nextWordIndex(tokens, position);
	const acrossSlash = tokens.slice(position + 1, following + 1).join("");

	return { joined, designation: acrossSlash.startsWith("/") ? next + acrossSlash : next };
};

/**
 * The `d` of `d'Oeste`: an elided particle only when an apostrophe and a word follow it. Splitting
 * on the separators always leaves a token after each of them, so the token two places ahead of a
 * word followed by an apostrophe is always there, even when it is the empty one of `"rua d'"`.
 *
 * @param {string[]} tokens - Every token of the value, words and separators alike.
 * @param {number} index - The index of the word being written.
 * @param {string} word - That word, in lower case.
 * @returns {boolean} `true` when the word is the elided particle.
 */
const isElidedParticle = (tokens: string[], index: number, word: string): boolean =>
	word === ELIDED_PARTICLE && isApostrophe(tokens[index + 1]) && isWord(tokens[index + 2]);

/**
 * The `s` of `Bob's`: the English possessive, a single letter written right after an apostrophe.
 *
 * @param {string[]} tokens - Every token of the value, words and separators alike.
 * @param {number} index - The index of the word being written.
 * @param {string} word - That word, in lower case.
 * @returns {boolean} `true` when the word is an English possessive.
 */
const isPossessive = (tokens: string[], index: number, word: string): boolean =>
	word.length === 1 && isApostrophe(tokens[index - 1]);

/**
 * Whether a word of the upper case list stands where it is written in upper case. Every
 * designation but the ones of `TRAILING_DESIGNATIONS` is upper case wherever it appears; those
 * are upper case only as the last word of the value or right before an adjacent company
 * designation of the list in force (`"EPP"`, `"S/A"`), and never when a hyphen or an apostrophe
 * attaches them to the previous word, where they are the enclitic pronoun (`"diga-me"`).
 *
 * @param {string} word - The word being written, in upper case.
 * @param {boolean} enclitic - Whether a hyphen or an apostrophe attaches the word to the previous one.
 * @param {{ joined: boolean; designation: string }} ahead - What follows the word: whether the next word is joined to it and the designation it forms (`""` when the word is the last one).
 * @param {Set<string>} upperCaseSet - The upper case word list in force.
 * @returns {boolean} `true` when the word is written in upper case where it stands.
 */
const isUpperCasePosition = (
	word: string,
	enclitic: boolean,
	ahead: { joined: boolean; designation: string },
	upperCaseSet: Set<string>,
): boolean => {
	if (!TRAILING_DESIGNATIONS.includes(word)) return true;
	if (enclitic) return false;
	if (ahead.designation === "") return true;

	const designation = ahead.designation.toUpperCase();

	return (
		ahead.joined && COMPANY_DESIGNATIONS.includes(designation) && upperCaseSet.has(designation)
	);
};

/**
 * Whether a state code stands where it is the Federative Unit of an address: right after a `/`
 * wherever it appears (`"Porto Alegre/RS"`), or as the last word of the value right after one of
 * `UF_SEPARATORS` (`"Brasília - DF"`, `"São Paulo – SP"`, `"Curitiba, PR"`).
 *
 * @param {string[]} output - What has been written so far.
 * @param {{ joined: boolean; designation: string }} ahead - What follows the word (`designation` is `""` when it is the last one).
 * @returns {boolean} `true` when a state code there is the UF.
 */
const isStateCodePosition = (
	output: string[],
	ahead: { joined: boolean; designation: string },
): boolean => {
	if (output.at(-1) === "/") return true;
	if (ahead.designation !== "") return false;

	const written = output.join("");

	return UF_SEPARATORS.some((separator) => written.endsWith(separator));
};

/**
 * A word with its first letter in upper case and the rest in lower case, letter by code point. A
 * word is never empty (the empty tokens are skipped), and neither is its upper case. A
 * first letter whose upper case is more than one character (`ß` becomes `SS`, the `ﬁ` ligature
 * becomes `FI`) keeps its case: expanding it would drop or add letters, and a second pass over
 * the result would not give the result back. The rest is lower cased on its own, not sliced out
 * of the lower cased word, since lower casing the first letter can change its length too (`İ`
 * becomes `i` plus a combining dot), which is what made `"İ"` grow a dot on every pass.
 *
 * @param {string} word - The word to write.
 * @returns {string} The word, capitalized.
 */
const capitalizeWord = (word: string): string => {
	const [first, ...rest] = word;
	const [upperFirst, ...expansion] = first.toUpperCase();
	const head = expansion.length > 0 ? first : upperFirst;

	return head + rest.join("").toLowerCase();
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
 * of foreign-origin names (`del`, `della`, `di`, `du`, `van`, `von`, `der`, `den`) stay lower
 * case like the Portuguese prepositions, so `"luiz von schmidt"` becomes `"Luiz von Schmidt"`.
 *
 * - Words listed in `lowerCaseWords` are converted to lower case when they link two words, that
 *   is, when they are neither the first word nor the last one and another word follows them
 *   across whitespace, `-`, `/` or an apostrophe. The default list is the Portuguese
 *   prepositions, articles and conjunctions that stay in lower case inside a proper name ("de",
 *   "da", "do", "e", ...), so `"JOSÉ DA SILVA"` becomes `"José da Silva"`. A word of the list
 *   that ends the value or is followed by punctuation is a designator instead, and keeps its
 *   capital: `"rua a, 100"` becomes `"Rua A, 100"` and `"condomínio a, quadra d, lote o"` becomes
 *   `"Condomínio A, Quadra D, Lote O"`.
 * - The elided particle `d'` is written in lower case wherever it appears, including as the first
 *   word, but only when an apostrophe and a word follow it, so `"santa bárbara d'oeste"` becomes
 *   `"Santa Bárbara d'Oeste"` and `"dias d'ávila"` becomes `"Dias d'Ávila"` while the designator
 *   `"rua d"` becomes `"Rua D"`. A single letter written right after an apostrophe is the English
 *   possessive and stays in lower case, so `"bob's"` becomes `"Bob's"`, not `"Bob'S"`.
 * - Words listed in `upperCaseWords` are converted to upper case wherever they appear. The
 *   default list is the company designations and document abbreviations that are written in upper
 *   case in Brazilian usage (`LTDA`, `S.A.`, `S/A`, `S.S.`, `S/S`, `ME`, `EPP`, `MEI`, `EIRELI`,
 *   `CIA`, `SCP`, `CNPJ`, `CPF`, `RG`, `CEP`, `UF`) plus the roman numerals that appear in names
 *   and addresses (`II` through `XXXIX`, the numerals written with `I`, `V` and `X` alone, except
 *   `VI`, so `"joão paulo ii"` becomes `"João Paulo II"`, `"rua xv de novembro"` becomes `"Rua XV
 *   de Novembro"` and `"rua xxiv de maio"` becomes `"Rua XXIV de Maio"`). `ME` is also
 *   the pt-BR pronoun "me", so it is only upper cased in the designation position, as the last
 *   word of the value (`"fulano comércio me"` becomes `"Fulano Comércio ME"`) or right before
 *   another designation (`"fulano me epp"` becomes `"Fulano ME EPP"`); anywhere else it is an
 *   ordinary word, so `"diga-me a verdade"` becomes `"Diga-Me a Verdade"` and the municipality
 *   `"não-me-toque"` becomes `"Não-Me-Toque"`. A designation
 *   written around a slash, `S/A` and `S/S`, is matched across that slash even though a slash
 *   separates words, so `"casa de carnes s/a"` becomes `"Casa de Carnes S/A"`.
 * - A two letter word that follows a `/` is converted to upper case when it is the code of a
 *   Brazilian state, the way a municipality and its Federative Unit are written together, so
 *   `"porto alegre/rs"` becomes `"Porto Alegre/RS"` while `"santana/br"` becomes `"Santana/Br"`.
 *   A state code that does not follow a `/` is left alone (`"santana rs"` becomes
 *   `"Santana Rs"`), and so is any other two letter word. As the last word of the value, a state
 *   code is also converted after a spaced hyphen or en dash or after a comma, the "Cidade – UF" of
 *   the Correios' addressing guide, so `"brasília - df"` becomes `"Brasília - DF"`, `"são paulo –
 *   sp"` becomes `"São Paulo – SP"` and `"curitiba, pr"` becomes `"Curitiba, PR"`; anywhere else
 *   after those separators the two letters are an ordinary word (`"rs - centro"` stays
 *   `"Rs - Centro"`).
 * - All other words are capitalized (first letter upper case, rest lower case), letter by letter:
 *   `"İSTANBUL"` becomes `"İstanbul"`, and a first letter whose upper case is two letters (`ß`,
 *   the `ﬁ` ligature) keeps its case, so `"straße"` becomes `"Straße"` and `"ßa"` stays `"ßa"`.
 *
 * Both lists are compared ignoring the case of the words, and either one given in `options`
 * replaces its default list entirely, so `capitalize("empresa ltda", { upperCaseWords: [] })`
 * gives `"Empresa Ltda"`. A `lowerCaseWords`/`upperCaseWords` that is not an array falls back to
 * its default, and a member of either list that is not a string is ignored, so a malformed
 * option never throws. The default `lowerCaseWords` list is the set of prepositions and
 * conjunctions the Manual de Redação da Presidência da República keeps in lower case inside a
 * proper name, and the default `upperCaseWords` list is sourced in `constants.ts` from the laws
 * that create each designation. The default lists are assembled on the first call and kept, not
 * in a module-level constant, so a bundle that never calls `capitalize` does not keep the spread.
 *
 * @param {string} value - The input string to be capitalized.
 * @param {CapitalizeOptions} [options] - Optional configuration for capitalization.
 * @param {string[]} [options.lowerCaseWords] - Array of words to keep in lower case (default: the Portuguese prepositions).
 * @param {string[]} [options.upperCaseWords] - Array of words to keep in upper case (default: the Brazilian company designations, document abbreviations and roman numerals).
 * @returns {string} The capitalized string according to the specified rules.
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
 * capitalize("bob's"); // "Bob's"
 * capitalize("rua a, 100"); // "Rua A, 100"
 * capitalize("fulano comércio me"); // "Fulano Comércio ME"
 * capitalize("não-me-toque"); // "Não-Me-Toque"
 * capitalize("(empresa) ltda"); // "(Empresa) LTDA"
 * capitalize("luiz von schmidt"); // "Luiz von Schmidt"
 * capitalize("casa para todos"); // "Casa para Todos"
 * capitalize("empresa s.a"); // "Empresa S.A"
 * capitalize("casa de carnes s/a"); // "Casa de Carnes S/A"
 * capitalize("MOGI-GUAÇU"); // "Mogi-Guaçu"
 * capitalize("santana/rs"); // "Santana/RS"
 * capitalize("brasília - df"); // "Brasília - DF"
 * capitalize("rua xv de novembro"); // "Rua XV de Novembro"
 * capitalize("rua xxiv de maio"); // "Rua XXIV de Maio"
 * capitalize("empresa ltda", { upperCaseWords: [] }); // "Empresa Ltda"
 * capitalize("joao\tsilva"); // "Joao Silva"
 * ```
 */
export const capitalize = (value: string, options?: CapitalizeOptions): string => {
	if (typeof value !== "string") return "";

	const { lowerCaseWords, upperCaseWords } = options ?? {};

	const lowerCaseSet = readLowerCaseSet(lowerCaseWords);
	const upperCaseSet = readUpperCaseSet(upperCaseWords);

	const tokens = value.trim().split(SEPARATOR_REGEX);

	const output: string[] = [];
	let wordIndex = 0;
	let enclitic = false;

	for (const [index, token] of tokens.entries()) {
		if (!token) continue;

		if (WHITESPACE_REGEX.test(token)) {
			output.push(" ");
			enclitic = false;
			continue;
		}

		if (PUNCTUATION_REGEX.test(token)) {
			output.push(token);
			enclitic = ENCLISIS_REGEX.test(token);
			continue;
		}

		const lowerCaseWord = token.toLowerCase();
		const upperCaseWord = token.toUpperCase();
		const designation = (output.slice(-2).join("") + upperCaseWord).toUpperCase();
		const ahead = lookAhead(tokens, index);

		if (designation !== upperCaseWord && upperCaseSet.has(designation)) {
			output.splice(-2, 2, designation);
		} else if (isPossessive(tokens, index, lowerCaseWord)) {
			output.push(lowerCaseWord);
		} else if (isElidedParticle(tokens, index, lowerCaseWord)) {
			output.push(lowerCaseWord);
		} else if (wordIndex > 0 && ahead.joined && lowerCaseSet.has(lowerCaseWord)) {
			output.push(lowerCaseWord);
		} else if (
			upperCaseSet.has(upperCaseWord) &&
			isUpperCasePosition(upperCaseWord, enclitic, ahead, upperCaseSet)
		) {
			output.push(upperCaseWord);
		} else if (isStateCode(upperCaseWord) && isStateCodePosition(output, ahead)) {
			output.push(upperCaseWord);
		} else {
			output.push(capitalizeWord(token));
		}

		wordIndex++;
	}

	return output.join("");
};
