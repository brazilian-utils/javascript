import { civilDate } from "./lib/civil";
import { easterSunday } from "./lib/easter";

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

/**
 * The Brazilian national holidays of a year, sorted by date.
 *
 * The order is the one the published package produces: the fixed holidays in statutory order,
 * then the Easter-derived ones, sorted by date with a stable sort, so two holidays on the same
 * day keep the order they were built in. State holidays are not part of this pilot.
 */
export function getHolidays(year: IntRange<1900, 2099>): List<Holiday> {
	let holidays: Holiday[] = [];

	holidays.push({ name: "Ano novo", date: civilDate(year, 1, 1), type: "national" });
	holidays.push({ name: "Tiradentes", date: civilDate(year, 4, 21), type: "national" });
	holidays.push({ name: "Dia do trabalhador", date: civilDate(year, 5, 1), type: "national" });
	holidays.push({ name: "Independência do Brasil", date: civilDate(year, 9, 7), type: "national" });
	holidays.push({ name: "Nossa Senhora Aparecida", date: civilDate(year, 10, 12), type: "national" });
	holidays.push({ name: "Finados", date: civilDate(year, 11, 2), type: "national" });
	holidays.push({ name: "Proclamação da República", date: civilDate(year, 11, 15), type: "national" });
	holidays.push({ name: "Natal", date: civilDate(year, 12, 25), type: "national" });

	if (year >= CONSCIENCIA_NEGRA_SINCE) {
		holidays.push({ name: "Dia da Consciência Negra", date: civilDate(year, 11, 20), type: "national" });
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
