import * as fc from "fast-check";

import { HOLIDAYS_MAX_YEAR, HOLIDAYS_MIN_YEAR } from "../_internals/constants/holidays";
import { DATA as STATES, type StateCode } from "../_internals/constants/states";
import { bench, describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isBusinessDay } from "../is-business-day/is-business-day";
import { STATE_HOLIDAYS } from "./constants";
import { getHolidays, type GetHolidaysParams, type Holiday } from "./get-holidays";

const PROTOTYPE_KEYS = Object.getOwnPropertyNames(Object.prototype);

const hostileStateCodes = fc.constantFrom(...PROTOTYPE_KEYS, "SP", "xx");

function getHolidaysFor(year: number, stateCode: StateCode | null): Holiday[] {
	return stateCode === null ? getHolidays(year) : getHolidays({ year, stateCode });
}

describe("getHolidays", () => {
	test("should return fixed holidays for the given year", () => {
		const year = 2024;
		const holidays = getHolidays(year);

		const fixedHolidays = [
			{ name: "Ano novo", date: new Date(year, 0, 1), type: "national" },
			{ name: "Tiradentes", date: new Date(year, 3, 21), type: "national" },
			{ name: "Dia do trabalhador", date: new Date(year, 4, 1), type: "national" },
			{ name: "Independência do Brasil", date: new Date(year, 8, 7), type: "national" },
			{ name: "Nossa Senhora Aparecida", date: new Date(year, 9, 12), type: "national" },
			{ name: "Finados", date: new Date(year, 10, 2), type: "national" },
			{ name: "Proclamação da República", date: new Date(year, 10, 15), type: "national" },
			{ name: "Dia da Consciência Negra", date: new Date(year, 10, 20), type: "national" },
			{ name: "Natal", date: new Date(year, 11, 25), type: "national" },
		];

		for (const holiday of fixedHolidays) {
			expect(holidays).toContainEqual(holiday);
		}
	});

	test("should not include Dia da Consciência Negra as a national holiday before 2024 (Lei nº 14.759/2023 made it national only from 2024 onward)", () => {
		const holidays = getHolidays(2023);

		expect(
			holidays.find(
				(holiday) => holiday.name === "Dia da Consciência Negra" && holiday.type === "national",
			),
		).toBeUndefined();
	});

	test("should calculate Easter-related holidays correctly, including Corpus Christi 60 days after Easter Sunday (independently verified: Easter 2031 is Sun 2031-04-13)", () => {
		const year = 2031;
		const holidays = getHolidays(year);

		const easterDate = new Date(2031, 3, 13);
		const expectedHolidays = [
			{ name: "Páscoa", date: easterDate, type: "religious" },
			{ name: "Carnaval (terça-feira)", date: new Date(2031, 1, 25), type: "optional" },
			{ name: "Sexta-feira Santa", date: new Date(2031, 3, 11), type: "national" },
			{ name: "Corpus Christi", date: new Date(2031, 5, 12), type: "optional" },
		];

		for (const holiday of expectedHolidays) {
			expect(holidays).toContainEqual(holiday);
		}
	});

	test("should return 13 holidays for 2024: 9 fixed holidays (including Consciência Negra) plus 4 Easter-related holidays", () => {
		const year = 2024;
		const holidays = getHolidays(year);

		expect(holidays.length).toBe(13);
	});

	test("should calculate Easter Sunday correctly across widely spaced years (independently verified via the Anonymous Gregorian algorithm: 1900-04-15, 1954-04-18, 2075-04-07)", () => {
		const easterSundays = [
			{ year: 1900, month: 3, day: 15 },
			{ year: 1954, month: 3, day: 18 },
			{ year: 2075, month: 3, day: 7 },
		];

		for (const { year, month, day } of easterSundays) {
			expect(getHolidays(year)).toContainEqual({
				name: "Páscoa",
				date: new Date(year, month, day),
				type: "religious",
			});
		}
	});

	test("should compute holidays for the inclusive boundary years 1900 and 2099", () => {
		expect(getHolidays(1900)).toContainEqual({
			name: "Ano novo",
			date: new Date(1900, 0, 1),
			type: "national",
		});
		expect(getHolidays(2099)).toContainEqual({
			name: "Ano novo",
			date: new Date(2099, 0, 1),
			type: "national",
		});
	});

	test("should return holidays sorted in ascending chronological order, not fixed-holiday insertion order (Dia da Consciência Negra, pushed after Natal, sorts before it)", () => {
		const holidays = getHolidays({ year: 2024, stateCode: "SP" });

		expect(holidays.length).toBeGreaterThan(1);

		for (let index = 1; index < holidays.length; index += 1) {
			const current = holidays.at(index);
			const previous = holidays.at(index - 1);

			expect(current).toBeDefined();
			expect(previous).toBeDefined();

			if (current === undefined || previous === undefined) {
				continue;
			}

			expect(current.date.getTime()).toBeGreaterThanOrEqual(previous.date.getTime());
		}
	});

	test("should return an empty array when called with null instead of a year or options object", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getHolidays(null)).toEqual([]);
	});

	test("should read a prototype chain key as an unknown state code and list the national holidays only", () => {
		const national = getHolidays(2024);

		for (const stateCode of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
			expect(getHolidays({ year: 2024, stateCode: stateCode as StateCode })).toEqual(national);
		}
	});

	test('should return an empty array when called with a function, even one carrying a year property (typeof yearOrOptions !== "object" must reject it, not just isNullish)', () => {
		const fakeOptions = Object.assign(() => null, { year: 2024 });

		expect(getHolidays(fakeOptions)).toEqual([]);
	});

	test("should return an empty array for a year that is not a valid supported integer", () => {
		const invalidYears = ["2024", 2024.5, 1899, 2100, Number.NaN];

		for (const year of invalidYears) {
			// @ts-expect-error: intentionally invalid input
			expect(getHolidays({ year })).toEqual([]);
		}
	});

	test("should ignore a non-primitive (String object) stateCode and return national-only holidays", () => {
		const nationalHolidays = getHolidays(2024);
		// @ts-expect-error: intentionally invalid input
		const holidays = getHolidays({ year: 2024, stateCode: new String("SP") });

		expect(holidays).toEqual(nationalHolidays);
	});

	test("should compute independent results per year instead of colliding on a shared cache key", () => {
		const first = getHolidays(2081);
		const second = getHolidays(2082);
		const firstOfSecond = second.at(0);

		expect(firstOfSecond).toBeDefined();

		if (firstOfSecond === undefined) {
			return;
		}

		expect(firstOfSecond.date.getFullYear()).toBe(2082);
		expect(second).not.toEqual(first);
	});

	test("should serve a second identical call from the cache without recomputing (verified by adding a state holiday in between; recomputing would list it)", () => {
		const year = 2085;
		const stateCode = "AC" as const;
		const first = getHolidays({ year, stateCode });
		const acEntries = STATE_HOLIDAYS.AC ?? [];

		acEntries.push({ name: "Feriado inventado para checar o cache", day: 2, month: 1 });

		try {
			expect(getHolidays({ year, stateCode })).toEqual(first);
		} finally {
			acEntries.pop();
		}
	});

	test("should work for leap years, computing Easter Sunday 2020 correctly", () => {
		const year = 2020;
		const holidays = getHolidays(year);

		expect(holidays).toContainEqual({
			name: "Ano novo",
			date: new Date(year, 0, 1),
			type: "national",
		});

		const easterDate = new Date(2020, 3, 12);
		expect(holidays).toContainEqual({ name: "Páscoa", date: easterDate, type: "religious" });
	});

	test("should accept year as number parameter", () => {
		const holidays = getHolidays(2024);
		expect(holidays.length).toBeGreaterThan(0);
		expect(holidays.every((h) => h.date.getFullYear() === 2024)).toBe(true);
	});

	test("should accept options object with year", () => {
		const holidays = getHolidays({ year: 2024 });
		expect(holidays.length).toBeGreaterThan(0);
		expect(holidays.every((h) => h.date.getFullYear() === 2024)).toBe(true);
	});

	test("should include state-specific holidays when stateCode is provided, still containing national holidays, with more than 13 total", () => {
		const holidays = getHolidays({ year: 2024, stateCode: "SP" });

		expect(holidays).toContainEqual({
			name: "Ano novo",
			date: new Date(2024, 0, 1),
			type: "national",
		});

		expect(holidays).toContainEqual({
			name: "Revolução Constitucionalista",
			date: new Date(2024, 6, 9),
			type: "state",
		});

		expect(holidays.length).toBeGreaterThan(13);
	});

	test("should include RJ's São Jorge (Lei nº 5.198/2008) and treat Dia da Consciência Negra as the unified national entry from 2024 on, not a separate RJ entry; São Sebastião is a municipal holiday of the city of Rio de Janeiro, not a state law, so it is not included", () => {
		const holidays = getHolidays({ year: 2024, stateCode: "RJ" });

		expect(holidays).toContainEqual({
			name: "São Jorge",
			date: new Date(2024, 3, 23),
			type: "state",
		});

		expect(holidays.some((h) => h.name === "São Sebastião")).toBe(false);

		expect(holidays).toContainEqual({
			name: "Dia da Consciência Negra",
			date: new Date(2024, 10, 20),
			type: "national",
		});
	});

	test("should not duplicate Consciência Negra for states with their own entry from 2024 on", () => {
		const rjHolidays = getHolidays({ year: 2024, stateCode: "RJ" });
		const mtHolidays = getHolidays({ year: 2024, stateCode: "MT" });

		expect(rjHolidays.filter((h) => h.name === "Dia da Consciência Negra")).toHaveLength(1);
		expect(mtHolidays.filter((h) => h.name === "Dia da Consciência Negra")).toHaveLength(1);
	});

	test("should keep the state-specific Consciência Negra entry before 2024, under the same name the national entry uses from 2024 on (Lei MT nº 7.879/2002 and Lei RJ nº 4.007/2002 both institute the feriado estadual naming the date 'Dia Nacional da Consciência Negra')", () => {
		const rjHolidays = getHolidays({ year: 2023, stateCode: "RJ" });
		const mtHolidays = getHolidays({ year: 2023, stateCode: "MT" });

		expect(rjHolidays).toContainEqual({
			name: "Dia da Consciência Negra",
			date: new Date(2023, 10, 20),
			type: "state",
		});
		expect(mtHolidays).toContainEqual({
			name: "Dia da Consciência Negra",
			date: new Date(2023, 10, 20),
			type: "state",
		});
		expect(rjHolidays.some((h) => h.name === "Consciência Negra")).toBe(false);
		expect(mtHolidays.some((h) => h.name === "Consciência Negra")).toBe(false);
	});

	test("should return only national holidays when stateCode is not provided, while SP's holidays still contain every national holiday plus extras", () => {
		const nationalHolidays = getHolidays(2024);
		const spHolidays = getHolidays({ year: 2024, stateCode: "SP" });

		for (const nationalHoliday of nationalHolidays) {
			expect(spHolidays).toContainEqual(nationalHoliday);
		}

		expect(spHolidays.length).toBeGreaterThan(nationalHolidays.length);
	});

	test("should work with different state codes: RS includes Revolução Farroupilha (Constituição Estadual), while MG has no state-specific entry list since its Data Magna (21/4) coincides with the national Tiradentes holiday and there is no law backing a separate 'Aniversário de Minas Gerais' on 21/7", () => {
		const rsHolidays = getHolidays({ year: 2024, stateCode: "RS" });
		const mgHolidays = getHolidays({ year: 2024, stateCode: "MG" });

		expect(rsHolidays.some((h) => h.name === "Revolução Farroupilha")).toBe(true);

		expect(mgHolidays.some((h) => h.name === "Aniversário de Minas Gerais")).toBe(false);
	});

	test("should ignore an unknown stateCode and return national-only holidays", () => {
		const nationalHolidays = getHolidays(2024);
		// @ts-expect-error: intentionally invalid input
		const holidays = getHolidays({ year: 2024, stateCode: "XX" });

		expect(holidays).toEqual(nationalHolidays);
	});

	test("should ignore a non-string stateCode and return national-only holidays", () => {
		const nationalHolidays = getHolidays(2024);
		// @ts-expect-error: intentionally invalid input
		const holidays = getHolidays({ year: 2024, stateCode: 123 });

		expect(holidays).toEqual(nationalHolidays);
	});

	test("should return a fresh copy on every call so mutation cannot leak between calls", () => {
		const firstHoliday = getHolidays(2024).at(0);

		expect(firstHoliday).toBeDefined();

		if (firstHoliday === undefined) {
			return;
		}

		firstHoliday.name = "MUTATED";
		firstHoliday.date.setFullYear(1900);

		const secondHoliday = getHolidays(2024).at(0);

		expect(secondHoliday).toBeDefined();

		if (secondHoliday === undefined) {
			return;
		}

		expect(secondHoliday.name).not.toBe("MUTATED");
		expect(secondHoliday.date.getFullYear()).toBe(2024);
	});
	test("should keep Nossa Senhora da Conceição for AM as an optional day, as the state calendar decree does", () => {
		const holiday = getHolidays({ year: 2024, stateCode: "AM" }).find(
			(h) => h.name === "Nossa Senhora da Conceição",
		);

		expect(holiday?.type).toBe("optional");
		expect(holiday?.date).toEqual(new Date(2024, 11, 8));
	});

	test("should apply state laws for Consciência Negra before it became national", () => {
		const name = "Dia da Consciência Negra";

		expect(getHolidays({ year: 2009, stateCode: "AM" }).map((h) => h.name)).not.toContain(name);
		expect(getHolidays({ year: 2010, stateCode: "AM" }).map((h) => h.name)).toContain(name);
		expect(getHolidays({ year: 2022, stateCode: "SP" }).map((h) => h.name)).not.toContain(name);
		expect(getHolidays({ year: 2023, stateCode: "SP" }).map((h) => h.name)).toContain(name);
		expect(
			getHolidays({ year: 2024, stateCode: "SP" }).filter((h) => h.name === name),
		).toHaveLength(1);
	});

	test("should include state holidays added after the 2026 legal audit while they were in force: PB's Morte de João Pessoa (Lei nº 3.489/1967, art. 2º), TO's Autonomia do Estado do Tocantins (Lei nº 960/1998), and AP's Dia Estadual da Consciência Negra (Lei nº 1.169/2007, until superseded by the 2024 national holiday)", () => {
		const pbHolidays = getHolidays({ year: 2015, stateCode: "PB" });
		const toHolidays = getHolidays({ year: 2008, stateCode: "TO" });
		const apHolidays2023 = getHolidays({ year: 2023, stateCode: "AP" });
		const apHolidays2024 = getHolidays({ year: 2024, stateCode: "AP" });

		expect(pbHolidays).toContainEqual({
			name: "Morte de João Pessoa",
			date: new Date(2015, 6, 26),
			type: "state",
		});

		expect(toHolidays).toContainEqual({
			name: "Autonomia do Estado do Tocantins",
			date: new Date(2008, 2, 18),
			type: "state",
		});

		expect(apHolidays2023).toContainEqual({
			name: "Dia Estadual da Consciência Negra",
			date: new Date(2023, 10, 20),
			type: "state",
		});

		expect(apHolidays2024.some((h) => h.name === "Dia Estadual da Consciência Negra")).toBe(false);
	});

	test("should stop emitting PB's Morte de João Pessoa from 2016 on, since Lei PB nº 10.601/2015 art. 2º revoked art. 2º of Lei PB nº 3.489/1967 on 17/12/2015", () => {
		expect(
			getHolidays({ year: 2016, stateCode: "PB" }).some((h) => h.name === "Morte de João Pessoa"),
		).toBe(false);

		expect(getHolidays({ year: 2016, stateCode: "PB" })).toContainEqual({
			name: "Data Magna do Estado da Paraíba",
			date: new Date(2016, 7, 5),
			type: "state",
		});
	});

	test("should stop emitting TO's Autonomia do Estado do Tocantins from 2009 on, since Lei TO nº 2.013/2009 rewrote the parágrafo único of Lei TO nº 960/1998 art. 1º, the only clause that declared the feriado, into a commemorative provision", () => {
		expect(
			getHolidays({ year: 2009, stateCode: "TO" }).some(
				(h) => h.name === "Autonomia do Estado do Tocantins",
			),
		).toBe(false);

		expect(getHolidays({ year: 2009, stateCode: "TO" })).toContainEqual({
			name: "Criação do Estado do Tocantins",
			date: new Date(2009, 9, 5),
			type: "state",
		});
	});

	test("should type AL's 16 September as a feriado estadual from 2024 on (Lei AL nº 9.358/2024) and as an optional day before it (Decreto AL nº 68.782/2019)", () => {
		expect(getHolidays({ year: 2023, stateCode: "AL" })).toContainEqual({
			name: "Emancipação Política de Alagoas",
			date: new Date(2023, 8, 16),
			type: "optional",
		});

		expect(getHolidays({ year: 2024, stateCode: "AL" })).toContainEqual({
			name: "Emancipação Política de Alagoas",
			date: new Date(2024, 8, 16),
			type: "state",
		});

		expect(
			getHolidays({ year: 2024, stateCode: "AL" }).filter(
				(h) => h.name === "Emancipação Política de Alagoas",
			),
		).toHaveLength(1);
	});

	test("should list the three Goiás state holidays of Lei GO nº 20.756/2020, art. 269, II", () => {
		const holidays = getHolidays({ year: 2024, stateCode: "GO" });

		expect(holidays).toContainEqual({
			name: "Fundação da Cidade de Goiás",
			date: new Date(2024, 6, 26),
			type: "state",
		});
		expect(holidays).toContainEqual({
			name: "Lançamento da Pedra Fundamental de Goiânia",
			date: new Date(2024, 9, 24),
			type: "state",
		});
		expect(holidays).toContainEqual({
			name: "Dia do Servidor Público",
			date: new Date(2024, 9, 28),
			type: "state",
		});
	});

	test("should replace the national optional Corpus Christi with a DF state entry, which Lei distrital nº 72/1989 art. 1º parágrafo único declares a feriado, without listing the date twice", () => {
		const dfHolidays = getHolidays({ year: 2024, stateCode: "DF" });
		const nationalHolidays = getHolidays(2024);

		expect(dfHolidays.filter((h) => h.name === "Corpus Christi")).toEqual([
			{ name: "Corpus Christi", date: new Date(2024, 4, 30), type: "state" },
		]);

		expect(nationalHolidays).toContainEqual({
			name: "Corpus Christi",
			date: new Date(2024, 4, 30),
			type: "optional",
		});

		expect(getHolidays({ year: 2024, stateCode: "SP" })).toContainEqual({
			name: "Corpus Christi",
			date: new Date(2024, 4, 30),
			type: "optional",
		});
	});

	test("should list DF's Fundação de Brasília (Lei distrital nº 72/1989, art. 1º, I) next to the national Tiradentes, which falls on the same 21 April under a different name", () => {
		const dfHolidays = getHolidays({ year: 2024, stateCode: "DF" });

		expect(dfHolidays).toContainEqual({
			name: "Fundação de Brasília",
			date: new Date(2024, 3, 21),
			type: "state",
		});
		expect(dfHolidays).toContainEqual({
			name: "Tiradentes",
			date: new Date(2024, 3, 21),
			type: "national",
		});
	});

	test("should move both Santa Catarina holidays to the following Sunday when they fall Monday to Friday, as Lei SC nº 18.531/2022 requires (11/08/2025 is a Monday, 25/11/2025 a Tuesday)", () => {
		const holidays = getHolidays({ year: 2025, stateCode: "SC" });

		expect(holidays).toContainEqual({
			name: "Dia do Estado de Santa Catarina",
			date: new Date(2025, 7, 17),
			type: "state",
		});
		expect(holidays).toContainEqual({
			name: "Dia de Santa Catarina de Alexandria",
			date: new Date(2025, 10, 30),
			type: "state",
		});
	});

	test("should keep both Santa Catarina holidays on their statutory date in a year they already fall on a weekend (11/08/2024 is a Sunday, 25/11/2029 a Sunday and 25/11/2028 a Saturday)", () => {
		expect(getHolidays({ year: 2024, stateCode: "SC" })).toContainEqual({
			name: "Dia do Estado de Santa Catarina",
			date: new Date(2024, 7, 11),
			type: "state",
		});
		expect(getHolidays({ year: 2029, stateCode: "SC" })).toContainEqual({
			name: "Dia de Santa Catarina de Alexandria",
			date: new Date(2029, 10, 25),
			type: "state",
		});
		expect(getHolidays({ year: 2028, stateCode: "SC" })).toContainEqual({
			name: "Dia de Santa Catarina de Alexandria",
			date: new Date(2028, 10, 25),
			type: "state",
		});
	});

	test("should keep the Santa Catarina 11 August holiday on its statutory weekday before 2005, the year Lei SC nº 13.408/2005 extended the transfer to it (11/08/2003 is a Monday)", () => {
		expect(getHolidays({ year: 2003, stateCode: "SC" })).toContainEqual({
			name: "Dia do Estado de Santa Catarina",
			date: new Date(2003, 7, 11),
			type: "state",
		});
	});

	test("should keep the Santa Catarina 25 November holiday on its statutory weekday before 1999, the year Lei SC nº 11.213/1999 introduced its transfer (25/11/1998 is a Wednesday)", () => {
		expect(getHolidays({ year: 1998, stateCode: "SC" })).toContainEqual({
			name: "Dia de Santa Catarina de Alexandria",
			date: new Date(1998, 10, 25),
			type: "state",
		});
	});

	test("should move the Santa Catarina 25 November holiday to the following Sunday from 1999 on, the year Lei SC nº 11.213, de 11/11/1999, entered into force thirteen days before it (25/11/1999 is a Thursday)", () => {
		expect(getHolidays({ year: 1999, stateCode: "SC" })).toContainEqual({
			name: "Dia de Santa Catarina de Alexandria",
			date: new Date(1999, 10, 28),
			type: "state",
		});
	});

	test("should move the Santa Catarina 25 November holiday into the next month when the following Sunday falls there (25/11/2002 is a Monday, so the holiday lands on 01/12/2002)", () => {
		expect(getHolidays({ year: 2002, stateCode: "SC" })).toContainEqual({
			name: "Dia de Santa Catarina de Alexandria",
			date: new Date(2002, 11, 1),
			type: "state",
		});
	});

	test("should keep the Santa Catarina 25 November holiday on its statutory weekday in 2004, the one year art. 3º of Lei SC nº 12.906/2004 left it without a transfer clause (25/11/2004 is a Thursday)", () => {
		expect(getHolidays({ year: 2004, stateCode: "SC" })).toContainEqual({
			name: "Dia de Santa Catarina de Alexandria",
			date: new Date(2004, 10, 25),
			type: "state",
		});
	});

	test("should move the Santa Catarina 25 November holiday again from 2005 on, the year Lei SC nº 13.408/2005 reinstated the transfer (25/11/2005 is a Friday)", () => {
		expect(getHolidays({ year: 2005, stateCode: "SC" })).toContainEqual({
			name: "Dia de Santa Catarina de Alexandria",
			date: new Date(2005, 10, 27),
			type: "state",
		});
	});

	test("should switch to the Sunday transfer exactly in 2005, the year Lei SC nº 13.408, de 15/07/2005, entered into force (11/08/2004 is a Wednesday and stays, 11/08/2005 a Thursday and moves to 14/08)", () => {
		expect(getHolidays({ year: 2004, stateCode: "SC" })).toContainEqual({
			name: "Dia do Estado de Santa Catarina",
			date: new Date(2004, 7, 11),
			type: "state",
		});
		expect(getHolidays({ year: 2005, stateCode: "SC" })).toContainEqual({
			name: "Dia do Estado de Santa Catarina",
			date: new Date(2005, 7, 14),
			type: "state",
		});
	});

	test("should list each Santa Catarina holiday exactly once in every year the four 25 November ranges and the two 11 August ranges border on", () => {
		for (const year of [1998, 1999, 2003, 2004, 2005, 2025]) {
			const names = getHolidays({ year, stateCode: "SC" }).map((holiday) => holiday.name);

			expect(names.filter((name) => name === "Dia do Estado de Santa Catarina")).toEqual([
				"Dia do Estado de Santa Catarina",
			]);
			expect(names.filter((name) => name === "Dia de Santa Catarina de Alexandria")).toEqual([
				"Dia de Santa Catarina de Alexandria",
			]);
		}
	});

	test("should treat a prototype chain key as an unknown stateCode instead of throwing", () => {
		const nationalHolidays = getHolidays(2024);

		for (const stateCode of PROTOTYPE_KEYS) {
			// @ts-expect-error: intentionally invalid input
			expect(getHolidays({ year: 2024, stateCode })).toEqual(nationalHolidays);
		}
	});

	test("should compute ES's Nossa Senhora da Penha (Lei nº 11.010/2019) as a movable state holiday, 8 days after Easter Sunday, replacing the removed 'Dia do Estado do Espírito Santo' which was only a municipal ponto facultativo", () => {
		const holidays = getHolidays({ year: 2024, stateCode: "ES" });

		expect(holidays).toContainEqual({
			name: "Nossa Senhora da Penha",
			date: new Date(2024, 3, 8),
			type: "state",
		});

		expect(holidays.some((h) => h.name === "Dia do Estado do Espírito Santo")).toBe(false);
	});

	test("should not list commemorative dates as state holidays: PR's Dia de Nossa Senhora do Rocio (Lei nº 22.360/2025 only adds it to the state events calendar; 15 de novembro is already the national Proclamação da República) and RN's Dia do Rio Grande do Norte (Lei nº 7.831/2000 creates a commemorative date, not a holiday)", () => {
		const prHolidays = getHolidays({ year: 2024, stateCode: "PR" });
		const rnHolidays = getHolidays({ year: 2024, stateCode: "RN" });

		expect(prHolidays.filter((h) => h.date.getMonth() === 10 && h.date.getDate() === 15)).toEqual([
			{ name: "Proclamação da República", date: new Date(2024, 10, 15), type: "national" },
		]);
		expect(prHolidays.some((h) => h.name === "Dia de Nossa Senhora do Rocio")).toBe(false);
		expect(rnHolidays.some((h) => h.name === "Dia do Rio Grande do Norte")).toBe(false);
		expect(rnHolidays.filter((h) => h.date.getMonth() === 7 && h.date.getDate() === 7)).toEqual([]);
		expect(rnHolidays.filter((h) => h.date.getMonth() === 8 && h.date.getDate() === 7)).toEqual([
			{ name: "Independência do Brasil", date: new Date(2024, 8, 7), type: "national" },
		]);
		expect(rnHolidays).toContainEqual({
			name: "Mártires de Cunhaú e Uruaçu",
			date: new Date(2024, 9, 3),
			type: "state",
		});
		expect(rnHolidays.filter((h) => h.type === "state")).toEqual([
			{ name: "Mártires de Cunhaú e Uruaçu", date: new Date(2024, 9, 3), type: "state" },
		]);
	});

	test("should not include RO's Dia dos Evangélicos (18/06): Lei RO nº 1.026/2001 created it, but STF ADI 3940 declared that law unconstitutional, so the date is absent for every year while the 04/01 data magna of Lei RO nº 2.291/2010 stays", () => {
		for (const year of [2002, 2019, 2024]) {
			const roHolidays = getHolidays({ year, stateCode: "RO" });

			expect(roHolidays.some((h) => h.name === "Dia dos Evangélicos")).toBe(false);
			expect(roHolidays.filter((h) => h.date.getMonth() === 5 && h.date.getDate() === 18)).toEqual(
				[],
			);
			expect(roHolidays).toContainEqual({
				name: "Criação do Estado de Rondônia",
				date: new Date(year, 0, 4),
				type: "state",
			});
		}
	});

	test("should no longer include state holidays that lack a statewide legal basis: CE's São José (municipal, Fortaleza's patron saint), GO's Dia do Estado and Nossa Senhora Sant'Ana (no state law found), MT's Criação do Estado de Mato Grosso (Mato Grosso's only state holiday by law is Dia da Consciência Negra), and RJ's São Sebastião (municipal, city of Rio de Janeiro's patron saint)", () => {
		const ceHolidays = getHolidays({ year: 2024, stateCode: "CE" });
		const goHolidays = getHolidays({ year: 2024, stateCode: "GO" });
		const mtHolidays = getHolidays({ year: 2024, stateCode: "MT" });
		const rjHolidays = getHolidays({ year: 2024, stateCode: "RJ" });

		expect(ceHolidays.some((h) => h.name === "Dia de São José")).toBe(false);
		expect(goHolidays.some((h) => h.name === "Dia do Estado de Goiás")).toBe(false);
		expect(goHolidays.some((h) => h.name === "Nossa Senhora Sant'Ana")).toBe(false);
		expect(mtHolidays.some((h) => h.name === "Criação do Estado de Mato Grosso")).toBe(false);
		expect(rjHolidays.some((h) => h.name === "São Sebastião")).toBe(false);
	});

	describe("properties", () => {
		const yearArbitrary = fc.integer({ min: HOLIDAYS_MIN_YEAR, max: HOLIDAYS_MAX_YEAR });
		const stateCodeArbitrary = fc.constantFrom(...STATES.map((state) => state.code));

		test("should place every holiday within the requested year", () => {
			fc.assert(
				fc.property(yearArbitrary, fc.option(stateCodeArbitrary), (year, stateCode) => {
					const holidays = getHolidaysFor(year, stateCode);

					for (const holiday of holidays) {
						expect(holiday.date.getFullYear()).toBe(year);
					}
				}),
			);
		});

		test("should return holidays sorted by date, ascending", () => {
			fc.assert(
				fc.property(yearArbitrary, fc.option(stateCodeArbitrary), (year, stateCode) => {
					const holidays = getHolidaysFor(year, stateCode);
					const timestamps = holidays.map((holiday) => holiday.date.getTime());
					const sorted = [...timestamps].sort((a, b) => a - b);

					expect(timestamps).toEqual(sorted);
				}),
			);
		});

		const anyYear = fc.oneof(yearArbitrary, fc.anything());
		const anyStateCode = fc.oneof(hostileStateCodes, stateCodeArbitrary, fc.anything());
		const hostileOptions = fc.record({ year: anyYear, stateCode: anyStateCode });
		const anyInput = fc.oneof(fc.anything(), hostileOptions);

		test("should never throw, regardless of the input, prototype chain state codes included", () => {
			fc.assert(
				fc.property(anyInput, (value) => {
					expect(() => getHolidays(value as never)).not.toThrow();
				}),
			);
		});

		test("should return the national holidays for a state code that is not a string, an object without a primitive value included", () => {
			const national = getHolidays(2024);

			expect(getHolidays({ year: 2024, stateCode: Object.create(null) as never })).toEqual(
				national,
			);
			expect(getHolidays({ year: 2024, stateCode: ["SP"] as never })).toEqual(national);
		});
	});
});

describe("getHolidays types", () => {
	test("should accept a year and return an array of Holiday", () => {
		expectTypeOf(getHolidays(2024)).toEqualTypeOf<Holiday[]>();
	});

	test("should accept a GetHolidaysParams and return an array of Holiday", () => {
		expectTypeOf<GetHolidaysParams>().toEqualTypeOf<{ year: number; stateCode?: StateCode }>();
		expectTypeOf(getHolidays({ year: 2024, stateCode: "SP" })).toEqualTypeOf<Holiday[]>();
	});

	test("should shape Holiday as name, date and type", () => {
		expectTypeOf<Holiday>().toEqualTypeOf<{
			name: string;
			date: Date;
			type: "national" | "state" | "optional" | "religious";
		}>();
	});
});

describe("getHolidays benchmarks", () => {
	bench("getHolidays, national", () => {
		getHolidays({ year: 2026 });
	});

	bench("getHolidays, with state", () => {
		getHolidays({ year: 2026, stateCode: "SP" });
	});

	bench("isBusinessDay", () => {
		isBusinessDay(new Date(2026, 6, 9), { stateCode: "SP" });
	});
});
