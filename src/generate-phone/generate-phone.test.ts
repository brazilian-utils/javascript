import * as fc from "fast-check";

import { VALID_AREA_CODES } from "../_internals/constants/area-codes";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidLandlinePhone } from "../is-valid-landline-phone/is-valid-landline-phone";
import { isValidMobilePhone } from "../is-valid-mobile-phone/is-valid-mobile-phone";
import { isValidPhone } from "../is-valid-phone/is-valid-phone";
import { isValidServicePhone } from "../is-valid-service-phone/is-valid-service-phone";
import { type GeneratePhoneType, generatePhone } from "./generate-phone";

const drawAreaCode = (): string => generatePhone("mobile").slice(0, 2);

const drawLandlineFirstDigit = (): string => generatePhone("landline").charAt(2);

describe("generatePhone", () => {
	it("should generate a valid mobile phone", () => {
		expect(isValidMobilePhone(generatePhone("mobile"), { version: 2 })).toBe(true);
	});

	it("should generate a valid landline phone", () => {
		expect(isValidLandlinePhone(generatePhone("landline"))).toBe(true);
	});

	it("should generate a valid service phone", () => {
		expect(isValidServicePhone(generatePhone("service"))).toBe(true);
	});

	it("should generate a valid phone when type is omitted", () => {
		expect(isValidPhone(generatePhone())).toBe(true);
	});

	it("should generate 200 valid phone numbers for every type", () => {
		for (let i = 0; i < 200; i++) {
			expect(isValidMobilePhone(generatePhone("mobile"), { version: 2 })).toBe(true);
			expect(isValidLandlinePhone(generatePhone("landline"))).toBe(true);
			expect(isValidServicePhone(generatePhone("service"))).toBe(true);
			expect(isValidPhone(generatePhone("service"), { accept: ["service"] })).toBe(true);
			expect(isValidPhone(generatePhone())).toBe(true);
		}
	});

	it("should not generate a service phone when type is omitted", () => {
		for (let i = 0; i < 200; i++) {
			expect(isValidServicePhone(generatePhone())).toBe(false);
		}
	});

	it("should generate service phones that survive a format round-trip", () => {
		for (let i = 0; i < 200; i++) {
			const phone = generatePhone("service");

			expect(isValidPhone(phone, { accept: ["mobile", "landline", "service"] })).toBe(true);
		}
	});

	it("should vary the area code across many draws, retrying with extra draws on the astronomically unlikely case they all collide", () => {
		let areaCodes = new Set(Array.from({ length: 200 }, drawAreaCode));

		if (areaCodes.size === 1) {
			areaCodes = new Set(Array.from({ length: 200 }, drawAreaCode));
		}

		expect(areaCodes.size).toBeGreaterThan(1);
	});

	it("should vary the landline's first number digit (2-6) across many draws, retrying with extra draws on the astronomically unlikely case they all collide", () => {
		let firstDigits = new Set(Array.from({ length: 200 }, drawLandlineFirstDigit));

		if (firstDigits.size === 1) {
			firstDigits = new Set(Array.from({ length: 200 }, drawLandlineFirstDigit));
		}

		expect(firstDigits.size).toBeGreaterThan(1);
	});

	it("should pick the non-geographic or the abbreviated service family from the Math.random() < 0.5 boundary", () => {
		const originalRandom = Math.random;

		try {
			Math.random = () => 0.5;
			expect(generatePhone("service")).toHaveLength(11);

			Math.random = () => 0.3;
			expect(generatePhone("service")).toHaveLength(8);
		} finally {
			Math.random = originalRandom;
		}
	});

	it("should pick mobile or landline from the Math.random() >= 0.5 boundary when type is omitted", () => {
		const originalRandom = Math.random;

		try {
			Math.random = () => 0.5;
			expect(generatePhone()).toHaveLength(11);

			Math.random = () => 0.3;
			expect(generatePhone()).toHaveLength(10);
		} finally {
			Math.random = originalRandom;
		}
	});

	it("should generate both mobile-shaped (11 digit) and landline-shaped (10 digit) numbers when type is omitted", () => {
		const lengths = new Set(Array.from({ length: 200 }, () => generatePhone().length));

		expect(lengths.has(11)).toBe(true);
		expect(lengths.has(10)).toBe(true);
	});

	describe("properties", () => {
		test("should always generate a mobile number with a valid area code", () => {
			fc.assert(
				fc.property(fc.constant("mobile" as const), (type) => {
					const phone = generatePhone(type);

					const areaCode = Number(phone.slice(0, 2));

					expect(phone.length).toBe(11);
					expect(phone.charAt(2)).toBe("9");
					expect(VALID_AREA_CODES.includes(areaCode)).toBe(true);
					expect(isValidMobilePhone(phone, { version: 2 })).toBe(true);
				}),
			);
		});

		test("should always generate a landline number with a valid area code", () => {
			fc.assert(
				fc.property(fc.constant("landline" as const), (type) => {
					const phone = generatePhone(type);

					const areaCode = Number(phone.slice(0, 2));

					expect(phone.length).toBe(10);
					expect(/^[2-6]$/.test(phone.charAt(2))).toBe(true);
					expect(VALID_AREA_CODES.includes(areaCode)).toBe(true);
					expect(isValidLandlinePhone(phone)).toBe(true);
				}),
			);
		});

		test("should never generate a service number unless asked to", () => {
			fc.assert(
				fc.property(fc.constant(null), () => {
					const phone = generatePhone();

					expect(isValidPhone(phone)).toBe(true);
					expect(isValidServicePhone(phone)).toBe(false);
				}),
			);
		});

		test("should always generate a service number its own validator accepts", () => {
			fc.assert(
				fc.property(fc.constant("service" as const), (type) => {
					expect(isValidServicePhone(generatePhone(type))).toBe(true);
				}),
			);
		});
	});
});

describe("generatePhone types", () => {
	test("should take an optional phone type and return a string", () => {
		expectTypeOf(generatePhone).parameter(0).toEqualTypeOf<GeneratePhoneType | undefined>();
		expectTypeOf(generatePhone).returns.toEqualTypeOf<string>();
	});

	test("should restrict the type to the supported phone kinds", () => {
		expectTypeOf<GeneratePhoneType>().toEqualTypeOf<"mobile" | "landline" | "service">();
	});
});
