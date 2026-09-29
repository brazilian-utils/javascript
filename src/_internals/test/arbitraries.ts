import * as fc from "fast-check";

import { type GeneratePhoneType } from "../../generate-phone/generate-phone";
import { type LicensePlateFormat } from "../../get-format-license-plate/get-format-license-plate";
import { type BusinessDayOptions, isBusinessDay } from "../../is-business-day/is-business-day";
import { UF_TO_VOTER_ID_CODE } from "../../is-valid-voter-id/constants";
import { assembleBoletoArrecadacao } from "../assemble-boleto-arrecadacao/assemble-boleto-arrecadacao";
import { assembleBoletoBancario } from "../assemble-boleto-bancario/assemble-boleto-bancario";
import { calculateCnhFirstVerifier } from "../calculate-cnh-first-verifier/calculate-cnh-first-verifier";
import { calculateCnhSecondVerifier } from "../calculate-cnh-second-verifier/calculate-cnh-second-verifier";
import { calculateCnpjCheckDigit } from "../calculate-cnpj-check-digit/calculate-cnpj-check-digit";
import { calculateCpfCheckDigit } from "../calculate-cpf-check-digit/calculate-cpf-check-digit";
import { calculatePisCheckDigit } from "../calculate-pis-check-digit/calculate-pis-check-digit";
import { calculateProcessoJuridicoCheckDigits } from "../calculate-processo-juridico-check-digits/calculate-processo-juridico-check-digits";
import { calculateVoterIdFirstDigit } from "../calculate-voter-id-first-digit/calculate-voter-id-first-digit";
import { calculateVoterIdSecondDigit } from "../calculate-voter-id-second-digit/calculate-voter-id-second-digit";
import { VALID_AREA_CODES } from "../constants/area-codes";
import { ARRECADACAO_SEGMENTS } from "../constants/arrecadacao";
import { CNPJ_FIRST_DIGIT_WEIGHTS, CNPJ_SECOND_DIGIT_WEIGHTS } from "../constants/cnpj";
import { HOLIDAYS_MAX_YEAR, HOLIDAYS_MIN_YEAR } from "../constants/holidays";
import { PROCESSO_JURIDICO_TRIBUNALS } from "../constants/processo-juridico";
import {
	SERVICE_PHONE_ABBREVIATED_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOTS,
	SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES,
} from "../constants/service-phone";
import { DATA as STATES, type StateCode } from "../constants/states";

/**
 * Spreads `separators` around every character of `value`: one before the first character, one
 * between each pair and one after the last, so `separators` must hold `value.length + 1` entries.
 * @param {string} value The characters to spread the separators around.
 * @param {string[]} separators The separators to place around each character.
 * @returns {string} The interleaved value.
 */
const interleave = (value: string, separators: string[]): string => {
	let result = separators[0];

	for (let index = 0; index < value.length; index++) {
		result += `${value[index]}${separators[index + 1]}`;
	}

	return result;
};

const anyPrimitive: fc.Arbitrary<unknown> = fc.oneof(fc.string(), fc.integer(), fc.boolean());

/** Any grapheme string: the widest text a util is expected to survive. */
export const anyText: fc.Arbitrary<string> = fc.string({ unit: "grapheme" });

/** Text, numbers, booleans, `undefined`, `null` and arrays: what a caller may pass by mistake. */
export const anyValue: fc.Arbitrary<unknown> = fc.oneof(
	anyText,
	fc.double(),
	fc.boolean(),
	fc.constantFrom(undefined, null),
	fc.array(fc.string()),
);

/** ASCII alphanumeric text, at most twelve characters long. */
export const asciiAlphanumericText: fc.Arbitrary<string> = fc.stringMatching(/^[0-9A-Za-z]{0,12}$/);

/**
 * Booleans, `null`, numbers, strings, arrays and plain objects, including nested primitives,
 * plus null-prototype objects: an object built with `Object.create(null)` has no `toString`,
 * so it is the shape that catches a util reaching a sanitizer behind a nullish guard alone.
 */
export const anyGarbage: fc.Arbitrary<unknown> = fc.oneof(
	fc.boolean(),
	fc.constant(null),
	fc.double(),
	fc.string(),
	fc.array(anyPrimitive),
	fc.object({ key: fc.constantFrom("a", "b", "c") }),
	fc.object({ withNullPrototype: true }),
);

/**
 * @param {number} length How many digits the generated value holds.
 * @returns {fc.Arbitrary<string>} Strings of exactly `length` digits.
 */
export const digits = (length: number): fc.Arbitrary<string> =>
	fc.stringMatching(new RegExp(`^[0-9]{${length}}$`));

/**
 * @param {number} maxLength The largest number of digits the generated value holds.
 * @returns {fc.Arbitrary<string>} Strings of zero up to `maxLength` digits.
 */
export const digitsUpTo = (maxLength: number): fc.Arbitrary<string> =>
	fc.stringMatching(new RegExp(`^[0-9]{0,${maxLength}}$`));

/**
 * @param {number} maxLength The largest number of digits the generated value holds.
 * @param {number[]} lengths The lengths to leave out.
 * @returns {fc.Arbitrary<string>} Digit strings whose length is none of `lengths`.
 */
export const digitsOfOtherLength = (maxLength: number, lengths: number[]): fc.Arbitrary<string> =>
	digitsUpTo(maxLength).filter((value) => !lengths.includes(value.length));

/**
 * @param {string[]} maskChars The characters a separator is built from.
 * @param {number} count How many separators the generated array holds.
 * @param {number} maxLength The largest length of a single separator.
 * @returns {fc.Arbitrary<string[]>} Arrays of exactly `count` separators.
 */
export const maskSeparators = (
	maskChars: string[],
	count: number,
	maxLength: number,
): fc.Arbitrary<string[]> =>
	fc.array(fc.string({ unit: fc.constantFrom(...maskChars), maxLength }), {
		minLength: count,
		maxLength: count,
	});

/**
 * @param {fc.Arbitrary<string>} source The values to spread the mask over.
 * @param {string[]} maskChars The characters a separator is built from.
 * @param {number} maxLength The largest length of a single separator.
 * @returns {fc.Arbitrary<string>} Values of `source` with a separator around every character.
 */
export const maskedValues = (
	source: fc.Arbitrary<string>,
	maskChars: string[],
	maxLength: number,
): fc.Arbitrary<string> =>
	source.chain((value) =>
		maskSeparators(maskChars, value.length + 1, maxLength).map((separators) =>
			interleave(value, separators),
		),
	);

const LICENSE_PLATE_PATTERNS = {
	LLLNLNN: /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/,
	LLLNNNN: /^[A-Z]{3}[0-9]{4}$/,
};

/**
 * @param {LicensePlateFormat} format The layout the plate follows: `LLLNLNN` for a Mercosul plate
 * and `LLLNNNN` for an old one.
 * @returns {fc.Arbitrary<string>} Uppercase unmasked plates of exactly that layout.
 */
export const licensePlates = (format: LicensePlateFormat): fc.Arbitrary<string> =>
	fc.stringMatching(LICENSE_PLATE_PATTERNS[format]);

/** The two letter code of every Brazilian state. */
export const stateCodes: fc.Arbitrary<StateCode> = fc.constantFrom(
	...STATES.map((state) => state.code),
);

/** A year covered by the bundled holiday tables. */
export const holidayYears: fc.Arbitrary<number> = fc.integer({
	min: HOLIDAYS_MIN_YEAR,
	max: HOLIDAYS_MAX_YEAR,
});

/** A zero based month index, as `Date` numbers them. */
export const monthIndexes: fc.Arbitrary<number> = fc.integer({ min: 0, max: 11 });

/** A day of the month that exists in every month, February included. */
export const monthDays: fc.Arbitrary<number> = fc.integer({ min: 1, max: 28 });

/** A valid date inside the range the business day utils are exercised over. */
export const businessDayDates: fc.Arbitrary<Date> = fc.date({
	min: new Date(1950, 0, 1),
	max: new Date(2050, 11, 31),
	noInvalidDate: true,
});

/**
 * A month inside the range the business day utils are exercised over, with every business day it
 * has at 00:00 local time, found by asking `isBusinessDay` about each day in turn: the brute force
 * answer the month recipes of `addBusinessDays`/`subBusinessDays` are checked against.
 */
export const businessDayMonths = (
	options?: BusinessDayOptions,
): fc.Arbitrary<{ year: number; month: number; businessDays: Date[] }> =>
	fc
		.record({ year: fc.integer({ min: 1950, max: 2050 }), month: fc.integer({ min: 0, max: 11 }) })
		.map(({ year, month }) => ({
			year,
			month,
			businessDays: Array.from(
				{ length: new Date(year, month + 1, 0).getDate() },
				(_, index) => new Date(year, month, index + 1),
			).filter((day) => isBusinessDay(day, options)),
		}));

/**
 * `Object.prototype`'s own keys: the ones a lookup must resolve as unknown rather than reach
 * through the prototype chain.
 */
export const PROTOTYPE_KEYS: string[] = Object.getOwnPropertyNames(Object.prototype);

/** A date, or anything at all: what a business day util may be handed as its date argument. */
export const anyBusinessDayDate: fc.Arbitrary<unknown> = fc.oneof(businessDayDates, fc.anything());

/** A number of business days, or anything at all: what a business day util may be asked to walk. */
export const anyBusinessDayAmount: fc.Arbitrary<unknown> = fc.oneof(
	fc.integer({ min: -200, max: 200 }),
	// A huge integer (1e308 passes Number.isInteger) is valid input that walks the whole supported
	// year range before returning null, tens of milliseconds each; a hundred of them under Stryker's
	// instrumented dry run exceed the test timeout, so they are clamped and the walk stays bounded.
	fc
		.anything()
		.map((value) =>
			typeof value === "number" && Number.isInteger(value) && Math.abs(value) > 1000
				? Math.sign(value) * 1000
				: value,
		),
);

const anyStateCode = fc.oneof(fc.constantFrom(...PROTOTYPE_KEYS, "SP", "xx"), fc.anything());
const anyIncludeOptional = fc.oneof(fc.boolean(), fc.anything());
const anyIncludeSaturday = fc.oneof(fc.boolean(), fc.anything());

/** Business day options, or anything at all, prototype chain keys as the state code included. */
export const anyBusinessDayOptions: fc.Arbitrary<unknown> = fc.oneof(
	fc.anything(),
	fc.record({
		stateCode: anyStateCode,
		includeOptional: anyIncludeOptional,
		includeSaturday: anyIncludeSaturday,
	}),
);

/** An amount with at most two decimals, the precision currency formatting round-trips. */
export const twoDecimalAmounts: fc.Arbitrary<number> = fc
	.integer({ min: -1_000_000_000, max: 1_000_000_000 })
	.map((cents) => cents / 100);

/**
 * Arbitraries of valid documents, for the properties that need one ("a valid CPF stays valid under
 * any mask"). A property must not call a `generate*` utility for that: those draw from
 * `Math.random()`, which the seed fast-check reports on a failure does not control, so the failing
 * document could be neither replayed nor shrunk. These are built from fast-check primitives (the
 * free digits plus the check digits computed from them) and are drawn inside a property with
 * `fc.gen()`: `fc.property(fc.gen(), (g) => { const cpf = g(cpfs); ... })`.
 *
 * The `generate*` utilities keep their own tests; these do not replace them.
 */

const NUMERIC = "0123456789";

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Strings of `length` characters of `alphabet` that are never one character repeated: the second
 * character is the first one moved by a non-zero offset, so a document that rejects a repeated
 * base (`000.000.000-00`) is valid by construction, with nothing filtered out.
 * @param {string} alphabet The characters to draw from, two or more.
 * @param {number} length How many characters the string holds, two or more.
 * @returns {fc.Arbitrary<string>} Strings whose first two characters differ.
 */
const unrepeated = (alphabet: string, length: number): fc.Arbitrary<string> =>
	fc
		.tuple(
			fc.integer({ min: 0, max: alphabet.length - 1 }),
			fc.integer({ min: 1, max: alphabet.length - 1 }),
			fc.array(fc.integer({ min: 0, max: alphabet.length - 1 }), {
				minLength: length - 2,
				maxLength: length - 2,
			}),
		)
		.map(([first, offset, rest]) =>
			[first, (first + offset) % alphabet.length, ...rest]
				.map((index) => alphabet.charAt(index))
				.join(""),
		);

/**
 * @returns {fc.Arbitrary<string>} Valid CPFs, unmasked.
 */
export const cpfs = (): fc.Arbitrary<string> =>
	unrepeated(NUMERIC, 9).map((base) => {
		const first = String(calculateCpfCheckDigit(base));
		return base + first + String(calculateCpfCheckDigit(base + first));
	});

/**
 * @param {1 | 2} [version] The CNPJ version: numeric (`1`, the default) or alphanumeric (`2`).
 * @returns {fc.Arbitrary<string>} Valid CNPJs of that version, unmasked.
 */
export const cnpjs = (version?: 1 | 2): fc.Arbitrary<string> =>
	unrepeated(version === 2 ? ALPHANUMERIC : NUMERIC, 12).map((base) => {
		const first = String(calculateCnpjCheckDigit(base, CNPJ_FIRST_DIGIT_WEIGHTS));
		return base + first + String(calculateCnpjCheckDigit(base + first, CNPJ_SECOND_DIGIT_WEIGHTS));
	});

/**
 * @returns {fc.Arbitrary<string>} Valid CNH numbers.
 */
export const cnhs = (): fc.Arbitrary<string> =>
	unrepeated(NUMERIC, 9).map((base) => {
		const { firstVerifier, decrement } = calculateCnhFirstVerifier(base);
		return `${base}${firstVerifier}${calculateCnhSecondVerifier({ base, decrement })}`;
	});

/**
 * @returns {fc.Arbitrary<string>} Valid PIS/PASEP numbers, unmasked.
 */
export const pisNumbers = (): fc.Arbitrary<string> =>
	unrepeated(NUMERIC, 10).map((base) => `${base}${calculatePisCheckDigit(base)}`);

/** Arbitraries of valid voter IDs and processo numbers, built the same way as the documents. */

/**
 * @param {StateCode | "ZZ"} [state] The state the voter IDs belong to; any of them by default.
 * @returns {fc.Arbitrary<string>} Valid voter IDs, unmasked.
 */
export const voterIds = (state?: StateCode | "ZZ"): fc.Arbitrary<string> =>
	fc
		.tuple(
			digits(8),
			state === undefined
				? fc.constantFrom(...Object.values(UF_TO_VOTER_ID_CODE))
				: fc.constant(UF_TO_VOTER_ID_CODE[state]),
		)
		.map(([sequentialNumber, federativeUnion]) => {
			const firstDigit = calculateVoterIdFirstDigit({ sequentialNumber, federativeUnion });
			const secondDigit = calculateVoterIdSecondDigit({ federativeUnion, firstDigit });
			return `${sequentialNumber}${federativeUnion}${firstDigit}${secondDigit}`;
		});

/**
 * @returns {fc.Arbitrary<string>} Valid CNJ processo numbers, unmasked, with the órgão and the
 * tribunal drawn from the pairs Resolução CNJ nº 65/2008 allows.
 */
export const processosJuridicos = (): fc.Arbitrary<string> => {
	const courtsAndTribunals = [...PROCESSO_JURIDICO_TRIBUNALS].flatMap(([court, tribunals]) =>
		tribunals.map((tribunal) => `${court}${String(tribunal).padStart(2, "0")}`),
	);

	return fc
		.tuple(
			digits(7),
			fc.integer({ min: 1000, max: 9999 }),
			fc.constantFrom(...courtsAndTribunals),
			digits(4),
		)
		.map(([sequential, year, courtAndTribunal, origin]) => {
			const tail = `${year}${courtAndTribunal}${origin}`;
			const checkDigits = calculateProcessoJuridicoCheckDigits(sequential + tail);
			return `${sequential}${String(checkDigits).padStart(2, "0")}${tail}`;
		});
};

/** Arbitraries of valid boletos, built the same way as the documents. */

/**
 * @param {"bancario" | "arrecadacao"} [type] The type of the boletos; bancário by default.
 * @returns {fc.Arbitrary<string>} Valid linhas digitáveis, unmasked.
 */
export const boletos = (type?: "bancario" | "arrecadacao"): fc.Arbitrary<string> =>
	type === "arrecadacao"
		? fc
				.record({
					segment: fc.constantFrom(...ARRECADACAO_SEGMENTS),
					useMod11: fc.boolean(),
					hasEffectiveValue: fc.boolean(),
					body: digits(40),
				})
				.map((parts) => assembleBoletoArrecadacao(parts))
		: fc
				.record({ field1: digits(9), field2: digits(10), field3: digits(10), tail: digits(15) })
				.map((parts) => assembleBoletoBancario(parts));

/** Arbitraries of valid phone numbers, built the same way as the documents. */

/**
 * @param {readonly string[]} starts The prefixes to draw from.
 * @param {number} rest How many digits follow the prefix.
 * @returns {fc.Arbitrary<string>} One of `starts` followed by `rest` digits.
 */
const prefixed = (starts: readonly string[], rest: number): fc.Arbitrary<string> =>
	fc.tuple(fc.constantFrom(...starts), digits(rest)).map((parts) => parts.join(""));

/**
 * @param {GeneratePhoneType} [type] The type of the numbers; mobile or landline by default.
 * @returns {fc.Arbitrary<string>} Valid phone numbers, unmasked and without the country code.
 */
export const phones = (type?: GeneratePhoneType): fc.Arbitrary<string> => {
	if (type === "service") {
		return fc.oneof(
			prefixed(
				SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES,
				SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH - SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH,
			),
			prefixed(
				SERVICE_PHONE_ABBREVIATED_ROOTS,
				SERVICE_PHONE_ABBREVIATED_LENGTH - SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH,
			),
		);
	}

	const areaCodes = VALID_AREA_CODES.map(String);
	const mobile = prefixed(areaCodes, 8).map((value) => `${value.slice(0, 2)}9${value.slice(2)}`);
	const landline = fc
		.tuple(fc.constantFrom(...areaCodes), fc.integer({ min: 2, max: 6 }), digits(7))
		.map((parts) => parts.join(""));

	if (type === "mobile") return mobile;

	return type === "landline" ? landline : fc.oneof(mobile, landline);
};
