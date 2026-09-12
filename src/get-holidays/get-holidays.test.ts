import { describe, expect, test } from "../_internals/test/runtime";
import { STATE_HOLIDAYS } from "./constants";
import { getHolidays } from "./get-holidays";

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

		fixedHolidays.forEach((holiday) => {
			expect(holidays).toContainEqual(holiday);
		});
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

		expectedHolidays.forEach((holiday) => {
			expect(holidays).toContainEqual(holiday);
		});
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

		easterSundays.forEach(({ year, month, day }) => {
			expect(getHolidays(year)).toContainEqual({
				name: "Páscoa",
				date: new Date(year, month, day),
				type: "religious",
			});
		});
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
			expect(holidays[index].date.getTime()).toBeGreaterThanOrEqual(
				holidays[index - 1].date.getTime(),
			);
		}
	});

	test("should return an empty array when called with null instead of a year or options object", () => {
		// @ts-expect-error
		expect(getHolidays(null)).toEqual([]);
	});

	test('should return an empty array when called with a function, even one carrying a year property (typeof yearOrOptions !== "object" must reject it, not just isNullish)', () => {
		const fakeOptions = Object.assign(() => {}, { year: 2024 });

		expect(getHolidays(fakeOptions)).toEqual([]);
	});

	test("should return an empty array for a year that is not a valid supported integer", () => {
		const invalidYears = ["2024", 2024.5, 1899, 2100, Number.NaN];

		invalidYears.forEach((year) => {
			// @ts-expect-error
			expect(getHolidays({ year })).toEqual([]);
		});
	});

	test("should ignore a non-primitive (String object) stateCode and return national-only holidays", () => {
		const nationalHolidays = getHolidays(2024);
		// @ts-expect-error
		const holidays = getHolidays({ year: 2024, stateCode: new String("SP") });

		expect(holidays).toEqual(nationalHolidays);
	});

	test("should compute independent results per year instead of colliding on a shared cache key", () => {
		const first = getHolidays(2081);
		const second = getHolidays(2082);

		expect(second[0].date.getFullYear()).toBe(2082);
		expect(second).not.toEqual(first);
	});

	test("should serve a second identical call from the cache without recomputing (verified by corrupting the state holiday data in between; recomputing would throw)", () => {
		const year = 2085;
		const stateCode = "AC" as const;
		const first = getHolidays({ year, stateCode });
		const acEntries = STATE_HOLIDAYS.AC ?? [];

		acEntries.push({ name: "Feriado inválido para checar o cache" });

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

	test("should keep the state-specific Consciência Negra entry before 2024", () => {
		const rjHolidays = getHolidays({ year: 2023, stateCode: "RJ" });
		const mtHolidays = getHolidays({ year: 2023, stateCode: "MT" });

		expect(rjHolidays).toContainEqual({
			name: "Consciência Negra",
			date: new Date(2023, 10, 20),
			type: "state",
		});
		expect(mtHolidays).toContainEqual({
			name: "Consciência Negra",
			date: new Date(2023, 10, 20),
			type: "state",
		});
	});

	test("should return only national holidays when stateCode is not provided, while SP's holidays still contain every national holiday plus extras", () => {
		const nationalHolidays = getHolidays(2024);
		const spHolidays = getHolidays({ year: 2024, stateCode: "SP" });

		nationalHolidays.forEach((nationalHoliday) => {
			expect(spHolidays).toContainEqual(nationalHoliday);
		});

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
		// @ts-expect-error
		const holidays = getHolidays({ year: 2024, stateCode: "XX" });

		expect(holidays).toEqual(nationalHolidays);
	});

	test("should ignore a non-string stateCode and return national-only holidays", () => {
		const nationalHolidays = getHolidays(2024);
		// @ts-expect-error
		const holidays = getHolidays({ year: 2024, stateCode: 123 });

		expect(holidays).toEqual(nationalHolidays);
	});

	test("should return a fresh copy on every call so mutation cannot leak between calls", () => {
		const first = getHolidays(2024);
		first[0].name = "MUTATED";
		first[0].date.setFullYear(1900);

		const second = getHolidays(2024);
		expect(second[0].name).not.toBe("MUTATED");
		expect(second[0].date.getFullYear()).toBe(2024);
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

	test("should include state holidays added after the 2026 legal audit: PB's Morte de João Pessoa (Lei nº 3.489/1967, art. 2º), TO's Autonomia do Estado do Tocantins (Lei nº 960/1998), and AP's Dia Estadual da Consciência Negra (Lei nº 1.169/2007, until superseded by the 2024 national holiday)", () => {
		const pbHolidays = getHolidays({ year: 2024, stateCode: "PB" });
		const toHolidays = getHolidays({ year: 2024, stateCode: "TO" });
		const apHolidays2023 = getHolidays({ year: 2023, stateCode: "AP" });
		const apHolidays2024 = getHolidays({ year: 2024, stateCode: "AP" });

		expect(pbHolidays).toContainEqual({
			name: "Morte de João Pessoa",
			date: new Date(2024, 6, 26),
			type: "state",
		});

		expect(toHolidays).toContainEqual({
			name: "Autonomia do Estado do Tocantins",
			date: new Date(2024, 2, 18),
			type: "state",
		});

		expect(apHolidays2023).toContainEqual({
			name: "Dia Estadual da Consciência Negra",
			date: new Date(2023, 10, 20),
			type: "state",
		});

		expect(apHolidays2024.some((h) => h.name === "Dia Estadual da Consciência Negra")).toBe(false);
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
		expect(rnHolidays).toContainEqual({
			name: "Mártires de Cunhaú e Uruaçu",
			date: new Date(2024, 9, 3),
			type: "state",
		});
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

	test("should throw when a state holiday entry defines neither easterOffset nor both day and month", () => {
		const entries = STATE_HOLIDAYS.AC ?? [];
		entries.push({ name: "Feriado estadual sem data" });

		try {
			expect(() => getHolidays({ year: 2098, stateCode: "AC" })).toThrow(
				"State holiday entry must define either `easterOffset` or both `day` and `month`",
			);
		} finally {
			entries.pop();
		}
	});

	test("should throw when a state holiday entry defines only one of day/month, without easterOffset", () => {
		const incompleteEntries = [
			{ name: "Feriado com apenas o mês", month: 5 },
			{ name: "Feriado com apenas o dia", day: 10 },
		];

		incompleteEntries.forEach((entry) => {
			const entries = STATE_HOLIDAYS.AC ?? [];
			entries.push(entry);

			try {
				expect(() => getHolidays({ year: 2097, stateCode: "AC" })).toThrow(
					"State holiday entry must define either `easterOffset` or both `day` and `month`",
				);
			} finally {
				entries.pop();
			}
		});
	});
});
