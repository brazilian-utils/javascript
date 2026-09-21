import { keepDigits } from "./lib/digits";
import { groupThousands } from "./lib/format";

/**
 * The separator after `R$`.
 *
 * CLDR pt-BR uses a non-breaking space here, and `Intl.NumberFormat` emits one; the published
 * package replaces it with an ordinary space before returning, so that is what the core produces
 * (docs/contracts.md records the measurement).
 */
const SPACE = 32;

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
	const digits = String(unscaled).padStart(3, "0");
	const cut = Math.max(digits.length - 2, 0);
	const whole = digits.slice(0, cut);
	const cents = digits.slice(cut, digits.length);
	const body = `${groupThousands(keepDigits(whole))},${cents}`;
	const prefix = symbol ? `R$${str.fromCodePoints([SPACE])}` : "";

	return negative ? `-${prefix}${body}` : `${prefix}${body}`;
}
