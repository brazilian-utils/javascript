import * as fc from "fast-check";

import { anyGarbage, anyText } from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { obfuscateEmail } from "./obfuscate-email";

describe("obfuscateEmail", () => {
	test("should keep the first 2 characters of the local part and of the domain", () => {
		expect(obfuscateEmail("fulano.silva@example.com")).toBe("fu**********@ex*********");
		expect(obfuscateEmail("lindalva.souza@gmail.com")).toBe("li************@gm*******");
		expect(obfuscateEmail("abc@example.com.br")).toBe("ab*@ex************");
	});

	test("should hide the dots that fall outside the 2 visible characters and preserve the length", () => {
		expect(obfuscateEmail("maria@ab.cd.ef")).toBe("ma***@ab******");
		expect(obfuscateEmail("maria@a.bc")).toBe("ma***@a.**");
		expect(obfuscateEmail("a.b@a.co")).toBe("a.*@a.**");
	});

	test("should always hide the last character of a short local part", () => {
		expect(obfuscateEmail("ab@example.com")).toBe("a*@ex*********");
		expect(obfuscateEmail("a@example.com")).toBe("*@ex*********");
	});

	test("should keep the letter case and the symbols it shows", () => {
		expect(obfuscateEmail("Fulano@Example.COM")).toBe("Fu****@Ex*********");
		expect(obfuscateEmail("_+tag@example.com")).toBe("_+***@ex*********");
	});

	test("should return an empty string for an invalid e-mail address", () => {
		expect(obfuscateEmail("")).toBe("");
		expect(obfuscateEmail("not an e-mail")).toBe("");
		expect(obfuscateEmail("fulano@example")).toBe("");
		expect(obfuscateEmail("fulano@@example.com")).toBe("");
		expect(obfuscateEmail(" fulano@example.com ")).toBe("");
		expect(obfuscateEmail("@example.com")).toBe("");
	});

	test("should return an empty string for a value that is not a string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(obfuscateEmail(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(obfuscateEmail()).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(obfuscateEmail(123)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(obfuscateEmail({ toString: () => "fulano@example.com" })).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(obfuscateEmail(["fulano@example.com"])).toBe("");
	});

	describe("properties", () => {
		const emails = fc.stringMatching(/^[a-z0-9]{1,10}@[a-z0-9]{1,10}\.com$/);

		test("should preserve the length and show at most 2 characters on each side", () => {
			fc.assert(
				fc.property(emails, (email) => {
					const obfuscated = obfuscateEmail(email);

					expect(obfuscated).toHaveLength(email.length);
					expect(obfuscated).toMatch(/^[a-z0-9]{0,2}\*+@[a-z0-9.]{2}\*+$/);
					expect(obfuscated.indexOf("@")).toBe(email.indexOf("@"));
				}),
			);
		});

		test("should only show characters that sit at the same place in the address", () => {
			fc.assert(
				fc.property(emails, (email) => {
					const obfuscated = obfuscateEmail(email);

					for (let index = 0; index < obfuscated.length; index++) {
						expect(["*", email[index]]).toContain(obfuscated[index]);
					}
				}),
			);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(obfuscateEmail, "string", fc.oneof(anyText, anyGarbage));
		});
	});
});

describe("obfuscateEmail types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(obfuscateEmail).parameters.toEqualTypeOf<[value: string]>();
		expectTypeOf(obfuscateEmail).returns.toEqualTypeOf<string>();
	});
});
