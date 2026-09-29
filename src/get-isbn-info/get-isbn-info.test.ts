import * as fc from "fast-check";

import { ISBN_GROUP_RULES } from "../_internals/constants/isbn-ranges";
import { gs1CheckDigit } from "../_internals/gs1-check-digit/gs1-check-digit";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidIsbn } from "../is-valid-isbn/is-valid-isbn";
import { type IsbnInfo, getIsbnInfo } from "./get-isbn-info";

const withCheckDigit = (body: string): string => `${body}${gs1CheckDigit(body)}`;

describe("getIsbnInfo", () => {
	it("should split a Brazilian ISBN of the group 65", () => {
		expect(getIsbnInfo("978-65-89999-01-0")).toEqual({
			isbn: "9786589999010",
			prefix: "978",
			registrationGroup: "65",
			registrant: "89999",
			publication: "01",
			checkDigit: 0,
			agency: "Brazil",
			isBrazilian: true,
		});
	});

	it("should split a Brazilian ISBN of the group 85, a 3 digit registrant (2000000 to 4549999)", () => {
		expect(getIsbnInfo("9788533302273")).toEqual({
			isbn: "9788533302273",
			prefix: "978",
			registrationGroup: "85",
			registrant: "333",
			publication: "0227",
			checkDigit: 3,
			agency: "Brazil",
			isBrazilian: true,
		});
	});

	it("should include the last value of a range in it (978-85, 1999999 is the end of the 2 digit range)", () => {
		const info = getIsbnInfo(withCheckDigit("978851999999"));

		expect(info?.registrant).toBe("19");
		expect(info?.publication).toBe("99999");
		expect(getIsbnInfo(withCheckDigit("978852000000"))?.registrant).toBe("200");
	});

	it("should split the ISBN Users' Manual example, group 92 (international organizations)", () => {
		const info = getIsbnInfo("978-92-95055-12-4");

		expect(info?.registrationGroup).toBe("92");
		expect(info?.registrant).toBe("95055");
		expect(info?.publication).toBe("12");
		expect(info?.isBrazilian).toBe(false);
	});

	it("should split a one digit group, the English language 0", () => {
		expect(getIsbnInfo("9780306406157")).toMatchObject({
			registrationGroup: "0",
			registrant: "306",
			publication: "40615",
			agency: "English language",
			isBrazilian: false,
		});
	});

	it("should split a 979 ISBN", () => {
		expect(getIsbnInfo("979-10-90636-07-1")).toMatchObject({
			prefix: "979",
			registrationGroup: "10",
			registrant: "90636",
			publication: "07",
			agency: "France",
		});
	});

	it("should return null for 979-0, the ISMN range, which isValidIsbn rejects too", () => {
		const isbn = withCheckDigit("979000000000");

		expect(isValidIsbn(isbn)).toBe(false);
		expect(getIsbnInfo(isbn)).toBeNull();
	});

	it("should return null for a registrant range not assigned yet (978-65-03…), although the check digit is valid", () => {
		const isbn = withCheckDigit("978650300000");

		expect(isValidIsbn(isbn)).toBe(true);
		expect(getIsbnInfo(isbn)).toBeNull();
	});

	it("should read a range the RangeMessage leaves out as not assigned (978-968-00…)", () => {
		expect(getIsbnInfo(withCheckDigit("978968000000"))).toBeNull();
		expect(getIsbnInfo(withCheckDigit("978968010000"))?.registrant).toBe("01");
	});

	it("should return null for a value isValidIsbn rejects", () => {
		expect(getIsbnInfo("9788533302274")).toBeNull();
		expect(getIsbnInfo("8533302276")).toBeNull();
		expect(getIsbnInfo("")).toBeNull();
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getIsbnInfo, anyGarbage);
		});

		test("should split a valid ISBN into elements that put it back together", () => {
			fc.assert(
				fc.property(fc.constantFrom("978", "979"), fc.stringMatching(/^\d{9}$/), (prefix, rest) => {
					const isbn = withCheckDigit(`${prefix}${rest}`);
					const info = getIsbnInfo(isbn);

					if (info === null) return;

					expect(
						`${info.prefix}${info.registrationGroup}${info.registrant}${info.publication}${info.checkDigit}`,
					).toBe(isbn);
					expect(info.registrant.length).toBeGreaterThan(0);
					expect(info.publication.length).toBeGreaterThan(0);
					expect(Object.hasOwn(ISBN_GROUP_RULES, `${info.prefix}-${info.registrationGroup}`)).toBe(
						true,
					);
					expect(info.isBrazilian).toBe(info.agency === "Brazil");
				}),
			);
		});
	});
});

describe("getIsbnInfo types", () => {
	test("should take a string and return an IsbnInfo or null", () => {
		expectTypeOf(getIsbnInfo).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getIsbnInfo).returns.toEqualTypeOf<IsbnInfo | null>();
	});
});
