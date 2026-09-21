import { easterDayOfMarch } from "./lib/easter";

/** How a holiday is observed. */
export type HolidayType = "national" | "optional" | "religious" | "state";

/** One Brazilian holiday. */
export type Holiday = {
	/** The holiday name in Brazilian Portuguese. */
	name: string;
	/** The day it falls on. */
	date: CivilDate;
	/** How it is observed. */
	type: HolidayType;
};

/** The first year Dia da Consciência Negra is a national holiday (Lei 14.759/2023). */
const CONSCIENCIA_NEGRA_SINCE = 2024;

/** Easter Sunday of a year, as a civil date. */
export function easterSunday(year: IntRange<1900, 2099>): CivilDate {
	const dayOfMarch = easterDayOfMarch(year);

	return dayOfMarch <= 31
		? fixed(year, 3, dayOfMarch)
		: fixed(year, 4, dayOfMarch - 31);
}

/**
 * A fixed date of a year.
 *
 * The fallback is unreachable for the constants below, which are all real dates; it is there
 * because the core has no unchecked construction, and the checker insists on that being visible.
 */
function fixed(year: IntRange<1900, 2099>, month: IntRange<1, 12>, day: IntRange<1, 31>): CivilDate {
	return date.fromYmd(year, month, day) ?? date.clampEpochDays(0);
}

/**
 * The Brazilian national holidays of a year, sorted by date.
 *
 * The order is the one the published package produces: the fixed holidays in statutory order,
 * then the Easter-derived ones, sorted by date with a stable sort, so two holidays on the same
 * day keep the order they were built in. State holidays are not part of this pilot.
 */
export function getHolidays(year: IntRange<1900, 2099>): List<Holiday> {
	let holidays: Holiday[] = [];

	holidays.push({ name: "Ano novo", date: fixed(year, 1, 1), type: "national" });
	holidays.push({ name: "Tiradentes", date: fixed(year, 4, 21), type: "national" });
	holidays.push({ name: "Dia do trabalhador", date: fixed(year, 5, 1), type: "national" });
	holidays.push({ name: "Independência do Brasil", date: fixed(year, 9, 7), type: "national" });
	holidays.push({ name: "Nossa Senhora Aparecida", date: fixed(year, 10, 12), type: "national" });
	holidays.push({ name: "Finados", date: fixed(year, 11, 2), type: "national" });
	holidays.push({ name: "Proclamação da República", date: fixed(year, 11, 15), type: "national" });
	holidays.push({ name: "Natal", date: fixed(year, 12, 25), type: "national" });

	if (year >= CONSCIENCIA_NEGRA_SINCE) {
		holidays.push({ name: "Dia da Consciência Negra", date: fixed(year, 11, 20), type: "national" });
	}

	const easter = easterSunday(year);

	holidays.push({
		name: "Carnaval (terça-feira)",
		date: date.addDays(easter, -47) ?? easter,
		type: "optional",
	});
	holidays.push({
		name: "Sexta-feira Santa",
		date: date.addDays(easter, -2) ?? easter,
		type: "national",
	});
	holidays.push({ name: "Páscoa", date: easter, type: "religious" });
	holidays.push({
		name: "Corpus Christi",
		date: date.addDays(easter, 60) ?? easter,
		type: "optional",
	});

	return seq.sortStableBy(holidays, (holiday: Holiday): CivilDate => holiday.date);
}
