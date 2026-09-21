import { keepAlphanumeric, keepDigits } from "./lib/digits";
import { hasLetter, hasValidCnpjChecksum, isRepeatedCnpj } from "./lib/cnpj";

/** Which CNPJ format to accept: the numeric one, or the alphanumeric one. */
export type CnpjVersion = "1" | "2";

const CNPJ_FORMAT =
	/^[0-9A-Z]{2}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9A-Z]{3}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9A-Z]{3}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9A-Z]{4}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9]{2}$/;

const NUMERIC_CNPJ_FORMAT =
	/^[0-9]{2}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9]{3}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9]{3}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9]{4}[\t-\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff.\-/]*[0-9]{2}$/;

const CNPJ_LENGTH = 14;

/**
 * Validates a CNPJ (Cadastro Nacional da Pessoa Jurídica), numeric or alphanumeric.
 *
 * Version `"2"` accepts the alphanumeric format as well; a value with no letters is always read
 * as the numeric one, which is also where the reserved repeated numbers are rejected. Mapping a
 * missing or unexpected `options.version` onto `"1"` is the DX's job.
 */
export function isValidCnpj(cnpj: string, version: CnpjVersion): boolean {
	const trimmed = str.trim(cnpj);

	if (version === "2") {
		const cleaned = keepAlphanumeric(cnpj);

		if (hasLetter(cleaned) && cleaned.length === CNPJ_LENGTH) {
			return re.test(CNPJ_FORMAT, str.asciiUpper(trimmed)) && hasValidCnpjChecksum(cleaned);
		}
	}

	const numeric = keepDigits(cnpj);

	if (numeric.length !== CNPJ_LENGTH) {
		return false;
	}

	return re.test(NUMERIC_CNPJ_FORMAT, trimmed) && !isRepeatedCnpj(numeric) && hasValidCnpjChecksum(numeric);
}
