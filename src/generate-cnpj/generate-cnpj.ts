import { CNPJ_FIRST_DIGIT_WEIGHTS, CNPJ_SECOND_DIGIT_WEIGHTS } from "../_internals/constants/cnpj";
import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { isRepeatedDigits } from "../_internals/is-repeated-digits/is-repeated-digits";

const ROOT_LENGTH = 8;

const BRANCH_LENGTH = 4;

const MIN_BRANCH = 1;

const MAX_BRANCH = 9999;

const VALID_CNPJ_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * The parameters `generateCnpj` accepts, an alternative to passing the version positionally.
 */
export type GenerateCnpjParams = {
	/**
	 * The version of the CNPJ to be generated: `1` for the numeric CNPJ and `2` for the
	 * alphanumeric one. Defaults to `1`, and any other runtime value also generates a version 1
	 * (numeric) CNPJ.
	 */
	version?: 1 | 2;
	/**
	 * The "número de ordem" (filial) block, positions 9 to 12 of the CNPJ: an integer from 1 to
	 * 9999, written zero padded to four characters (`3` becomes `"0003"`). Defaults to a random
	 * block, and an integer outside that range, a fractional number or any other runtime value is
	 * ignored, so a random block is used for those as well. The block stays numeric on the
	 * alphanumeric version, which the IN RFB nº 2.229/2024 layout allows.
	 */
	branch?: number;
};

const generateRandomCnpjChars = (length: number): string => {
	let chars = "";
	for (let i = 0; i < length; i++) {
		chars += VALID_CNPJ_CHARS.charAt(Math.floor(Math.random() * VALID_CNPJ_CHARS.length));
	}
	return chars;
};

const isInteger = (value: unknown): value is number => Number.isInteger(value);

const isBranchInRange = (branch: number | undefined): branch is number =>
	isInteger(branch) && branch >= MIN_BRANCH && branch <= MAX_BRANCH;

const generateBase = (
	branch: number | undefined,
	generatePart: (length: number) => string,
): string =>
	generatePart(ROOT_LENGTH) +
	(isBranchInRange(branch)
		? branch.toString().padStart(BRANCH_LENGTH, "0")
		: generatePart(BRANCH_LENGTH));

const generateNonRepeatedBase = (generate: () => string): string => {
	let base = generate();
	while (isRepeatedDigits(base)) {
		base = generate();
	}
	return base;
};

const charToCnpjValue = (char: string): number => char.charCodeAt(0) - 48;

const generateAlphanumericChecksum = (cnpj: string, weights: number[]): number =>
	weights.reduce((sum, weight, index) => sum + charToCnpjValue(cnpj.charAt(index)) * weight, 0);

const calculateCheckDigit = (base: string, weights: number[]): string => {
	const mod = generateChecksum({ base, weight: weights }) % 11;
	return (mod < 2 ? 0 : 11 - mod).toString();
};

const calculateAlphanumericCheckDigit = (base: string, weights: number[]): string => {
	const mod = generateAlphanumericChecksum(base, weights) % 11;
	return (mod < 2 ? 0 : 11 - mod).toString();
};

const generateNumericCnpj = (branch: number | undefined): string => {
	const base = generateNonRepeatedBase(() => generateBase(branch, generateRandomNumber));
	const firstCheckDigit = calculateCheckDigit(base, CNPJ_FIRST_DIGIT_WEIGHTS);
	const secondCheckDigit = calculateCheckDigit(base + firstCheckDigit, CNPJ_SECOND_DIGIT_WEIGHTS);
	return base + firstCheckDigit + secondCheckDigit;
};

const generateAlphanumericCnpj = (branch: number | undefined): string => {
	const base = generateNonRepeatedBase(() => generateBase(branch, generateRandomCnpjChars));
	const firstCheckDigit = calculateAlphanumericCheckDigit(base, CNPJ_FIRST_DIGIT_WEIGHTS);
	const secondCheckDigit = calculateAlphanumericCheckDigit(
		base + firstCheckDigit,
		CNPJ_SECOND_DIGIT_WEIGHTS,
	);
	return base + firstCheckDigit + secondCheckDigit;
};

const isGenerateCnpjParams = (
	versionOrParams: 1 | 2 | GenerateCnpjParams,
): versionOrParams is GenerateCnpjParams =>
	typeof versionOrParams === "object" && versionOrParams !== null;

/**
 * Generates a valid random CNPJ (Cadastro Nacional da Pessoa Jurídica).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * The first argument is either the version, as it has always been, or a `GenerateCnpjParams`
 * object carrying that same version plus the "número de ordem" (filial) block to write in
 * positions 9 to 12.
 *
 * @param {1 | 2 | GenerateCnpjParams} [versionOrParams] - The version of the CNPJ to be
 * generated: `1` for the numeric CNPJ and `2` for the alphanumeric one, or an options object.
 * Defaults to `1`, and never throws: `null`, `undefined` and any other runtime value that is
 * neither `2` nor an object also generate a version 1 (numeric) CNPJ.
 * @param {1 | 2} [versionOrParams.version] - The version of the CNPJ to be generated, as above.
 * @param {number} [versionOrParams.branch] - The "número de ordem" (filial) block, an integer
 * from 1 to 9999 written zero padded to four characters. Defaults to a random block, and an
 * invalid branch is ignored rather than reported, so a random block is used for it too.
 * @returns {string} A valid 14-digit CNPJ string without formatting.
 *
 * @example
 * ```typescript
 * generateCnpj(); // "12345678000195"
 * generateCnpj(2); // "Q0SLFMBD7VX439"
 * generateCnpj({ version: 2 }); // "Q0SLFMBD7VX439"
 * generateCnpj({ branch: 3 }); // "12345678000372", the ordem block is "0003"
 * generateCnpj({ version: 2, branch: 1 }); // "Q0SLFMBD000148", the ordem block is "0001"
 * generateCnpj({ branch: 0 }); // "12345678472695", an out of range branch draws a random block
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 */
export const generateCnpj = (versionOrParams: 1 | 2 | GenerateCnpjParams = 1): string => {
	const params: GenerateCnpjParams = isGenerateCnpjParams(versionOrParams)
		? versionOrParams
		: { version: versionOrParams };

	return params.version === 2
		? generateAlphanumericCnpj(params.branch)
		: generateNumericCnpj(params.branch);
};
