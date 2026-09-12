import { parseArrecadacao } from "../_internals/parse-arrecadacao/parse-arrecadacao";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidBoleto } from "../is-valid-boleto/is-valid-boleto";
import {
	BASE_DATE_DAY,
	BASE_DATE_MONTH,
	BASE_DATE_YEAR,
	CYCLE_LENGTH,
	DAY_IN_MS,
	MIN_FACTOR,
	RANGE_AFTER,
	RANGE_BEFORE,
} from "./constants";

/** The fields `getBoletoInfo` reads out of a bank slip (boleto). */
export type BoletoInfo = {
	/** Amount in cents. */
	amount: number;
	/** Due date read from the "fator de vencimento", or `null` when the bank slip carries none. */
	expirationDate: Date | null;
	/** Three digit bank code (COMPE), empty for an arrecadação bank slip. */
	bankCode: string;
	/** Present and set to "arrecadacao" only for convênio/tributos bank slips. */
	type?: "arrecadacao";
	/** Arrecadação segment (1 to 7, or 9 for the bank's own use), the kind of biller the bank slip belongs to. */
	segment?: number;
	/** Arrecadação amount in reais (`amount` divided by 100). */
	value?: number;
	/** Whether the arrecadação amount is an effective value (`true`) or a reference quantity (`false`). */
	hasEffectiveValue?: boolean;
};

const toDayNumber = (date: Date): number =>
	Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_IN_MS);

const getBaseDayNumber = (): number =>
	Math.floor(Date.UTC(BASE_DATE_YEAR, BASE_DATE_MONTH, BASE_DATE_DAY) / DAY_IN_MS);

const dateFromBase = (days: number): Date =>
	new Date(BASE_DATE_YEAR, BASE_DATE_MONTH, BASE_DATE_DAY + days);

const getExpirationDate = (factor: number, referenceDate: Date): Date | null => {
	if (!Number.isFinite(factor) || factor < MIN_FACTOR) return null;

	const reference = toDayNumber(referenceDate);
	const cycle = Math.floor((reference - getBaseDayNumber() - factor) / CYCLE_LENGTH);

	let closest = 0;
	let closestDistance = Number.POSITIVE_INFINITY;

	for (const candidate of [cycle, cycle + 1]) {
		const days = candidate * CYCLE_LENGTH + factor;
		const difference = getBaseDayNumber() + days - reference;

		const inRange =
			// Stryker disable next-line EqualityOperator,UnaryOperator: RANGE_BEFORE (3000) is smaller than half a cycle (4500), so whenever this side alone decides the match, the other candidate (a full 9000-day cycle away) is always farther, and the fallback below always lands on the very same candidate anyway
			difference >= -RANGE_BEFORE && difference <= RANGE_AFTER;

		if (inRange) return dateFromBase(days);

		const distance = Math.abs(difference);

		// Stryker disable next-line EqualityOperator: the two candidates are always exactly one cycle (9000 days) apart, so their distances can only tie at the cycle's exact midpoint (4500) — a point RANGE_AFTER (5500) already always accepts above via the early return, so a genuine tie can never reach this comparison
		if (distance < closestDistance) {
			closestDistance = distance;
			closest = days;
		}
	}

	return dateFromBase(closest);
};

/** Options of `getBoletoInfo`. */
export type GetBoletoInfoOptions = {
	/** Date used to resolve the 9000 day "fator de vencimento" cycle (default: now). */
	referenceDate?: Date;
};

/**
 * Extracts information from a Brazilian bank slip (boleto).
 *
 * Supports the 47 digit "cobrança bancária" linha digitável and, additionally, the
 * "arrecadação" (convênio/tributos) bank slip: 48 digit linha digitável or 44 digit
 * barcode, both starting with `8`. Arrecadação bank slips also return `type`, `segment`,
 * `value` and `hasEffectiveValue`, and have no `bankCode` nor `expirationDate`.
 *
 * @param {string} value - The boleto digitable line (can be with or without mask).
 * @param {GetBoletoInfoOptions} [options] - Optional options.
 * @param {Date} options.referenceDate - Date used to resolve the "fator de vencimento" cycle. Defaults to now.
 * @returns {BoletoInfo | undefined} An object containing amount (in cents), expirationDate, and bankCode, or undefined if the boleto is invalid.
 *
 * @example
 * ```typescript
 * getBoletoInfo('00190000090114971860168524522114675860000102656');
 * // { amount: 102656, expirationDate: new Date(2018, 6, 15), bankCode: '001' }
 *
 * getBoletoInfo('846100000005246100291102005460339004695895061080');
 * // { amount: 2461, expirationDate: null, bankCode: '', type: 'arrecadacao', segment: 4, value: 24.61, hasEffectiveValue: true }
 * ```
 *
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf
 * @see Official: https://portal.febraban.org.br/pagina/3166/33/pt-br/layout-cobranca FEBRABAN,
 * "Layout Padrão de Cobrança / Especificações Técnicas para Cobrança", the cobrança bancária
 * layout behind the 47 digit linha digitável and its fator de vencimento.
 */
export const getBoletoInfo = (
	value: string,
	options?: GetBoletoInfoOptions,
): BoletoInfo | undefined => {
	if (!isValidBoleto(value)) return undefined;

	const sanitized = sanitizeToDigits(value);

	const arrecadacao = parseArrecadacao(sanitized);

	if (arrecadacao) {
		return {
			amount: arrecadacao.amount,
			expirationDate: null,
			bankCode: "",
			type: "arrecadacao",
			segment: arrecadacao.segment,
			value: arrecadacao.amount / 100,
			hasEffectiveValue: arrecadacao.hasEffectiveValue,
		};
	}

	const bankCode = sanitized.slice(0, 3);

	const expirationDate = getExpirationDate(
		Number(sanitized.slice(33, 37)),
		options?.referenceDate ?? new Date(),
	);

	const amount = Number(sanitized.slice(37, 47)) || 0;

	return { amount, expirationDate, bankCode };
};
