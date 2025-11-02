export const ACRONYMS = ['cia', 'cnpj', 'cpf', 'ltda', 'me', 'rg'];

export const PREPOSITIONS = [
  'a',
  'com',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'na',
  'nas',
  'no',
  'nos',
  'o',
  'por',
  'sem',
];

type CapitalizeOptions = {
  lowerCaseWords?: string[];
  upperCaseWords?: string[];
};

/**
 * Capitalizes a given string according to specific rules for lower-case and upper-case words.
 *
 * - Words listed in `lowerCaseWords` (default: `PREPOSITIONS`) will be converted to lower case, except for the first word.
 * - Words listed in `upperCaseWords` (default: `ACRONYMS`) will be converted to upper case.
 * - All other words will be capitalized (first letter upper case, rest lower case).
 *
 * @param value - The input string to be capitalized.
 * @param options - Optional configuration for capitalization.
 * @param options.lowerCaseWords - Array of words to keep in lower case (default: `PREPOSITIONS`).
 * @param options.upperCaseWords - Array of words to keep in upper case (default: `ACRONYMS`).
 * @returns The capitalized string according to the specified rules.
 */
export function capitalize(
  value: string,
  { lowerCaseWords = PREPOSITIONS, upperCaseWords = ACRONYMS }: CapitalizeOptions = {}
): string {
  return value
    .split(' ')
    .filter((word) => !!word)
    .map((word, index) => {
      const lowerCaseWord = word.toLocaleLowerCase();
      if (index > 0 && lowerCaseWords.indexOf(lowerCaseWord) !== -1) return lowerCaseWord;
      const upperCaseWord = word.toLocaleUpperCase();
      if (upperCaseWords.indexOf(upperCaseWord) !== -1) return upperCaseWord;
      return upperCaseWord.charAt(0) + lowerCaseWord.substr(1);
    })
    .join(' ');
}
