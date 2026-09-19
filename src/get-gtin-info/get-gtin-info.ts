import { mod10 } from "../_internals/mod10/mod10";
import {
	BRAZILIAN_PREFIXES,
	DIGITS_REGEX,
	GS1_8_PADDING,
	GTIN_LENGTHS,
	GTIN_TYPES,
	NORMALIZED_LENGTH,
	RESTRICTED_GS1_8_PREFIX_REGEX,
	RESTRICTED_PREFIX_REGEX,
} from "./constants";

/** How many digits a GTIN may be written with. */
export type GtinLength = 8 | 12 | 13 | 14;

/** The GS1 name of each GTIN structure. */
export type GtinType = "GTIN-8" | "GTIN-12" | "GTIN-13" | "GTIN-14";

/** The fields `getGtinInfo` reads out of a GTIN (Global Trade Item Number). */
export type GtinInfo = {
	/** GS1 name of the structure the value was written in. */
	type: GtinType;
	/** How many digits the value was written with. */
	length: GtinLength;
	/**
	 * The three digit GS1 Prefix, or a GS1-8 Prefix when the first six digits of the 14 digit form
	 * are zeros, which covers every GTIN-8 and the GS1 Prefix 0000000. It names the GS1 Member
	 * Organisation that licensed the number, not the country of origin.
	 */
	prefix: string;
	/** True when the prefix is one of GS1 Brasil (789 or 790). */
	isBrazilian: boolean;
	/**
	 * True when the prefix is in a range GS1 sets aside for Restricted Circulation Numbers, so the
	 * number is only unique inside a company or region and is not a globally unique GTIN.
	 */
	isRestrictedCirculation: boolean;
	/** The modulo 10 check digit, the last digit of the value. */
	checkDigit: number;
};

const GS1_8_PREFIX_START = 6;

const PREFIX_START = 1;

const PREFIX_LENGTH = 3;

/**
 * Parses a GTIN (Global Trade Item Number, the number under an EAN/UPC barcode) into its fields.
 *
 * Covers the four structures of the GS1 General Specifications, the same four the NF-e accepts
 * in `cEAN` and `cEANTrib`: GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN) and GTIN-14 (DUN-14). The value
 * must be a string of 8, 12, 13 or 14 digits, surrounding whitespace aside, whose last digit is
 * the GS1 modulo 10 check digit: weights 3 and 1 alternating from the right, the sum subtracted
 * from the nearest equal or higher multiple of ten. Anything else returns `null`, including the
 * `"SEM GTIN"` literal the NF-e uses for a product without one. Leading zeros count, so the value
 * is never read from a number.
 *
 * `type` and `length` describe the value as it was written. The prefix is read the way the
 * "Tabela Prefixo GS1" of the Portal da NF-e tells: the value is left padded with zeros to 14
 * digits, and the prefix is positions 7 to 9 when the first six are zeros (a GTIN-8) and
 * positions 2 to 4 otherwise. A GTIN-12 therefore has a prefix that starts with `0`, and a
 * GTIN-14 has the prefix of the GTIN-13 it packs, after the indicator digit.
 *
 * Only the prefixes of GS1 Brasil (789 and 790) and the Restricted Circulation Number ranges of
 * the General Specifications are told apart, since both are fixed by a standard or a rule. The
 * prefix is not checked against the list of Member Organisations: GS1 keeps assigning ranges, so
 * a copy of that list would turn down valid numbers as it ages. SEFAZ does run that check
 * (rules I03-20 and I12-20 of NT 2021.003, against its own "Tabela Prefixo GS1", which lists the
 * restricted and special ranges as valid) and, for the 789 and 790 prefixes, looks the number up
 * in the Cadastro Centralizado de GTIN, which no offline check can stand in for.
 *
 * @param {string} value - The GTIN to be parsed, digits only.
 * @returns {GtinInfo | null} The parsed GTIN, or `null` when it is not valid.
 *
 * @see Official: https://ref.gs1.org/standards/genspecs/
 * GS1 General Specifications, release 26.0: section 7.9.1 (check digit, tables 7-8 and 7-9),
 * tables 1-4 and 1-5 (GS1 Prefix and GS1-8 Prefix ranges, Restricted Circulation Numbers).
 * @see Official: https://www.gs1.org/services/how-calculate-check-digit-manually
 * GS1, "How to calculate a check digit manually".
 * @see Official: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=SrQT9ys8ODo%3D
 * SEFAZ Nota Técnica 2021.003 (Validação GTIN, replaces NT 2017.001): fields I03 `cEAN` and I12
 * `cEANTrib`, rules I03-10, I03-20, I12-10, I12-20, 9I03-10 and 9I12-10 ("prefixo do Brasil
 * (iniciado em 789 ou 790)").
 * @see Official: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=Oc+fygAxwmc%3D
 * "Tabela Prefixo GS1" of the Portal da NF-e: how to read the prefix from the 14 digit form, and
 * the range 789 to 790 for GS1 Brasil.
 *
 * @example
 * ```typescript
 * getGtinInfo("7890000000017");
 * // { type: "GTIN-13", length: 13, prefix: "789", isBrazilian: true,
 * //   isRestrictedCirculation: false, checkDigit: 7 }
 *
 * getGtinInfo("17890000000014");
 * // { type: "GTIN-14", length: 14, prefix: "789", isBrazilian: true,
 * //   isRestrictedCirculation: false, checkDigit: 4 }
 *
 * getGtinInfo("7890000000018"); // null (wrong check digit)
 * getGtinInfo("SEM GTIN"); // null
 * ```
 */
export const getGtinInfo = (value: string): GtinInfo | null => {
	if (typeof value !== "string") return null;

	const digits = value.trim();

	if (!DIGITS_REGEX.test(digits)) return null;

	const length = GTIN_LENGTHS.find((candidate) => candidate === digits.length);

	if (length === undefined) return null;

	const checkDigit = Number(digits.at(-1));

	if (mod10(digits.slice(0, -1), { variant: "gs1" }) !== checkDigit) return null;

	const normalized = digits.padStart(NORMALIZED_LENGTH, "0");
	const isGs1Eight = normalized.startsWith(GS1_8_PADDING);
	const start = isGs1Eight ? GS1_8_PREFIX_START : PREFIX_START;
	const prefix = normalized.slice(start, start + PREFIX_LENGTH);
	const restrictedRegex = isGs1Eight ? RESTRICTED_GS1_8_PREFIX_REGEX : RESTRICTED_PREFIX_REGEX;

	return {
		type: GTIN_TYPES[length],
		length,
		prefix,
		isBrazilian: BRAZILIAN_PREFIXES.includes(prefix),
		isRestrictedCirculation: restrictedRegex.test(prefix),
		checkDigit,
	};
};
