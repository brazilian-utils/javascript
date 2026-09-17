import {
	APOSTROPHE_REGEX,
	COMPANY_DESIGNATIONS,
	ELIDED_PARTICLE,
	ENCLISIS_REGEX,
	JOINER_REGEX,
	PREPOSITIONS,
	PUNCTUATION_REGEX,
	SEPARATOR_REGEX,
	STATE_CODES,
	TRAILING_DESIGNATIONS,
	UPPER_CASE_WORDS,
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

const stateCodeSet: Set<string> = new Set(STATE_CODES);

const trailingDesignationSet: Set<string> = new Set(TRAILING_DESIGNATIONS);
const companyDesignationSet: Set<string> = new Set(COMPANY_DESIGNATIONS);

const toWordSet = (
	words: unknown,
	fallback: readonly string[],
	fold: (word: string) => string,
): Set<string> => {
	const source: readonly unknown[] = Array.isArray(words) ? words : fallback;

	return new Set(source.filter((word) => typeof word === "string").map((word) => fold(word)));
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
	const offset = tokens.slice(index + 1).findIndex((token) => isWord(token));

	return offset === -1 ? tokens.length : index + 1 + offset;
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
	if (!trailingDesignationSet.has(word)) return true;
	if (enclitic) return false;
	if (ahead.designation === "") return true;

	const designation = ahead.designation.toLocaleUpperCase("pt-BR");

	return ahead.joined && companyDesignationSet.has(designation) && upperCaseSet.has(designation);
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
 *   and addresses (`II` through `XXIII`, except `VI`, so `"joão paulo ii"` becomes
 *   `"João Paulo II"` and `"rua xv de novembro"` becomes `"Rua XV de Novembro"`). `ME` is also
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
 * capitalize("bob's"); // "Bob's"
 * capitalize("rua a, 100"); // "Rua A, 100"
 * capitalize("fulano comércio me"); // "Fulano Comércio ME"
 * capitalize("não-me-toque"); // "Não-Me-Toque"
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

		const lowerCaseWord = token.toLocaleLowerCase("pt-BR");
		const upperCaseWord = token.toLocaleUpperCase("pt-BR");
		const designation = (output.slice(-2).join("") + upperCaseWord).toLocaleUpperCase("pt-BR");
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
		} else if (output.at(-1) === "/" && stateCodeSet.has(upperCaseWord)) {
			output.push(upperCaseWord);
		} else {
			output.push(upperCaseWord.charAt(0) + lowerCaseWord.slice(1));
		}

		wordIndex++;
	}

	return output.join("");
};
