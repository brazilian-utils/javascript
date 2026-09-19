import { mod10 } from "../mod10/mod10";
import { mod11 } from "../mod11/mod11";

/** The free digits of a boleto bancário's linha digitável, the ones no check digit is derived into. */
export type BoletoBancarioParts = {
	/** The 9 digits of the first field: bank, currency and the start of the free field. */
	field1: string;
	/** The 10 digits of the second field. */
	field2: string;
	/** The 10 digits of the third field. */
	field3: string;
	/** The last 15 digits: the general check digit's slot, the due date factor and the amount. */
	tail: string;
};

/**
 * Assembles the 47 digit linha digitável of a boleto bancário from its free digits: each of the
 * three fields gets its modulo 10 check digit, and the general modulo 11 check digit, computed
 * over the barcode the line encodes, replaces the first digit of `tail`.
 *
 * Shared by `generateBoleto` and by the `boletos` arbitrary of the test suite
 * (`src/_internals/test/document-arbitraries.ts`), so that both build a boleto the same way, from
 * random digits or from digits a property-based test can shrink.
 *
 * @param {BoletoBancarioParts} parts - The free digits.
 * @returns {string} The linha digitável, digits only.
 *
 * @example
 * ```typescript
 * assembleBoletoBancario({
 *   field1: "001900000",
 *   field2: "0000000000",
 *   field3: "0000000000",
 *   tail: "000000000000000",
 * }); // "00190000090000000000000000000000500000000000000"
 * ```
 */
export const assembleBoletoBancario = ({
	field1,
	field2,
	field3,
	tail,
}: BoletoBancarioParts): string => {
	const line =
		field1 +
		mod10(field1).toString() +
		field2 +
		mod10(field2).toString() +
		field3 +
		mod10(field3).toString() +
		tail;
	const barcodeWithoutCheck =
		line.slice(0, 4) +
		line.slice(33, 47) +
		line.slice(4, 9) +
		line.slice(10, 20) +
		line.slice(21, 31);

	return line.slice(0, 32) + mod11(barcodeWithoutCheck).toString() + line.slice(33);
};
