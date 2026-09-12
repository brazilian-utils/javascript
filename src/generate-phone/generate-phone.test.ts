import { describe, expect, it } from "../_internals/test/runtime";
import { isValidLandlinePhone } from "../is-valid-landline-phone/is-valid-landline-phone";
import { isValidMobilePhone } from "../is-valid-mobile-phone/is-valid-mobile-phone";
import { isValidPhone } from "../is-valid-phone/is-valid-phone";
import { isValidServicePhone } from "../is-valid-service-phone/is-valid-service-phone";
import { generatePhone } from "./generate-phone";

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
});
