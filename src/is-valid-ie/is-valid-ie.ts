import { type StateCode } from "../_internals/constants/states";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { mod10 } from "../_internals/mod10/mod10";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import {
	AL_PREFIXES,
	BA_MOD_10_DIGITS,
	GO_DUAL_DIGIT_IE,
	GO_PREFIXES,
	GO_SPECIAL_RANGE_END,
	GO_SPECIAL_RANGE_START,
	MA_PREFIXES,
	MS_PREFIXES,
	PA_PREFIXES,
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

const SP_RURAL_PATTERN = /^P\d{12}$/;
const SP_COMPANY_PATTERN = /^\d{12}$/;

/**
 * The 13 digit rule AC and DF share, each under its own prefix.
 * @param {string} ie - The sanitized registration.
 * @param {string} prefix - The two digits the state's registrations start with.
 * @returns {boolean} True when the registration follows the rule under that prefix.
 */
const validateAcDfRule = (ie: string, prefix: string): boolean => {
	if (!checkLength(ie, 13)) return false;
	if (!ie.startsWith(prefix)) return false;

	const body = ie.slice(0, 11);
	const firstDigit = calculateDfCheckDigit(body);
	const secondDigit = calculateDfCheckDigit(body + firstDigit);

	return (
		Number.parseInt(ie.charAt(11), 10) === firstDigit &&
		Number.parseInt(ie.charAt(12), 10) === secondDigit
	);
};

const validateAC: IeValidator = (ie) => validateAcDfRule(ie, "01");

// AL writes its rule as the weighted sum times ten, modulo eleven, with a ten mapped back to 0,
// which is the complement the shared modulus 11 rule takes: both give 0 for a remainder of 0 or
// 1 and `11 - remainder` for every other one.
const validateAL: IeValidator = (ie) => validateMod11Ie(ie, AL_PREFIXES);

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

const validateDF: IeValidator = (ie) => validateAcDfRule(ie, "07");

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

const validateMT: IeValidator = (ie: string) => {
	if (!checkLength(ie, 11)) return false;

	const body = ie.slice(0, 10);
	const sum = calculateWeightedSum({ source: ie, length: body.length, startWeight: 3, wrapTo: 9 });
	const digit = calculateMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(10), 10) === digit;
};

const validateMS: IeValidator = (ie) => validateMod11Ie(ie, MS_PREFIXES);

const validatePA: IeValidator = (ie) => validateMod11Ie(ie, PA_PREFIXES);

const validatePE: IeValidator = (ie: string) => {
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

const calculateSpCheckDigit = (body: string, weights: readonly number[]): number => {
	let sum = 0;

	for (let i = 0; i < body.length; i++) {
		sum += (body.charCodeAt(i) - 48) * weights[i];
	}

	return (sum % 11) % 10;
};

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

const IE_VALIDATORS: Record<string, IeValidator | undefined> = {
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
	if (typeof stateCode !== "string") return false;
	if (typeof value !== "string") return false;

	const normalizedStateCode = stateCode.toUpperCase();

	const validator = Object.hasOwn(IE_VALIDATORS, normalizedStateCode)
		? IE_VALIDATORS[normalizedStateCode]
		: undefined;
	if (!validator) return false;

	const sanitize = normalizedStateCode === "SP" ? sanitizeToAlphanumeric : sanitizeToDigits;

	return validator(sanitize(value));
};

/**
 * Validates a Brazilian state tax registration number (IE).
 *
 * Per state notes, all of them deliberate and unchanged since 2.3.0:
 * - DF: the SINTEGRA page is published but empty, and no SEFAZ-DF roteiro is published either,
 *   so DF follows the 13 digit AC rule under the prefix 07.
 * - GO: the SINTEGRA page is superseded by the SEFAZ-GO roteiro, which is the source of the
 *   prefixes 10, 11 and 15, of the 10103105 to 10119997 range and of the dual digit
 *   registration 11094402.
 * - RJ: the SINTEGRA page publishes only the modulus rule; the 8 digit length and the weights
 *   2, 7, 6, 5, 4, 3 and 2 come from the SINTEGRA validator itself, not from the page.
 * - SP: characters other than "P" and digits are rejected on purpose, a deliberate deviation
 *   from the Regra Geral of the SINTEGRA page, which ignores them instead.
 * - AL: the tipo de empresa digit (third position) is not restricted to 0, 3, 5, 7 and 8.
 * - PE: only the current 9 digit eFisco format is accepted; the old 14 digit CACEPE format
 *   documented on the same page is not.
 * - TO: the SINTEGRA page documents only the 11 digit form, the one carrying the tipo digits in
 *   positions 3 and 4. The 9 digit form is also accepted, applying the same modulus 11 rule with
 *   weights 9 down to 2 to the first eight digits; it is 2.3.0 behavior kept for compatibility
 *   and no published SEFAZ-TO roteiro covers it.
 * - An all zero registration is accepted for every state whose published formula yields a
 *   check digit of 0 for it (AM, BA with 8 or 9 digits, CE, ES, MG, MT, PB, PE, PI, PR, RJ, RS,
 *   SC, SE, SP and TO with 9 digits), unlike isValidCpf and isValidCnpj, which reject repeated
 *   digits. AM is on that list through the second branch of its published formula only: the
 *   page's first branch, "Se Soma < 11 Então Dígito = 11 - Soma", gives 11 for an all zero
 *   registration, while the "resto <= 1 ⇒ 0" branch, the one implemented here, gives 0.
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
 * ```
 *
 * @see Official: http://www.sintegra.gov.br/insc_est.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_AC.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_AL.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_AM.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_AP.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_BA.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_CE.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_DF.html
 * The page is published but empty: it carries no format, no weights and no worked example,
 * and no SEFAZ-DF roteiro is published either, so DF follows the 13 digit AC rule under the
 * prefix 07.
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_ES.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_GO.html
 * Superseded for Goiás by the SEFAZ-GO roteiro below: this page still gives the prefixes as
 * 10, 11 or 20 to 29 and knows nothing of the special ranges.
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_MA.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_MG.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_MS.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_MT.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_PA.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_PB.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_PE.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_PI.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_PR.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RJ.html
 * Publishes only the modulus rule: the 8 digit length and the weights 2, 7, 6, 5, 4, 3 and 2
 * come from the SINTEGRA validator itself, not from this page.
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RN.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RO.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RR.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RS.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_SC.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_SE.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_SP.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_TO.html
 * Documents only the 11 digit form, with the tipo digits 01, 02, 03 and 99 in positions 3 and 4;
 * the 9 digit form the validator also accepts is not covered by this page or by any other
 * published SEFAZ-TO roteiro.
 * @see Official: https://goias.gov.br/economia/roteiro-de-critica-da-inscricao-estadual-de-goias/
 * SEFAZ-GO's roteiro de crítica, the source of the Goiás prefixes and special ranges.
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
