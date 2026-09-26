import { describe, expect, test } from "../test/runtime";
import { CBO_CODES } from "./cbo";
import { CBO_DESCRIPTIONS } from "./cbo-descriptions";
import { CFOP_CODES } from "./cfop";
import { CFOP_DESCRIPTIONS } from "./cfop-descriptions";
import { CNAE_CODES } from "./cnae";
import { CNAE_DESCRIPTIONS } from "./cnae-descriptions";

/**
 * The lookup tables the dataset scripts split into a codes module and a descriptions module:
 * the codes of one width back to back, and the description of each at the index of its code.
 */
const TABLES: { name: string; codes: string; width: number; descriptions: readonly unknown[] }[] = [
	{ name: "CBO", codes: CBO_CODES, width: 6, descriptions: CBO_DESCRIPTIONS },
	{ name: "CNAE", codes: CNAE_CODES, width: 7, descriptions: CNAE_DESCRIPTIONS },
	{ name: "CFOP", codes: CFOP_CODES, width: 4, descriptions: CFOP_DESCRIPTIONS },
];

describe("generated lookup tables", () => {
	for (const { name, codes, width, descriptions } of TABLES) {
		describe(name, () => {
			const list = codes.match(new RegExp(`.{${width}}`, "g")) ?? [];

			test("should hold one description for every code, and codes of the table width only", () => {
				expect(list.join("")).toBe(codes);
				expect(list).toHaveLength(descriptions.length);
			});

			test("should list the codes in strictly ascending order", () => {
				expect(list.every((code, index) => index === 0 || list[index - 1] < code)).toBe(true);
			});

			test("should give every code a description", () => {
				for (const description of descriptions.flat()) {
					expect(typeof description === "string" && description.trim() !== "").toBe(true);
				}
			});
		});
	}
});
