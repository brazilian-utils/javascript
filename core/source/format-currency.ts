import { keepDigits } from "./lib/digits";

/**
 * The separator after `R$`.
 *
 * CLDR pt-BR uses a non-breaking space here, and `Intl.NumberFormat` emits one; the published
 * package replaces it with an ordinary space before returning, so that is what the core produces
 * (docs/contracts.md records the measurement).
 */
const SPACE = 32;

const GROUP_SIZE = 3;

/** Groups the whole part with `.` every three digits, the pt-BR convention. */
export function groupThousands(whole: Digits): Ascii {
	let out: IntRange<0, 127>[] = [];
	const scalars = str.codePoints(whole);

	for (let index = 0; index < scalars.length; index++) {
		if (index > 0 && (scalars.length - index) % GROUP_SIZE === 0) {
			out.push(46);
		}

		out.push(seq.at(scalars, index) ?? 48);
	}

	return str.fromCodePoints(out);
}

/**
 * Formats an exact amount in Brazilian Real, with two decimal places.
 *
 * The separators are the ones Lei nº 9.069/1995 art. 1º prescribes and the CLDR pt-BR data uses:
 * `.` between thousands, `,` before the centavos, and a non-breaking space after `R$`. A negative
 * amount puts the sign before the symbol, `-R$ 10,50`, the shape `Intl.NumberFormat` produces.
 *
 * Turning a host value into an exact amount is the DX's job, and so is the rounding that
 * conversion needs; see docs/contracts.md, which records exactly how the published package rounds.
 */
export function formatCurrency(value: Decimal<2>, symbol: boolean): string {
	const negative = dec.isNegative(value);
	const unscaled = dec.unscaled(dec.abs(value));
	const digits = str.padStart(str.fromInt(unscaled), 3, "0");
	const cut = int.max(digits.length - 2, 0);
	const whole = str.slice(digits, 0, cut);
	const cents = str.slice(digits, cut, digits.length);
	const body = `${groupThousands(keepDigits(whole))},${cents}`;
	const prefix = symbol ? `R$${str.fromCodePoints([SPACE])}` : "";

	return negative ? `-${prefix}${body}` : `${prefix}${body}`;
}
