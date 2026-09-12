import { type StateCode } from "../_internals/constants/states";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import {
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

type IeValidator = (ie: string) => boolean;

const checkLength = (ie: string, length: number | number[]): boolean => {
	if (typeof length === "number") return ie.length === length;
	return length.includes(ie.length);
};

const startsWithAny = (ie: string, prefixes: readonly string[]): boolean =>
	prefixes.some((prefix) => ie.startsWith(prefix));

const startsWith = (ie: string, prefix: string): boolean => startsWithAny(ie, [prefix]);

type WeightedSumParams = {
	source: string;
	length: number;
	startWeight: number;
	wrapTo?: number;
};

const calcWeightedSum = ({ source, length, startWeight, wrapTo }: WeightedSumParams): number => {
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

const calcMod11CheckDigit = (sum: number, mod = 11): number => {
	const rest = sum % mod;
	const dig = mod - rest;
	return dig >= 10 ? 0 : dig;
};

const validateMod11Ie = (ie: string, prefixes?: readonly string[]): boolean => {
	if (!checkLength(ie, 9)) return false;
	if (prefixes && !startsWithAny(ie, prefixes)) return false;

	const body = ie.slice(0, 8);
	const sum = calcWeightedSum({ source: body, length: body.length, startWeight: body.length + 1 });
	const dig = calcMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(8), 10) === dig;
};

const calcDFDigit = (body: string): number => {
	const sum = calcWeightedSum({
		source: body,
		length: body.length,
		startWeight: body.length - 7,
		wrapTo: 9,
	});

	return calcMod11CheckDigit(sum);
};

const SP_RURAL_PATTERN = /^P\d{12}$/;
const SP_COMPANY_PATTERN = /^\d{12}$/;

const validateAC: IeValidator = (ie: string) => {
	if (!checkLength(ie, 13)) return false;
	if (!startsWith(ie, "01")) return false;

	const body = ie.slice(0, 11);
	const firstDig = calcDFDigit(body);
	const secondDig = calcDFDigit(body + firstDig);

	return (
		Number.parseInt(ie.charAt(11), 10) === firstDig &&
		Number.parseInt(ie.charAt(12), 10) === secondDig
	);
};

const validateAL: IeValidator = (ie: string) => {
	if (!checkLength(ie, 9)) return false;
	if (!startsWith(ie, "24")) return false;

	let weight = 9;
	const position = 8;
	let sum = 0;

	for (let i = 0; i < position; i++) {
		// Stryker disable next-line ArithmeticOperator: charCodeAt(i)+48 shifts each digit by 96; with weights 9..2 (summing to 44) the total shift is 96*44=4224=384*11, a multiple of 11, so the mod-11 result is unaffected.
		const digit = ie.charCodeAt(i) - 48;
		sum += digit * weight;
		weight--;
	}

	const product = sum * 10;
	let digit = product - Math.floor(product / 11) * 11;
	if (digit >= 10) {
		digit = 0;
	}

	return digit === Number.parseInt(ie.charAt(position), 10);
};

const validateAP: IeValidator = (ie: string) => {
	if (!checkLength(ie, 9)) return false;
	if (!startsWith(ie, "03")) return false;

	const length = ie.length;
	const position = length - 1;
	let weight = length;
	const body = ie.slice(0, position);
	const bodyInt = Number.parseInt(body, 10);
	let p = 0;
	let d = 0;

	if (bodyInt >= 3_000_001 && bodyInt <= 3_017_000) {
		p = 5;
		d = 0;
	} else if (bodyInt >= 3_017_001 && bodyInt <= 3_019_022) {
		p = 9;
		d = 1;
	}

	let sum = p;
	for (let i = 0; i < body.length; i++) {
		// Stryker disable next-line ArithmeticOperator: charCodeAt(i)+48 shifts each digit by 96; with weights 9..2 (summing to 44) the total shift is 96*44=4224=384*11, a multiple of 11, so the mod-11 result is unaffected.
		const digit = ie.charCodeAt(i) - 48;
		sum += digit * weight;
		weight--;
	}

	let dig = 11 - (sum % 11);
	if (dig === 10) {
		dig = 0;
	}

	if (dig === 11) {
		dig = d;
	}

	return dig === Number.parseInt(ie.charAt(position), 10);
};

const validateAM: IeValidator = (ie) => validateMod11Ie(ie);

const validateBA: IeValidator = (ie: string) => {
	if (!checkLength(ie, [8, 9])) return false;

	const pos = ie.length === 9 ? 1 : 0;
	const charAt = Number.parseInt(ie.slice(pos, pos + 1), 10);
	const mod = BA_MOD_10_DIGITS.includes(charAt) ? 10 : 11;

	const body = ie.slice(0, -2);
	const firstSum = calcWeightedSum({
		source: ie,
		length: body.length,
		startWeight: body.length + 1,
	});
	const secondDig = calcMod11CheckDigit(firstSum, mod);

	const bodyWithSecond = body + secondDig;
	const secondSum = calcWeightedSum({
		source: bodyWithSecond,
		length: bodyWithSecond.length,
		startWeight: bodyWithSecond.length + 1,
	});
	const firstDig = calcMod11CheckDigit(secondSum, mod);

	return (
		Number.parseInt(ie.slice(-2, -1), 10) === firstDig &&
		Number.parseInt(ie.slice(-1), 10) === secondDig
	);
};

const validateCE: IeValidator = (ie) => validateMod11Ie(ie);

const validateDF: IeValidator = (ie: string) => {
	if (!checkLength(ie, 13)) return false;
	if (!startsWith(ie, "07")) return false;

	const length = ie.length;
	const body = ie.slice(0, length - 2);

	const firstDig = calcDFDigit(body);
	const secondDig = calcDFDigit(body + firstDig);

	return (
		Number.parseInt(ie.charAt(length - 2), 10) === firstDig &&
		Number.parseInt(ie.charAt(length - 1), 10) === secondDig
	);
};

const validateES: IeValidator = (ie) => validateMod11Ie(ie);

const validateGO: IeValidator = (ie: string) => {
	if (!checkLength(ie, 9)) return false;
	if (!startsWithAny(ie, GO_PREFIXES)) return false;

	const body = ie.slice(0, 8);
	const bodyInt = Number.parseInt(body, 10);
	const checkDigit = Number.parseInt(ie.charAt(8), 10);

	if (bodyInt === GO_DUAL_DIGIT_IE) {
		return checkDigit === 0 || checkDigit === 1;
	}

	const sum = calcWeightedSum({ source: ie, length: body.length, startWeight: 9 });
	const rest = sum % 11;
	let dig: number;

	if (rest === 0) {
		dig = 0;
	} else if (rest === 1) {
		dig = bodyInt >= GO_SPECIAL_RANGE_START && bodyInt <= GO_SPECIAL_RANGE_END ? 1 : 0;
	} else {
		dig = 11 - rest;
	}

	return checkDigit === dig;
};

const validateMA: IeValidator = (ie) => validateMod11Ie(ie, MA_PREFIXES);

const validateMG: IeValidator = (ie: string) => {
	if (!checkLength(ie, 13)) return false;

	const body = ie.slice(0, 11);
	const bodyWithZero = `${body.slice(0, 3)}0${body.slice(3)}`;

	let concat = "";
	for (let i = 0; i < bodyWithZero.length; i++) {
		const digit = bodyWithZero.charCodeAt(i) - 48;
		const weight = i % 2 === 1 ? 2 : 1;
		concat += String(digit * weight);
	}

	let sum = 0;
	for (let i = 0; i < concat.length; i++) {
		sum += concat.charCodeAt(i) - 48;
	}

	const lastCharInt = sum % 10;
	const firstDig = lastCharInt === 0 ? 0 : 10 - lastCharInt;

	let weight = 3;
	let sum2 = 0;
	const bodyWithFirst = body + firstDig;
	for (let i = 0; i < bodyWithFirst.length; i++) {
		const digit = bodyWithFirst.charCodeAt(i) - 48;
		sum2 += digit * weight;
		weight--;
		if (weight === 1) {
			weight = 11;
		}
	}

	const rest = sum2 % 11;
	let secondDig = 11 - rest;
	if (secondDig >= 10) {
		secondDig = 0;
	}

	return (
		Number.parseInt(ie.charAt(11), 10) === firstDig &&
		Number.parseInt(ie.charAt(12), 10) === secondDig
	);
};

const validateMT: IeValidator = (ie: string) => {
	if (!checkLength(ie, 11)) return false;

	const body = ie.slice(0, 10);
	const sum = calcWeightedSum({ source: ie, length: body.length, startWeight: 3, wrapTo: 9 });
	const dig = calcMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(10), 10) === dig;
};

const validateMS: IeValidator = (ie) => validateMod11Ie(ie, MS_PREFIXES);

const validatePA: IeValidator = (ie) => validateMod11Ie(ie, PA_PREFIXES);

const validatePB: IeValidator = (ie) => validateMod11Ie(ie);

const validatePE: IeValidator = (ie: string) => {
	if (!checkLength(ie, 9)) return false;

	const body = ie.slice(0, 7);
	const firstSum = calcWeightedSum({
		source: ie,
		length: body.length,
		startWeight: body.length + 1,
	});
	const firstDig = calcMod11CheckDigit(firstSum);

	const bodyWithFirst = body + firstDig;
	const secondSum = calcWeightedSum({
		source: bodyWithFirst,
		length: bodyWithFirst.length,
		startWeight: bodyWithFirst.length + 1,
	});
	const secondDig = calcMod11CheckDigit(secondSum);

	return (
		Number.parseInt(ie.charAt(7), 10) === firstDig &&
		Number.parseInt(ie.charAt(8), 10) === secondDig
	);
};

const validatePI: IeValidator = (ie) => validateMod11Ie(ie);

const validatePR: IeValidator = (ie: string) => {
	if (!checkLength(ie, 10)) return false;

	const body = ie.slice(0, 8);
	const firstSum = calcWeightedSum({
		source: ie,
		length: body.length,
		startWeight: body.length - 5,
		wrapTo: 7,
	});
	const firstDig = calcMod11CheckDigit(firstSum);

	const bodyWithFirst = body + firstDig;
	const secondSum = calcWeightedSum({
		source: bodyWithFirst,
		length: bodyWithFirst.length,
		startWeight: bodyWithFirst.length - 5,
		wrapTo: 7,
	});
	const secondDig = calcMod11CheckDigit(secondSum);

	return (
		Number.parseInt(ie.charAt(8), 10) === firstDig &&
		Number.parseInt(ie.charAt(9), 10) === secondDig
	);
};

const validateRJ: IeValidator = (ie: string) => {
	if (!checkLength(ie, 8)) return false;

	const body = ie.slice(0, 7);
	const sum = calcWeightedSum({ source: ie, length: body.length, startWeight: 2, wrapTo: 7 });
	const dig = calcMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(7), 10) === dig;
};

const validateRN: IeValidator = (ie: string) => {
	if (!checkLength(ie, [9, 10])) return false;
	if (!startsWith(ie, "20")) return false;

	const length = ie.length;
	const position = length - 1;
	const body = ie.slice(0, position);
	const sum = calcWeightedSum({ source: ie, length: body.length, startWeight: length });
	const dig = calcMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(position), 10) === dig;
};

const validateRO: IeValidator = (ie: string) => {
	if (!checkLength(ie, 14)) return false;

	const length = ie.length;
	const position = length - 1;
	const body = ie.slice(0, position);
	const sum = calcWeightedSum({ source: ie, length: body.length, startWeight: 6, wrapTo: 9 });

	const rest = sum % 11;
	let dig = 11 - rest;

	if (dig >= 10) {
		dig -= 10;
	}

	return dig === Number.parseInt(ie.charAt(position), 10);
};

const validateRR: IeValidator = (ie: string) => {
	if (!checkLength(ie, 9)) return false;
	if (!startsWith(ie, "24")) return false;

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
	const sum = calcWeightedSum({ source: ie, length: body.length, startWeight: 2, wrapTo: 9 });
	const dig = calcMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(9), 10) === dig;
};

const validateSC: IeValidator = (ie) => validateMod11Ie(ie);

const validateSE: IeValidator = (ie) => validateMod11Ie(ie);

const calcSPDigit = (body: string, weights: readonly number[]): number => {
	let sum = 0;

	for (let i = 0; i < body.length; i++) {
		sum += (body.charCodeAt(i) - 48) * weights[i];
	}

	return (sum % 11) % 10;
};

const validateSP: IeValidator = (ie: string) => {
	if (SP_RURAL_PATTERN.test(ie)) {
		const body = ie.slice(1, 9);
		const dig = calcSPDigit(body, SP_FIRST_WEIGHTS);

		return Number.parseInt(ie.charAt(9), 10) === dig;
	}

	if (!SP_COMPANY_PATTERN.test(ie)) return false;

	const firstDig = calcSPDigit(ie.slice(0, 8), SP_FIRST_WEIGHTS);
	const secondDig = calcSPDigit(ie.slice(0, 11), SP_SECOND_WEIGHTS);

	return (
		Number.parseInt(ie.charAt(8), 10) === firstDig &&
		Number.parseInt(ie.charAt(11), 10) === secondDig
	);
};

const validateTO: IeValidator = (ie: string) => {
	if (!checkLength(ie, [9, 11])) return false;

	const isLegacy = ie.length === 11;

	if (isLegacy && !TO_TYPES.includes(ie.slice(2, 4))) return false;

	const body = isLegacy ? ie.slice(0, 2) + ie.slice(4, 10) : ie.slice(0, 8);
	const position = isLegacy ? 10 : 8;
	const sum = calcWeightedSum({ source: body, length: body.length, startWeight: 9 });
	const dig = calcMod11CheckDigit(sum);

	return Number.parseInt(ie.charAt(position), 10) === dig;
};

const IE_VALIDATORS: Record<string, IeValidator | undefined> = {
	AC: validateAC,
	AL: validateAL,
	AP: validateAP,
	AM: validateAM,
	BA: validateBA,
	CE: validateCE,
	DF: validateDF,
	ES: validateES,
	GO: validateGO,
	MA: validateMA,
	MG: validateMG,
	MT: validateMT,
	MS: validateMS,
	PA: validatePA,
	PB: validatePB,
	PE: validatePE,
	PI: validatePI,
	PR: validatePR,
	RJ: validateRJ,
	RN: validateRN,
	RO: validateRO,
	RR: validateRR,
	RS: validateRS,
	SC: validateSC,
	SE: validateSE,
	SP: validateSP,
	TO: validateTO,
} satisfies Record<StateCode, IeValidator>;

/**
 * Validates a Brazilian state tax registration number (IE).
 *
 * @param {StateCode} stateCode - The state abbreviation (e.g., 'SP', 'RJ', 'MG')
 * @param {string} ie - The state registration number to validate
 * @returns {boolean} True if the state registration number is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidIe('SP', '110042490114'); // true
 * isValidIe('SP', 'P011004243002'); // true
 * isValidIe('RJ', '12345'); // false
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
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_ES.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_GO.html
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
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RN.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RO.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RR.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_RS.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_SC.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_SE.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_SP.html
 * @see Official: http://www.sintegra.gov.br/Cad_Estados/cad_TO.html
 * @see Official: https://goias.gov.br/economia/roteiro-de-critica-da-inscricao-estadual-de-goias/
 * SEFAZ-GO's roteiro de crítica, the source of the Goiás prefixes and special ranges.
 */
export const isValidIe = (stateCode: StateCode, ie: string): boolean => {
	if (!stateCode || typeof stateCode !== "string") return false;
	if (typeof ie !== "string") return false;

	const normalizedStateCode = stateCode.toUpperCase();

	const validator = Object.hasOwn(IE_VALIDATORS, normalizedStateCode)
		? IE_VALIDATORS[normalizedStateCode]
		: undefined;
	if (!validator) return false;

	const sanitize = normalizedStateCode === "SP" ? sanitizeToAlphanumeric : sanitizeToDigits;
	const value = sanitize(ie);

	return validator(value);
};
