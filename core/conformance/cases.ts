/**
 * Conformance cases for the Brazilian Utils core.
 *
 * Every case is a call into the core's own contract: the values a DX hands the core after its own
 * coercion. Inputs come from three places — hand written vectors that pin the documented edges,
 * seeded generators over the shape of the refined types, and values recorded from the published
 * npm package.
 */

import type { Case } from "../../engine/src/conformance/differential.ts";
import { record } from "../../engine/src/values.ts";

/** A small deterministic generator, so a failing case is always reproducible. */
export function makeRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state * 1_664_525 + 1_013_904_223) >>> 0;
		return state / 4_294_967_296;
	};
}

function pick<T>(random: () => number, items: readonly T[]): T {
	return items[Math.floor(random() * items.length)]!;
}

const pickFrom = pick;

const MASKS = [".", "-", "/", " ", "", "", "", ""];

export function cpfCases(): Case[] {
	const cases: Case[] = [];
	const push = (value: string, label?: string) =>
		cases.push({ fn: "is-valid-cpf::isValidCpf", args: [value], label });

	for (const value of [
		"123.456.789-09",
		"12345678909",
		"123 456 789 09",
		" 12345678909",
		"12345678909 ",
		"00000000000",
		"11111111111",
		"12345678900",
		"",
		"abc",
		"111.444.777-35",
		"529.982.247-25",
		"529.982.247-26",
		"1234567890",
		"123456789091",
		"123.456.789.09",
		"123 456 78909",
		" 123.456.789-09",
		"000.000.000-00",
	]) {
		push(value, "vector");
	}

	const random = makeRandom(20_260_921);
	for (let index = 0; index < 500; index++) {
		let digits = "";
		for (let position = 0; position < 11; position++) digits += Math.floor(random() * 10);
		push(digits, "random digits");
		push(
			`${digits.slice(0, 3)}${pick(random, MASKS)}${digits.slice(3, 6)}${pick(random, MASKS)}${digits.slice(6, 9)}${pick(random, MASKS)}${digits.slice(9)}`,
			"random masked",
		);
	}

	const alphabet = "0123456789 .-/xA";
	for (let index = 0; index < 500; index++) {
		const length = Math.floor(random() * 16);
		let value = "";
		for (let position = 0; position < length; position++) value += pick(random, [...alphabet]);
		push(value, "fuzz");
	}

	return cases;
}

export function cnpjCases(): Case[] {
	const cases: Case[] = [];
	const push = (value: string, version: "1" | "2", label?: string) =>
		cases.push({ fn: "is-valid-cnpj::isValidCnpj", args: [value, version], label });

	for (const value of [
		"12.345.678/0001-95",
		"12345678000195",
		"12 345 678 0001 95",
		"00000000000000",
		"11111111111111",
		"12345678000190",
		"",
		"Q0.SLF.MBD/7VX4-39",
		"Q0SLFMBD7VX439",
		"q0slfmbd7vx439",
		"Q0SLFMBD7VX430",
		"46.843.485/0001-86",
		"46843485000186",
		"AAAAAAAAAAAA00",
		"1234567800019",
		"123456780001955",
	]) {
		push(value, "1", "vector");
		push(value, "2", "vector");
	}

	const random = makeRandom(19_881_005);
	const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	for (let index = 0; index < 400; index++) {
		let value = "";
		for (let position = 0; position < 14; position++) value += pickFrom(random, [...alphabet]);
		push(value, "1", "random alphanumeric");
		push(value, "2", "random alphanumeric");

		let digits = "";
		for (let position = 0; position < 14; position++) digits += Math.floor(random() * 10);
		push(digits, "1", "random numeric");
		push(digits, "2", "random numeric");
		push(
			`${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`,
			"1",
			"random masked",
		);
	}

	return cases;
}

export function formatCnpjCases(): Case[] {
	const cases: Case[] = [];
	const push = (value: string, pad: boolean, version: "1" | "2", obfuscate: boolean) =>
		cases.push({
			fn: "format-cnpj::formatCnpj",
			args: [value, record("FormatCnpjOptions", { pad, version, obfuscate })],
			label: "formatCnpj",
		});

	const values = [
		"",
		"4",
		"46",
		"468",
		"4684",
		"46843",
		"468434",
		"4684348",
		"46843485",
		"468434850",
		"4684348500",
		"46843485000",
		"468434850001",
		"4684348500018",
		"46843485000186",
		"468434850001866",
		"12.345.678/0001-95",
		"q0SLFMBD7VX439",
		"Q0.SLF.MBD/7VX4-39",
		"abc",
	];

	for (const value of values) {
		for (const pad of [false, true]) {
			for (const version of ["1", "2"] as const) {
				for (const obfuscate of [false, true]) push(value, pad, version, obfuscate);
			}
		}
	}

	return cases;
}

/** Days since 1970-01-01 for a local calendar day, the conversion the DX owns. */
export function epochDays(year: number, month: number, day: number): bigint {
	return BigInt(Math.floor(Date.UTC(year, month - 1, day) / 86_400_000));
}

export function holidayCases(): Case[] {
	const cases: Case[] = [];
	for (const year of [1900, 1999, 2000, 2020, 2023, 2024, 2025, 2026, 2030, 2099]) {
		cases.push({ fn: "get-holidays::getHolidays", args: [BigInt(year)], label: "holidays" });
	}
	const random = makeRandom(7_2024);
	for (let index = 0; index < 60; index++) {
		cases.push({
			fn: "get-holidays::getHolidays",
			args: [BigInt(1900 + Math.floor(random() * 200))],
			label: "holidays",
		});
	}
	return cases;
}

export function businessDayCases(): Case[] {
	const cases: Case[] = [];
	const push = (year: number, month: number, day: number, includeOptional: boolean) =>
		cases.push({
			fn: "is-business-day::isBusinessDay",
			args: [epochDays(year, month, day), includeOptional],
			label: `${year}-${month}-${day}`,
		});

	for (const [year, month, day] of [
		[2024, 1, 2],
		[2024, 1, 1],
		[2024, 1, 6],
		[2024, 1, 7],
		[2024, 2, 13],
		[2024, 3, 29],
		[2024, 5, 30],
		[2024, 11, 20],
		[2023, 11, 20],
		[2025, 12, 25],
		[2026, 4, 21],
		[1900, 1, 1],
		[2099, 12, 31],
	]) {
		push(year!, month!, day!, true);
		push(year!, month!, day!, false);
	}

	const random = makeRandom(31_012_024);
	for (let index = 0; index < 400; index++) {
		const year = 1900 + Math.floor(random() * 200);
		const month = 1 + Math.floor(random() * 12);
		const day = 1 + Math.floor(random() * 28);
		push(year, month, day, random() > 0.5);
	}

	return cases;
}

/**
 * Scripted Http, shared by the reference interpreter and every generated target.
 *
 * A URL that is absent models a transport error, and the latency is what decides a race; the
 * reference model resolves it on virtual time, the targets on real time, and both must pick the
 * same winner.
 */
export const HTTP_FIXTURES: Record<string, { status: number; body: string; latencyMillis?: number }> = {
	"https://viacep.com.br/ws/01310100/json/": {
		status: 200,
		body: '{"cep":"01310-100","logradouro":"Avenida Paulista","bairro":"Bela Vista","localidade":"S\u00e3o Paulo","uf":"SP"}',
		latencyMillis: 60,
	},
	"https://brasilapi.com.br/api/cep/v1/01310100": {
		status: 200,
		body: '{"cep":"01310100","state":"SP","city":"S\u00e3o Paulo","neighborhood":"Bela Vista","street":"Avenida Paulista"}',
		latencyMillis: 20,
	},
	// Only BrasilAPI knows this one, and it answers slowly.
	"https://brasilapi.com.br/api/cep/v1/30130010": {
		status: 200,
		body: '{"cep":"30130010","state":"MG","city":"Belo Horizonte","neighborhood":"Centro","street":"Avenida Afonso Pena"}',
		latencyMillis: 40,
	},
	"https://viacep.com.br/ws/99999999/json/": { status: 200, body: '{"erro":true}', latencyMillis: 10 },
	"https://brasilapi.com.br/api/cep/v1/99999999": { status: 404, body: '{"message":"not found"}', latencyMillis: 10 },
	// Neither service answers: every attempt is a transport error, so the retry policy runs.
};

export function cepCases(): Case[] {
	const cases: Case[] = [];
	for (const cep of ["01310100", "30130010", "99999999", "12345678", "0131010", "abcdefgh", ""]) {
		cases.push({ fn: "get-address-info-by-cep::getAddressInfoByCep", args: [cep], label: "cep" });
	}
	return cases;
}

/**
 * The DX conversion the published package performs before formatting.
 *
 * `Intl.NumberFormat` rounds the *shortest round-trip decimal* representation of the double, not
 * its exact binary value, which is why 1.005 formats as "1,01" while `toFixed(2)` answers "1.00".
 * The core takes the exact amount that conversion produces.
 */
export function toScaled(value: number, precision: number): bigint {
	const text = String(value);
	const negative = text.startsWith("-");
	const digits = negative ? text.slice(1) : text;
	const [whole = "0", fraction = ""] = digits.split(".");
	const padded = `${fraction}${"0".repeat(precision + 1)}`;
	const kept = BigInt(`${whole}${padded.slice(0, precision)}`);
	const next = Number(padded[precision]);
	const rounded = next >= 5 ? kept + 1n : kept;
	return negative ? -rounded : rounded;
}

export function currencyCases(): Case[] {
	const cases: Case[] = [];
	const values = [
		0, 1, -1, 0.5, 1.005, 2.675, 10.5, -10.5, 1234.56, -1234.56, 999999.99, 1_000_000, 123, 0.01,
		-0.01, 0.001, 1e9, 12345678.9, -0.5,
	];

	for (const value of values) {
		for (const symbol of [false, true]) {
			cases.push({
				fn: "format-currency::formatCurrency",
				args: [toScaled(value, 2), symbol],
				label: `${value}`,
				// The reference call needs the original double, which the scaled amount no longer carries.
				reference: [value, symbol],
			} as Case);
		}
	}

	return cases;
}

export function allCases(): Case[] {
	return [
		...cpfCases(),
		...cnpjCases(),
		...formatCnpjCases(),
		...holidayCases(),
		...businessDayCases(),
		...cepCases(),
		...currencyCases(),
	];
}
