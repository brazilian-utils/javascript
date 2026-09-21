import { formatWithPattern } from "./lib/format";
import { keepAlphanumeric, keepDigits } from "./lib/digits";
import { type CnpjVersion } from "./is-valid-cnpj";

const PATTERN = "00.000.000/0000-00";

/**
 * The gov.br / Receita Federal display convention: the first two characters and the two check
 * digits are hidden.
 */
const OBFUSCATED_PATTERN = "**.000.000/0000-**";

/** Options of `formatCnpj`, already normalized by the DX. */
export type FormatCnpjOptions = {
	/** Whether to left pad the value with zeros up to the number of slots in the pattern. */
	pad: boolean;
	/** Which CNPJ format to read. */
	version: CnpjVersion;
	/** Whether to hide the first two characters and the two check digits with `*`. */
	obfuscate: boolean;
};

/**
 * Formats a CNPJ value as `00.000.000/0000-00`.
 *
 * The core takes a string and a fully normalized options record; reading a number, a missing
 * options object or a truthy non-boolean is the DX's job.
 */
export function formatCnpj(value: string, options: FormatCnpjOptions): string {
	const sanitized = options.version === "2" ? keepAlphanumeric(value) : keepDigits(value);

	return formatWithPattern(sanitized, options.obfuscate ? OBFUSCATED_PATTERN : PATTERN, options.pad);
}
