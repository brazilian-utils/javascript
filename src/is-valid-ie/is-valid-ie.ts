import { type StateCode } from "../_internals/constants/states";
import { hasOwnKey } from "../_internals/has-own-key/has-own-key";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { mod10 } from "../_internals/mod10/mod10";
import { normalizeStateCode } from "../_internals/read-state-code/read-state-code";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import {
	AC_PREFIXES,
	AL_COMPANY_TYPES,
	AL_PREFIXES,
	BA_MOD_10_DIGITS,
	DF_PREFIXES,
	GO_DUAL_DIGIT_IE,
	GO_PREFIXES,
	GO_SPECIAL_RANGE_END,
	GO_SPECIAL_RANGE_START,
	MA_PREFIXES,
	MS_PREFIXES,
	PA_PREFIXES,
	PE_LEGACY_WEIGHTS,
	SP_FIRST_WEIGHTS,
	SP_SECOND_WEIGHTS,
	TO_TYPES,
} from "./constants";

export type { StateCode } from "../_internals/constants/states";

/** The parameters `isValidIe` takes: the registration and the state whose rule it is checked against. */
export type IsValidIeParams = {
	/** The inscrição estadual to validate. */
	value: string;
	/** The two letter state code the registration belongs to, e.g. `"SP"`. Case insensitive. */
	stateCode: StateCode;
};

type IeValidator = (ie: string) => boolean;

const checkLength = (ie: string, length: number | number[]): boolean => {
	if (typeof length === "number") return ie.length === length;
	return length.includes(ie.length);
};

const startsWithAny = (ie: string, prefixes: readonly string[]): boolean =>
	prefixes.some((prefix) => ie.startsWith(prefix));

type WeightedSumParams = {
	source: string;
	length: number;
	startWeight: number;
	wrapTo?: number;
};

const calculateWeightedSum = ({
	source,
	length,
	startWeight,
	wrapTo,
}: WeightedSumParams): number => {
	let weight = startWeight;
	let sum = 0;

	for (let i = 0; i < length; i++) {
		const digit = source.charCodeAt(i) - 48;
		sum += digit * weight;
		weight--;
		// Stryker disable next-line ConditionalExpression: for every current caller that omits wrapTo, the weight sequence is built to reach 1 only on the final iteration, so replacing this guard with `weight === 1` alone still only resets the (unused) weight after the loop's last read, which is unobservable.
		if (wrapTo !== undefined && weight === 1) {
			weight = wrapTo;
		}
	}

	return sum;
};

const sumWithWeights = (body: string, weights: readonly number[]): number => {
	let sum = 0;

	for (let i = 0; i < body.length; i++) {
		sum += (body.charCodeAt(i) - 48) * weights[i];
	}

	return sum;
};

const calculateMod11CheckDigit = (sum: number, modulus = 11): number => {
	const rest = sum % modulus;
	const digit = modulus - rest;
	return digit >= 10 ? 0 : digit;
};

const validateMod11Ie = (ie: string, prefixes?: readonly string[]): boolean => {
	if (!checkLength(ie, 9)) return false;
	if (prefixes && !startsWithAny(ie, prefixes)) return false;

	const body = ie.slice(0, 8);
	const sum = calculateWeightedSum({
		source: body,
		length: body.length,
		startWeight: body.length + 1,
	});
	const digit = calculateMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(8), 10) === digit;
};

const calculateDfCheckDigit = (body: string): number => {
	const sum = calculateWeightedSum({
		source: body,
		length: body.length,
		startWeight: body.length - 7,
		wrapTo: 9,
	});

	return calculateMod11CheckDigit(sum);
};

const SP_RURAL_PATTERN = /^P0\d{11}$/;
const SP_COMPANY_PATTERN = /^\d{12}$/;

/**
 * The 13 digit rule AC and DF share, each under its own prefixes.
 * @param {string} ie - The sanitized registration.
 * @param {readonly string[]} prefixes - The two digits the state's registrations may start with.
 * @returns {boolean} True when the registration follows the rule under one of those prefixes.
 */
const validateAcDfRule = (ie: string, prefixes: readonly string[]): boolean => {
	if (!checkLength(ie, 13)) return false;
	if (!startsWithAny(ie, prefixes)) return false;

	const body = ie.slice(0, 11);
	const firstDigit = calculateDfCheckDigit(body);
	const secondDigit = calculateDfCheckDigit(body + firstDigit);

	return (
		Number.parseInt(ie.charAt(11), 10) === firstDigit &&
		Number.parseInt(ie.charAt(12), 10) === secondDigit
	);
};

const validateAC: IeValidator = (ie) => validateAcDfRule(ie, AC_PREFIXES);

// AL writes its rule as the weighted sum times ten, modulo eleven, with a ten mapped back to 0,
// which is the complement the shared modulus 11 rule takes: both give 0 for a remainder of 0 or
// 1 and `11 - remainder` for every other one.
const validateAL: IeValidator = (ie) =>
	AL_COMPANY_TYPES.includes(ie.charAt(2)) && validateMod11Ie(ie, AL_PREFIXES);

const validateAP: IeValidator = (ie: string) => {
	if (!checkLength(ie, 9)) return false;
	if (!ie.startsWith("03")) return false;

	const length = ie.length;
	const position = length - 1;
	const body = ie.slice(0, position);
	const bodyNumber = Number.parseInt(body, 10);
	let p = 0;
	let d = 0;

	if (bodyNumber >= 3_000_001 && bodyNumber <= 3_017_000) {
		p = 5;
	} else if (bodyNumber >= 3_017_001 && bodyNumber <= 3_019_022) {
		p = 9;
		d = 1;
	}

	const sum = p + calculateWeightedSum({ source: ie, length: body.length, startWeight: length });

	let digit = 11 - (sum % 11);
	if (digit === 10) {
		digit = 0;
	}

	if (digit === 11) {
		digit = d;
	}

	return digit === Number.parseInt(ie.charAt(position), 10);
};

const validateBA: IeValidator = (ie: string) => {
	if (!checkLength(ie, [8, 9])) return false;

	const position = ie.length === 9 ? 1 : 0;
	const modulusDigit = Number.parseInt(ie.slice(position, position + 1), 10);
	const modulus = BA_MOD_10_DIGITS.includes(modulusDigit) ? 10 : 11;

	const body = ie.slice(0, -2);
	const firstSum = calculateWeightedSum({
		source: ie,
		length: body.length,
		startWeight: body.length + 1,
	});
	const secondDigit = calculateMod11CheckDigit(firstSum, modulus);

	const bodyWithSecond = body + secondDigit;
	const secondSum = calculateWeightedSum({
		source: bodyWithSecond,
		length: bodyWithSecond.length,
		startWeight: bodyWithSecond.length + 1,
	});
	const firstDigit = calculateMod11CheckDigit(secondSum, modulus);

	return (
		Number.parseInt(ie.slice(-2, -1), 10) === firstDigit &&
		Number.parseInt(ie.slice(-1), 10) === secondDigit
	);
};

const validateDF: IeValidator = (ie) => validateAcDfRule(ie, DF_PREFIXES);

const validateGO: IeValidator = (ie: string) => {
	if (!checkLength(ie, 9)) return false;
	if (!startsWithAny(ie, GO_PREFIXES)) return false;

	const body = ie.slice(0, 8);
	const bodyNumber = Number.parseInt(body, 10);
	const checkDigit = Number.parseInt(ie.charAt(8), 10);

	if (bodyNumber === GO_DUAL_DIGIT_IE) {
		return checkDigit === 0 || checkDigit === 1;
	}

	const sum = calculateWeightedSum({ source: ie, length: body.length, startWeight: 9 });
	const rest = sum % 11;
	let digit: number;

	if (rest === 0) {
		digit = 0;
	} else if (rest === 1) {
		digit = bodyNumber >= GO_SPECIAL_RANGE_START && bodyNumber <= GO_SPECIAL_RANGE_END ? 1 : 0;
	} else {
		digit = 11 - rest;
	}

	return checkDigit === digit;
};

const validateMA: IeValidator = (ie) => validateMod11Ie(ie, MA_PREFIXES);

const validateMG: IeValidator = (ie: string) => {
	if (!checkLength(ie, 13)) return false;

	const body = ie.slice(0, 11);
	const bodyWithZero = `${body.slice(0, 3)}0${body.slice(3)}`;

	// The first digit doubles every second character from the right and adds the digits of each
	// product, the modulus 10 rule `mod10` implements.
	const firstDigit = mod10(bodyWithZero);

	const bodyWithFirst = body + firstDigit;
	const secondSum = calculateWeightedSum({
		source: bodyWithFirst,
		length: bodyWithFirst.length,
		startWeight: 3,
		wrapTo: 11,
	});
	const secondDigit = calculateMod11CheckDigit(secondSum);

	return (
		Number.parseInt(ie.charAt(11), 10) === firstDigit &&
		Number.parseInt(ie.charAt(12), 10) === secondDigit
	);
};

// SEFAZ-MT now issues 9 digits and SINTEGRA prints 11: the 9 digit form is the 11 digit one
// without its two leading zeros, which add nothing to the weighted sum, so it is padded back.
const validateMT: IeValidator = (ie: string) => {
	if (!checkLength(ie, [9, 11])) return false;

	const padded = ie.padStart(11, "0");
	const body = padded.slice(0, 10);
	const sum = calculateWeightedSum({
		source: padded,
		length: body.length,
		startWeight: 3,
		wrapTo: 9,
	});
	const digit = calculateMod11CheckDigit(sum);

	return Number.parseInt(padded.charAt(10), 10) === digit;
};

const validateMS: IeValidator = (ie) => validateMod11Ie(ie, MS_PREFIXES);

const validatePA: IeValidator = (ie) => validateMod11Ie(ie, PA_PREFIXES);

// The old 14 digit CACEPE number: 13 principal digits and one check digit, `11 - remainder`,
// less 10 when that is above 9 (a remainder of 1 gives 0 and a remainder of 0 gives 1).
const validatePELegacy = (ie: string): boolean => {
	const digit = 11 - (sumWithWeights(ie.slice(0, 13), PE_LEGACY_WEIGHTS) % 11);

	return Number.parseInt(ie.charAt(13), 10) === (digit > 9 ? digit - 10 : digit);
};

const validatePE: IeValidator = (ie: string) => {
	if (checkLength(ie, 14)) return validatePELegacy(ie);
	if (!checkLength(ie, 9)) return false;

	const body = ie.slice(0, 7);
	const firstSum = calculateWeightedSum({
		source: ie,
		length: body.length,
		startWeight: body.length + 1,
	});
	const firstDigit = calculateMod11CheckDigit(firstSum);

	const bodyWithFirst = body + firstDigit;
	const secondSum = calculateWeightedSum({
		source: bodyWithFirst,
		length: bodyWithFirst.length,
		startWeight: bodyWithFirst.length + 1,
	});
	const secondDigit = calculateMod11CheckDigit(secondSum);

	return (
		Number.parseInt(ie.charAt(7), 10) === firstDigit &&
		Number.parseInt(ie.charAt(8), 10) === secondDigit
	);
};

const validatePR: IeValidator = (ie: string) => {
	if (!checkLength(ie, 10)) return false;

	const body = ie.slice(0, 8);
	const firstSum = calculateWeightedSum({
		source: ie,
		length: body.length,
		startWeight: body.length - 5,
		wrapTo: 7,
	});
	const firstDigit = calculateMod11CheckDigit(firstSum);

	const bodyWithFirst = body + firstDigit;
	const secondSum = calculateWeightedSum({
		source: bodyWithFirst,
		length: bodyWithFirst.length,
		startWeight: bodyWithFirst.length - 5,
		wrapTo: 7,
	});
	const secondDigit = calculateMod11CheckDigit(secondSum);

	return (
		Number.parseInt(ie.charAt(8), 10) === firstDigit &&
		Number.parseInt(ie.charAt(9), 10) === secondDigit
	);
};

const validateRJ: IeValidator = (ie: string) => {
	if (!checkLength(ie, 8)) return false;

	const body = ie.slice(0, 7);
	const sum = calculateWeightedSum({ source: ie, length: body.length, startWeight: 2, wrapTo: 7 });
	const digit = calculateMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(7), 10) === digit;
};

const validateRN: IeValidator = (ie: string) => {
	if (!checkLength(ie, [9, 10])) return false;
	if (!ie.startsWith("20")) return false;

	const length = ie.length;
	const position = length - 1;
	const body = ie.slice(0, position);
	const sum = calculateWeightedSum({ source: ie, length: body.length, startWeight: length });
	const digit = calculateMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(position), 10) === digit;
};

const validateRO: IeValidator = (ie: string) => {
	if (!checkLength(ie, 14)) return false;

	const length = ie.length;
	const position = length - 1;
	const body = ie.slice(0, position);
	const sum = calculateWeightedSum({ source: ie, length: body.length, startWeight: 6, wrapTo: 9 });

	const rest = sum % 11;
	let digit = 11 - rest;

	if (digit >= 10) {
		digit -= 10;
	}

	return digit === Number.parseInt(ie.charAt(position), 10);
};

const validateRR: IeValidator = (ie: string) => {
	if (!checkLength(ie, 9)) return false;
	if (!ie.startsWith("24")) return false;

	let weight = 1;
	let sum = 0;

	// Stryker disable next-line EqualityOperator: an extra iteration at i===8 would use weight 9, and any digit times 9 contributes 0 to the mod-9 result, so it is unobservable.
	for (let i = 0; i < 8; i++) {
		// Stryker disable next-line ArithmeticOperator: charCodeAt(i)+48 shifts each digit by 96; with weights 1..8 (summing to 36) the total shift is 96*36=3456, a multiple of 9, so the mod-9 result is unaffected.
		const digit = ie.charCodeAt(i) - 48;
		sum += digit * weight;
		weight++;
	}

	const rest = sum % 9;
	return Number.parseInt(ie.charAt(8), 10) === rest;
};

const validateRS: IeValidator = (ie: string) => {
	if (!checkLength(ie, 10)) return false;

	const body = ie.slice(0, 9);
	const sum = calculateWeightedSum({ source: ie, length: body.length, startWeight: 2, wrapTo: 9 });
	const digit = calculateMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(9), 10) === digit;
};

const calculateSpCheckDigit = (body: string, weights: readonly number[]): number =>
	(sumWithWeights(body, weights) % 11) % 10;

const validateSP: IeValidator = (ie: string) => {
	if (SP_RURAL_PATTERN.test(ie)) {
		const body = ie.slice(1, 9);
		const digit = calculateSpCheckDigit(body, SP_FIRST_WEIGHTS);

		return Number.parseInt(ie.charAt(9), 10) === digit;
	}

	if (!SP_COMPANY_PATTERN.test(ie)) return false;

	const firstDigit = calculateSpCheckDigit(ie.slice(0, 8), SP_FIRST_WEIGHTS);
	const secondDigit = calculateSpCheckDigit(ie.slice(0, 11), SP_SECOND_WEIGHTS);

	return (
		Number.parseInt(ie.charAt(8), 10) === firstDigit &&
		Number.parseInt(ie.charAt(11), 10) === secondDigit
	);
};

const validateTO: IeValidator = (ie: string) => {
	if (!checkLength(ie, [9, 11])) return false;

	const isLegacy = ie.length === 11;

	if (isLegacy && !TO_TYPES.includes(ie.slice(2, 4))) return false;

	const body = isLegacy ? ie.slice(0, 2) + ie.slice(4, 10) : ie.slice(0, 8);
	const position = isLegacy ? 10 : 8;
	const sum = calculateWeightedSum({ source: body, length: body.length, startWeight: 9 });
	const digit = calculateMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(position), 10) === digit;
};

const IE_VALIDATORS = {
	AC: validateAC,
	AL: validateAL,
	AP: validateAP,
	AM: validateMod11Ie,
	BA: validateBA,
	CE: validateMod11Ie,
	DF: validateDF,
	ES: validateMod11Ie,
	GO: validateGO,
	MA: validateMA,
	MG: validateMG,
	MT: validateMT,
	MS: validateMS,
	PA: validatePA,
	PB: validateMod11Ie,
	PE: validatePE,
	PI: validateMod11Ie,
	PR: validatePR,
	RJ: validateRJ,
	RN: validateRN,
	RO: validateRO,
	RR: validateRR,
	RS: validateRS,
	SC: validateMod11Ie,
	SE: validateMod11Ie,
	SP: validateSP,
	TO: validateTO,
} satisfies Record<StateCode, IeValidator>;

const validateIe = (stateCode: unknown, value: unknown): boolean => {
	if (typeof value !== "string") return false;

	const normalizedStateCode = normalizeStateCode(stateCode);

	if (!hasOwnKey(IE_VALIDATORS, normalizedStateCode)) return false;

	const sanitize = normalizedStateCode === "SP" ? sanitizeToAlphanumeric : sanitizeToDigits;

	return IE_VALIDATORS[normalizedStateCode](sanitize(value));
};

/**
 * Validates a Brazilian state tax registration number (IE).
 *
 * Per state notes:
 * - DF: the SINTEGRA page gives the format "07 300001 001 - DD" and the AC rule (weights 4, 3, 2,
 *   9 down to 2, then 5, 4, 3, 2, 9 down to 2, a 10 or 11 read as 0). It does not say 07 is
 *   fixed: its bracket marks "07 300001" as a whole as the "número seqüencial". SEFAZ-DF's own
 *   rule sheet (2013) does: "07 = campo fixo". The prefixes 07 and 08 are accepted, under the
 *   same rule: DF moved to 08 when the numbers starting with 07 ran out. No SEFAZ-DF act
 *   announces that change, and its rule sheet still says 07; the CF/DF validator of its service
 *   portal checks the 13 digits and both check digits and not the prefix. The prefix 08 rests on
 *   that validator and on the software notes below.
 * - GO: the official sources disagree on the prefixes, so all of them are accepted: 10, 11, 15 and
 *   20 to 29. The norm, IN nº 946/09-GSF, art. 39, I, as worded by IN nº 1.535/22-GSE (in force
 *   since 26/10/2022), gives 10 and 20 for a pessoa jurídica and 11 for a pessoa física; the
 *   Secretaria da Economia has issued 20 to new companies since 13/01/2023, when the range
 *   starting with 10 ran out. The SINTEGRA page (updated 02/09/2022) gives "10 ou 11 ou 20 a 29".
 *   The Secretaria's roteiro de crítica (published 20/08/2012) gives "10 ou 11 ou 15", the
 *   10103105 to 10119997 range and the dual digit registration 11094402. No norm names 15 or 21
 *   to 29. The sources agree on the weights and the modulus, not on the remainder 1: the SINTEGRA
 *   page (2022) always reads a remainder of 0 or 1 as 0, while the 2012 roteiro reads a remainder
 *   of 1 as 1 in the range 10103105 to 10119997 and accepts both digits for 11094402. This
 *   library follows the roteiro, as 2.4.0 did, so `101031050` is rejected.
 * - MG: the first check digit is the sum of the product digits subtracted from "a primeira dezena
 *   exata imediatamente superior". A sum that is already a multiple of ten is read as its own
 *   ten, so the digit is 0 rather than 10, the only reading that yields a single digit.
 * - MS: the prefixes are 28 and 50, the two the SINTEGRA page gives (updated 19/04/2024: "Os dois
 *   primeiros dígitos serão sempre representados pelos números "28" ou "50""); a SEFAZ-MS
 *   communiqué on its e-CCE register says new company registrations start with 50. The only norm,
 *   Resolução/SEF nº 1.344/1999, art. 1º, still gives 28 alone ("o primeiro dígito será sempre
 *   representado pelo número 2", "o segundo dígito será sempre representado pelo número 8"); no
 *   act amending it could be found. The check digit rule is the same in all of them.
 * - MT: 9 digits, the form Portaria SEFAZ-MT nº 59/2025, art. 8º, § 1º prescribes (as did
 *   art. 6º of Portaria nº 5/2014, which it revoked), or the 11 digits the SINTEGRA page prints.
 *   No norm fixes the prefix. No official text gives the check digit rule of the 9 digit form:
 *   this library reads it as the 11 digit one padded with two leading zeros, which the weights 3
 *   and 2 turn into nothing, so "130000019" and "00130000019" are the same registration.
 * - PA: the prefixes are 15 and 75 to 79, the six the SINTEGRA page lists ("15: Número Padrão
 *   Pará", and the same for 75, 76, 77, 78 and 79). SEFA-PA's notice of 08/10/2024 announces 75
 *   alone and points to that page for the details; no SEFA-PA notice or act names 76 to 79, which
 *   rest on the page only.
 * - RR: the prefix 24 is required. The SINTEGRA page only says "os dois primeiros indicativos do
 *   Estado da Federação" and never writes 24; the prefix is read from its ten valid examples and
 *   its worked example, which all start with 24.
 * - SP: letters other than "P" are rejected on purpose, a deliberate deviation from the Regra
 *   Geral of the SINTEGRA page, which ignores them instead; punctuation and spaces are ignored as
 *   it says. A produtor rural registration is "P" then "0MMMSSSSD000", the zero included. The
 *   "P" may be written in lower case: the registration is upper-cased before it is checked, a
 *   convenience the page does not forbid, since it only tells which characters to ignore.
 * - AL: the third digit is the tipo de empresa and must be one of the five the SINTEGRA page lists,
 *   0 (Normal), 3 (Produtor Rural), 5 (Substituta), 7 (Micro-Empresa Ambulante) or
 *   8 (Micro-Empresa). The page gives the list as the meaning of that digit without calling it
 *   closed; no SEFAZ-AL text gives another value.
 * - AM: the SINTEGRA page gives two branches: "Se Soma < 11 Então Dígito = 11 - Soma" and
 *   "Senão Quociente = Soma / 11; Se Resto < ou = 1 Então Dígito = 0 Senão Dígito = 11 - Resto".
 *   It does not define "Resto" and does not say what happens to a Soma of 0 or 1, for which the
 *   first branch gives 11 or 10, not a digit. This library's reading: "Resto" is Soma modulo 11,
 *   and a Soma of 0 or 1 falls under "Resto < ou = 1", giving 0. For a Soma of 2 to 10 both
 *   branches give the same digit, so AM uses the shared modulus 11 rule (weights 9 down to 2, a
 *   remainder of 0 or 1 giving 0).
 * - PE: the 9 digit eFisco number (7 digits and 2 check digits) and the old 14 digit CACEPE
 *   number (13 digits and 1 check digit), both on the SINTEGRA page. Portaria SF nº 087/2007
 *   converted every 14 digit number into a 9 digit one (the first 6 digits dropped, the next 7
 *   kept, a new pair of check digits) but set no date after which the old number is void:
 *   Portaria SF nº 124/2008 removed the end date for its use in the e-Fisco systems, and the
 *   SEFAZ-PE consolidated legislation still lists Portaria 087/2007 in force. Only AIDFs granted
 *   from 10/07/2007 on must print the new number.
 * - TO: the 9 digit form is the one in force: Portaria SEFAZ-TO nº 676/2002, art. 3º, and the
 *   RICMS-TO (Decreto nº 2.912/2006), art. 90, give "nove dígitos": the state prefix (2), the
 *   sequential number (6) and the check digit (1). SEFAZ-TO's roteiro checks it with weights 9
 *   down to 2 over the first eight digits. Neither norm fixes the prefix, so it is not checked.
 *   The SINTEGRA page documents only the old 11 digit form, whose tipo digits in positions 3 and
 *   4 are left out of the sum and may only be 01, 02, 03 or 99; it is still accepted, although
 *   the Portaria let it be used only until the validity of the forms that carry it and, in the
 *   transit of goods, until 31/12/2004.
 * - An all zero registration is accepted for every state whose published formula yields a
 *   check digit of 0 for it (AM, BA with 8 or 9 digits, CE, ES, MG, MT with 9 or 11 digits, PB,
 *   PE with 9 digits, PI, PR, RJ, RS, SC, SE, SP and TO with 9 digits), unlike isValidCpf and
 *   isValidCnpj, which reject repeated digits. AM is on that list through this library's reading
 *   of its formula (see the AM note): the page's first branch alone would give 11.
 *
 * The state can also be passed first and the registration second, `isValidIe('SP', '110042490114')`,
 * the 2.3.0 form, which still works and is deprecated. The two forms are told apart by the first
 * argument: an object is the parameters of the current form, a string the state code of the
 * deprecated one, and anything else returns false.
 *
 * @param {IsValidIeParams} params - The registration to validate and the state to validate it against
 * @param {string} params.value - The state registration number to validate
 * @param {StateCode} params.stateCode - The state abbreviation (e.g., 'SP', 'RJ', 'MG')
 * @returns {boolean} True if the state registration number is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidIe({ value: '110042490114', stateCode: 'SP' }); // true
 * isValidIe({ value: 'P011004243002', stateCode: 'SP' }); // true
 * isValidIe({ value: '12345', stateCode: 'RJ' }); // false
 * isValidIe({ value: '109161793', stateCode: 'go' as StateCode }); // true (case-insensitive)
 * isValidIe({ value: '109161793', stateCode: ' GO ' as StateCode }); // true (surrounding whitespace ignored)
 * isValidIe({ value: '200000004', stateCode: 'GO' }); // true (prefix 20)
 * isValidIe({ value: '130000019', stateCode: 'MT' }); // true (9 digits)
 * ```
 *
 * @see Official: http://www.sintegra.gov.br/insc_est.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_AC.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_AL.html
 * "FORMAÇÃO: 24XNNNNND, sendo: 24 – Código do Estado; X – Tipo de empresa (0-Normal, 3-Produtor
 * Rural, 5-Substituta, 7- Micro-Empresa Ambulante, 8-Micro-Empresa)".
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_AM.html
 * "Soma = (Hx9)+(Gx8)+(Fx7)+(Ex6)+(Dx5)+(Cx4)+(Bx3)+(Ax2); Se Soma < 11 Então Dígito = 11 - Soma;
 * Senão Quociente = Soma / 11; Se Resto < ou = 1 Então Dígito = 0; Senão Dígito = 11 - Resto".
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_AP.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_BA.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_CE.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_DF.html
 * The rule is an image: "07 300001 001 - DD", "07 300001" bracketed as "número seqüencial",
 * "001, se matriz; 002, 003, ..., se filial(is)", "multiplicar cada algarismo da inscrição, da
 * direita para a esquerda, pela seqüência de 2 a 9", "se o resultado obtido for igual a 10 ou
 * 11, o primeiro dígito verificador será igual a zero", worked example 073.00001.001-09.
 * @see Official: https://static.fazenda.df.gov.br/arquivos/im1_numero_inscricao_cfdf_sintegra.gif
 * SEFAZ-DF, "Cálculo do Digito Verificador do CFDF" (2013): "07 00001 001 - DD: 07 = campo
 * fixo; 00001 = número seqüencial; 001 = 001, se matriz; 002, 003, ..., se filial(is)", and the
 * same módulo 11 rule as the SINTEGRA page.
 * @see Official: https://ww1.receita.fazenda.df.gov.br/iss/situcao-cadastral
 * Receita DF service portal: its CF/DF validator requires 13 digits and recomputes both check
 * digits (weights 2 to 9 from the right, a remainder of 0 or 1 giving 0), whatever the prefix.
 * @see Based on: https://tdn.totvs.com/pages/viewpage.action?pageId=566472384
 * TOTVS release note DFWKFOUNDATION-4046: DF registrations may start with 07 or 08, the numbers
 * starting with 07 having run out at 07.999.999, and per the DF tax authority the check digit
 * rule did not change.
 * @see Based on: https://github.com/caelum/caelum-stella/issues/267
 * @see Based on: https://github.com/caelum/caelum-stella/issues/269
 * Reports of valid DF registrations starting with 08 being rejected.
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_ES.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_GO.html
 * Updated 02/09/2022: "8 dígitos (ABCDEFGH) + 1 dígito verificador (I); onde AB pode ser igual a
 * 10 ou 11 ou 20 a 29", the only source of the prefixes 21 to 29. The prefix 15 and the special
 * ranges come from the roteiro below.
 * @see Official: https://appasp.economia.go.gov.br/Legislacao/arquivos/secretario/in/IN_0946_2009.htm
 * IN nº 946/09-GSF, art. 39, I, as worded by IN nº 1.535/22-GSE: "os 2 (dois) primeiros formam
 * os números 10 (dez) ou 20 (vinte), que identificam o contribuinte pessoa jurídica, ou 11 (onze),
 * que identifica o contribuinte pessoa física".
 * @see Official: https://appasp.economia.go.gov.br/Legislacao/arquivos/secretario/in/IN_1535_2022.htm
 * IN nº 1.535/22-GSE (DOE 26/10/2022), art. 1º, the wording above.
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_MA.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_MG.html
 * D1: "Subtrai-se o resultado da soma do item anterior, da primeira dezena exata imediatamente
 * superior"; a sum that is a multiple of ten gives 0 (see the MG note above).
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_MS.html
 * Updated 19/04/2024: "Os dois primeiros dígitos serão sempre representados pelos números "28" ou
 * "50"", then the formula of Resolução/SEF nº 1.344/1999, art. 2º.
 * @see Official: https://aacpdappls.net.ms.gov.br/appls/legislacao/serc/legato.nsf/e5c724b4c70cb1da04256b1f005348a8/54d078bcf5f3198a04256ad60073bf8b?OpenDocument
 * Resolução/SEF nº 1.344/1999 (DOE 18/05/1999), art. 1º: "I – o primeiro dígito será sempre
 * representado pelo número 2; II - o segundo dígito será sempre representado pelo número 8": the
 * prefix 28 alone; art. 2º: the check digit rule.
 * @see Based on: https://crcms.org.br/sefaz-ms-vai-adotar-novo-sistema-de-cadastro-fiscal-o-e-cce-veja-o-que-vai-mudar-2/
 * CRC-MS (03/09/2025) relaying a SEFAZ-MS communiqué on the e-CCE register: new company (CCIS)
 * registrations "será iniciada com o dígito 50", those of the Cadastro da Agropecuária keep 28,
 * with no range reserved to a registration type. No SEFAZ-MS page carrying that text was found.
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_MT.html
 * "FORMATO: NNNNNNNNNN-D", weights 3, 2 and 9 down to 2, example "0013000001-9": the 11 digit form.
 * @see Official: https://app1.sefaz.mt.gov.br/Sistema/Legislacao/legislacaotribut.nsf/173e6c0d2202fdcb03258b1700659f1e/0d06efc6c2fa7bc303258c6c004c4788
 * Portaria SEFAZ-MT nº 59/2025 (DOE 14/04/2025), art. 8º, § 1º: "A identificação numérica do
 * contribuinte no CCE/MT é composta de 9 (nove) dígitos, sendo os 8 (oito) primeiros sequenciais
 * e o último algarismo configura o dígito verificador." Its art. 59 revokes Portaria nº 5/2014,
 * whose art. 6º, as worded by Portaria nº 86/2023, said the same.
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_PA.html
 * Updated 11/06/2024: "Composição: 15NNNNNN-D; 75NNNNNN-D; 76NNNNNN-D; 77NNNNNN-D; 78NNNNNN-D;
 * 79 NNNNNN-D", each "Número Padrão Pará", weights 2 to 9 from the right, "Se o resto da divisão
 * é 0 ou 1, o dígito é 0", worked examples 15999999-5 and 75000002-3.
 * @see Official: https://site-sefa-wordpress.sefa.pa.gov.br/2024/10/08/inscricoes-estaduais-podem-iniciar-com-numeracao-75/
 * SEFA-PA, "Inscrições estaduais podem iniciar com numeração 75" (08/10/2024): "A partir do dia
 * 07/10/2024 as novas Inscrições Estaduais [...] também poderão ser iniciadas pelo número "75"",
 * "75.XXX.XXX-X", and "O detalhamento sobre a IE do Pará está no seguinte link:
 * http://www.sintegra.gov.br/Cad_Estados/cad_PA.html".
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_PB.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_PE.html
 * eFisco: weights 8 down to 2, then 9 down to 2, "Se o resto da divisão for igual a 1 ou 0, o
 * primeiro dígito será igual a zero", worked example 0321418-40. "Inscrição Estadual Antiga": "O
 * número de inscrição estadual no Cadastro de Contribuintes do Estado de Pernambuco - CACEPE
 * possui 14 algarismos (dígitos), sendo 13 principais e 1 verificador", weights 5, 4, 3, 2, 1, 9
 * down to 2, "Quando essa diferença for maior que "9", subtraia "10" unidades", worked example
 * 18.1.001.0000004-9.
 * @see Official: https://www.sefaz.pe.gov.br/Legislacao/Tributaria/Documents/Legislacao/Portarias/2007/Port087_2007.htm
 * Portaria SF nº 087/2007, item I: the CACEPE number, "constituído de 14 (quatorze) algarismos,
 * passa a ter 9 (nove)"; item III: from 10/07/2007 new AIDFs print "apenas da nova inscrição".
 * @see Official: https://www.sefaz.pe.gov.br/Legislacao/Tributaria/Documents/legislacao/Portarias/2008/Port124_2008.htm
 * Portaria SF nº 124/2008: "a conveniência de não estabelecer termo final em relação ao prazo
 * referente à utilização da antiga inscrição".
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_PI.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_PR.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RJ.html
 * The rule is an image: the mask "99.999.99-3" (8 digits), the sum "(N1x2)+(N2x7)+(N3x6)+(N4x5)
 * +(N5x4)+(N6x3)+(N7x2)" divided by 11, and "Se o resto da divisão por 11 for menor ou igual à 1
 * (um), Então o dígito verificador será = 0 (zero)".
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RN.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RO.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RR.html
 * "O Número de Inscrição Estadual é composto por 9 Dígitos, sendo os dois primeiros indicativos
 * do Estado da Federação", "Dígito Verificador de módulo 9", examples 24006628-1 to 24001340-7.
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RS.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_SC.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_SE.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_SP.html
 * Item II, produtor rural: "Inicia sempre com "P" e apresenta a sequência 0MMMSSSSD000", the
 * source of the zero required after the "P"; worked example P-01100424.3/002 (P011004243002).
 * The page's closing line, "Fica então formada a inscrição P-011000424.3/002", has one "0" too
 * many (14 characters) and is not a valid registration.
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_TO.html
 * "Aplica-se o cálculo "módulo 11" com os algarismos 1,2,5,6,7,8,9,10 da Inscrição Estadual";
 * "Os dígitos "3" e "4" não entram no cálculo", which may only be 01, 02, 03 or 99.
 * @see Official: https://web.archive.org/web/20240625000620id_/http://www2.sefaz.to.gov.br/Servicos/Sintegra/calinse.htm
 * SEFAZ-TO's own roteiro (archived copy of 25/06/2024; the original address no longer serves
 * it): "Cálculo da Inscrição Estadual Nova (Em vigor desde junho de 2.002)", worked example
 * 29 022783 6, weights 9 down to 2, "SE O RESTO DA DIVISÃO FOR MENOR QUE DOIS DÍGITO = ZERO".
 * @see Official: https://dtri.sefaz.to.gov.br/legislacao/ntributaria/portarias/sefaz/Portaria676-02.htm
 * Portaria SEFAZ-TO nº 676/2002, art. 3º: "o número de inscrição estadual é composto de nove
 * dígitos que representam: I – os dois primeiros algarismos, o prefixo do Estado; II – os seis
 * seguintes, o número seqüencial da inscrição; III – o último algarismo, o dígito verificador ou
 * de segurança"; § 2º and § 4º limit the use of the eleven digit number.
 * @see Official: https://dtri.sefaz.to.gov.br/legislacao/ntributaria/decretos/Decreto2.912-06.htm
 * RICMS-TO, Decreto nº 2.912/2006, art. 90, unchanged up to Decreto nº 7.219/2026: the same nine
 * digits as the Portaria's art. 3º.
 * @see Official: https://goias.gov.br/economia/roteiro-de-critica-da-inscricao-estadual-de-goias/
 * The Secretaria da Economia's roteiro de crítica (20/08/2012): "onde AB pode ser igual a 10 ou
 * 11 ou 15", the only source of the prefix 15 and of the special ranges.
 * @see Official: https://goias.gov.br/economia/contribuintes-goianos-passam-a-ter-novo-numero-de-inscricao-estadual/
 * Secretaria da Economia notice (20/01/2023): company (Pessoa Jurídica) registrations made from
 * 13/01/2023 start with 20, "a faixa de numeração iniciada com o dígito 10 se esgotou"; those of
 * Pessoas Físicas still start with 11.
 */
export function isValidIe(params: IsValidIeParams): boolean;
/**
 * Validates a Brazilian state tax registration number (IE) with the state given first. See the
 * overload taking the parameters object for the full documentation.
 *
 * @param {StateCode} stateCode - The state abbreviation (e.g., 'SP', 'RJ', 'MG')
 * @param {string} ie - The state registration number to validate
 * @returns {boolean} True if the state registration number is valid, false otherwise
 *
 * @deprecated Use the object form, `isValidIe({ value, stateCode })`.
 */
export function isValidIe(stateCode: StateCode, ie: string): boolean;
export function isValidIe(paramsOrStateCode: IsValidIeParams | StateCode, ie?: string): boolean {
	// The two call forms are told apart by the first argument alone: a string is the state code of
	// the deprecated `(stateCode, ie)` form, anything else is read as the parameters object of the
	// current one (a primitive has no `stateCode`, so it fails the validation like any bad input).
	if (typeof paramsOrStateCode === "string") return validateIe(paramsOrStateCode, ie);
	if (isNullish(paramsOrStateCode)) return false;

	return validateIe(paramsOrStateCode.stateCode, paramsOrStateCode.value);
}
