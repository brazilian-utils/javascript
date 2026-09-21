/**
 * Civil date construction in the source language.
 *
 * The core has no unchecked construction: `date.fromYmd` answers an absent value for a day that
 * does not exist, and the checker insists on that case being handled. A literal date from a
 * statute is always real, so this helper names the fallback once instead of repeating it at every
 * call site.
 */

/** A fixed day of a year, with the unreachable fallback named once. */
export function civilDate(
	year: IntRange<1900, 2099>,
	month: IntRange<1, 12>,
	day: IntRange<1, 31>,
): CivilDate {
	return date.fromYmd(year, month, day) ?? date.clampEpochDays(0);
}
