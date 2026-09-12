export const DEFAULT_PRECISION = 2;

const MIN_PRECISION = 0;

const MAX_PRECISION = 20;

/**
 * Clamps a fraction-digits precision into the range accepted by `Intl.NumberFormat`.
 *
 * `Intl.NumberFormat` throws a `RangeError` when `minimumFractionDigits` /
 * `maximumFractionDigits` fall outside of the range the engine accepts. ES2023 raised the
 * upper bound from 20 to 100, but Node 20 still enforces 20, so 20 is the portable limit
 * across every supported runtime and every precision coming from user land is normalized
 * to it before reaching `Intl`.
 *
 * @param {number} [precision] - The desired precision. Defaults to 2 when omitted or not a finite number.
 * @returns {number} An integer between 0 and 20.
 *
 * @example
 * ```typescript
 * clampPrecision();     // 2
 * clampPrecision(3);    // 3
 * clampPrecision(-1);   // 0
 * clampPrecision(21);   // 20
 * ```
 */
export const clampPrecision = (precision?: number): number => {
	const safePrecision = precision ?? Number.NaN;

	if (!Number.isFinite(safePrecision)) return DEFAULT_PRECISION;

	return Math.min(MAX_PRECISION, Math.max(MIN_PRECISION, Math.trunc(safePrecision)));
};
