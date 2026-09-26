/** The two ends of a walk over local calendar days. */
export type EachLocalDayParams = {
	/** The first local calendar day to visit, as `Date.UTC(year, month, day)` maps it to a number. */
	from: number;
	/** The local calendar day to stop at, the same way, never visited: it only bounds the walk and gives it its direction. */
	until: number;
};

const DAY_IN_MS = 86_400_000;

const NOON = 12;

/**
 * Walks the local calendar days from `from` to `until`, `until` itself excluded, and yields each
 * one as a new `Date` at noon local time.
 *
 * Both ends are local calendar days written as the number `Date.UTC(year, month, day)` returns
 * for them, so the walk is plain integer arithmetic on days: it always advances, it always stops
 * after `Math.abs(until - from)` days, and no `Date` is ever mutated. That is what makes it safe
 * in every time zone. A walk driven by `date.setDate(date.getDate() + 1)` is not: when the
 * neighbouring local day does not exist (`Pacific/Apia` and `Pacific/Fakaofo` skipped 30 December 2011,
 * `Pacific/Kiritimati` and `Pacific/Enderbury` 31 December 1994, `Pacific/Kwajalein` 21 August 1993, all of them crossing
 * the date line) the runtime re-normalizes onto the same local day, the walk stops advancing and
 * the loop never ends.
 *
 * Each day is yielded at **noon**, not at midnight, because noon is a time of day every existing
 * local calendar day has: a transition that moves the clock forward (Brazilian summer time always
 * started at local midnight, so there was no `00:00` on 4 November 2018 in São Paulo) leaves
 * midnight of that day unrepresentable, and a `Date` built at it silently belongs to the day
 * before or carries a shifted hour. A caller that only reads the local year, month, day and
 * weekday of the yielded value, which is all `isBusinessDay` reads, therefore always sees the day
 * it asked for.
 *
 * The five local days listed above do not exist in their zones at all, so no `Date` can carry
 * them. They are skipped rather than yielded as the neighbouring day the runtime resolves them
 * to, which would otherwise be visited twice.
 *
 * @param {EachLocalDayParams} params - The first local calendar day of the walk and the one to stop at.
 * @yields {Date} Each existing local calendar day of the range, in order, at 12:00 local time.
 *
 * @example
 * ```typescript
 * // The business days of March 2024, forwards:
 * for (const day of eachLocalDay({ from: Date.UTC(2024, 2, 1), until: Date.UTC(2024, 3, 1) })) {
 * 	if (isBusinessDay(day)) console.log(day.getDate());
 * }
 * ```
 */
export function* eachLocalDay({ from, until }: EachLocalDayParams): Generator<Date> {
	const step = Math.sign(until - from) * DAY_IN_MS;
	const length = Math.abs(until - from) / DAY_IN_MS;

	for (let index = 0; index < length; index += 1) {
		const target = new Date(from + index * step);
		const candidate = new Date(
			target.getUTCFullYear(),
			target.getUTCMonth(),
			target.getUTCDate(),
			NOON,
		);

		// Stryker disable next-line ConditionalExpression: the five local days listed above are the only input that tells this branch from an unconditional yield, and the tests pinning them need the process time zone set, which the mutation runner's worker threads cannot do; `npm run test -- --run` does kill this mutant
		if (candidate.getDate() === target.getUTCDate()) yield candidate;
	}
}
