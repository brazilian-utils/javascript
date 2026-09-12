import { crc16Ccitt } from "../_internals/crc16-ccitt/crc16-ccitt";
import { describe, expect, test } from "../_internals/test/runtime";
import { generateCnpj } from "../generate-cnpj/generate-cnpj";
import { generateCpf } from "../generate-cpf/generate-cpf";
import { isValidPixPayload } from "../is-valid-pix-payload/is-valid-pix-payload";
import { parsePixPayload } from "../parse-pix-payload/parse-pix-payload";
import { generatePixPayload } from "./generate-pix-payload";

const BASE = {
	key: "123e4567-e12b-12d1-a456-426655440000",
	merchantName: "Fulano de Tal",
	merchantCity: "BRASILIA",
};

const EVP = "71c7d9be-4b85-4e43-9f1c-1f3b8b4e9a2d";

describe("generatePixPayload", () => {
	describe("should return null", () => {
		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(generatePixPayload(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(generatePixPayload()).toBeNull();
		});

		test("when it is not an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(generatePixPayload("12345678909")).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(generatePixPayload(123)).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(generatePixPayload(true)).toBeNull();
		});

		test("when the key is invalid", () => {
			expect(
				generatePixPayload({
					key: "11257245286",
					merchantName: "Fulano",
					merchantCity: "Brasilia",
				}),
			).toBeNull();
		});

		test("when neither key nor url is given", () => {
			expect(generatePixPayload({ merchantName: "Fulano", merchantCity: "Brasilia" })).toBeNull();
		});

		test("when both key and url are given", () => {
			expect(
				generatePixPayload({
					key: EVP,
					url: "pix.example.com/qr/v2/1234",
					merchantName: "Fulano",
					merchantCity: "Brasilia",
				}),
			).toBeNull();
		});

		test("when url is not a string", () => {
			expect(
				// @ts-expect-error: intentionally invalid input
				generatePixPayload({ url: 123, merchantName: "Fulano", merchantCity: "Brasilia" }),
			).toBeNull();
		});

		test("when url is an empty string", () => {
			expect(
				generatePixPayload({ url: "", merchantName: "Fulano", merchantCity: "Brasilia" }),
			).toBeNull();
		});

		test("when url is longer than 77 characters", () => {
			expect(
				generatePixPayload({
					url: `pix.example.com/${"a".repeat(65)}`,
					merchantName: "Fulano",
					merchantCity: "Brasilia",
				}),
			).toBeNull();
		});

		test("when url is not a PSP location: scheme, whitespace, no dot in the host, or characters outside the URL sets", () => {
			for (const url of [
				"https://pix.example.com/x",
				"pix example.com/x",
				"localhost/x",
				"pix.example.com/<x>",
			]) {
				expect(
					generatePixPayload({ url, merchantName: "Fulano", merchantCity: "Brasilia" }),
				).toBeNull();
			}
		});

		test("when the amount rounds to 0.00", () => {
			expect(
				generatePixPayload({
					key: "fulano@example.com",
					merchantName: "Fulano",
					merchantCity: "Brasilia",
					amount: 0.001,
				}),
			).toBeNull();
		});

		test("when a dynamic payload (url) also carries an amount or a txid", () => {
			expect(
				generatePixPayload({
					url: "pix.example.com/qr/v2/1234",
					merchantName: "Fulano",
					merchantCity: "Brasilia",
					amount: 10,
				}),
			).toBeNull();
			expect(
				generatePixPayload({
					url: "pix.example.com/qr/v2/1234",
					merchantName: "Fulano",
					merchantCity: "Brasilia",
					txid: "ABC123",
				}),
			).toBeNull();
		});

		test('when it is a function, since a function is not typeof "object" even when it carries key/merchantName/merchantCity properties of its own', () => {
			const impostor = Object.assign(() => null, {
				key: "12345678909",
				merchantName: "Fulano",
				merchantCity: "Brasilia",
			});

			expect(generatePixPayload(impostor)).toBeNull();
		});

		test("when url is not a string, even when its length and stringified form would otherwise pass validation", () => {
			const impostor = { length: 5, toString: () => "pix.example.com/x" };

			expect(
				// @ts-expect-error: intentionally invalid input
				generatePixPayload({ url: impostor, merchantName: "Fulano", merchantCity: "Brasilia" }),
			).toBeNull();
		});

		test("when the merchant name is missing or empty after folding", () => {
			// @ts-expect-error: intentionally invalid input
			expect(generatePixPayload({ key: EVP, merchantCity: "Brasilia" })).toBeNull();
			expect(
				generatePixPayload({ key: EVP, merchantName: "   ", merchantCity: "Brasilia" }),
			).toBeNull();
			expect(
				generatePixPayload({ key: EVP, merchantName: "💸", merchantCity: "Brasilia" }),
			).toBeNull();
		});

		test("when the merchant city is missing or empty after folding", () => {
			// @ts-expect-error: intentionally invalid input
			expect(generatePixPayload({ key: EVP, merchantName: "Fulano" })).toBeNull();
			expect(
				generatePixPayload({ key: EVP, merchantName: "Fulano", merchantCity: " " }),
			).toBeNull();
		});

		test("when the amount is not a positive finite number", () => {
			expect(generatePixPayload({ ...BASE, amount: 0 })).toBeNull();
			expect(generatePixPayload({ ...BASE, amount: -1 })).toBeNull();
			expect(generatePixPayload({ ...BASE, amount: Number.NaN })).toBeNull();
			expect(generatePixPayload({ ...BASE, amount: Number.POSITIVE_INFINITY })).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(generatePixPayload({ ...BASE, amount: "10" })).toBeNull();
		});

		test("when the amount does not fit in 13 characters", () => {
			expect(generatePixPayload({ ...BASE, amount: 123_456_789_012 })).toBeNull();
		});

		test("but accept an amount whose formatted length is exactly 13 characters", () => {
			expect(generatePixPayload({ ...BASE, amount: 9_999_999_999.99 })).toContain(
				"54139999999999.99",
			);
		});

		test("when the txid is not alphanumeric or is too long", () => {
			expect(generatePixPayload({ ...BASE, txid: "Um-Id-Qualquer" })).toBeNull();
			expect(generatePixPayload({ ...BASE, txid: "" })).toBeNull();
			expect(generatePixPayload({ ...BASE, txid: "a".repeat(26) })).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(generatePixPayload({ ...BASE, txid: 123 })).toBeNull();
		});
	});

	describe("should generate a valid payload", () => {
		test("matching the static example of the Bacen manual", () => {
			expect(generatePixPayload(BASE)).toBe(
				"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
			);
		});

		test("that isValidPixPayload accepts", () => {
			expect(isValidPixPayload(generatePixPayload(BASE) ?? "")).toBe(true);
		});

		test("whose CRC covers the payload up to and including 6304", () => {
			const payload = generatePixPayload(BASE) ?? "";

			expect(payload.slice(-4)).toBe(crc16Ccitt(payload.slice(0, -4)));
		});

		test("with the amount formatted with two decimal places", () => {
			expect(generatePixPayload({ ...BASE, amount: 10 })).toContain("540510.00");
			expect(generatePixPayload({ ...BASE, amount: 123.456 })).toContain("5406123.46");
			expect(generatePixPayload({ ...BASE, amount: 0.01 })).toContain("54040.01");
		});

		test("with *** as the txid when it is omitted", () => {
			expect(generatePixPayload(BASE)).toContain("62070503***");
		});

		test("with the txid when it is given", () => {
			expect(generatePixPayload({ ...BASE, txid: "RP123456782019" })).toContain(
				"62180514RP123456782019",
			);
		});
	});

	describe("should generate a dynamic payload when url is given", () => {
		const DYNAMIC_BASE = {
			url: "pix.example.com/qr/v2/1234",
			merchantName: "Fulano de Tal",
			merchantCity: "Brasilia",
		};

		test("with the point of initiation method set to dynamic (12)", () => {
			expect(generatePixPayload(DYNAMIC_BASE)).toContain("010212");
		});

		test("with the url in the merchant account information as sub-object 25", () => {
			expect(generatePixPayload(DYNAMIC_BASE)).toContain("2526pix.example.com/qr/v2/1234");
		});

		test("that isValidPixPayload accepts", () => {
			expect(isValidPixPayload(generatePixPayload(DYNAMIC_BASE) ?? "")).toBe(true);
		});

		test("that parsePixPayload parses back with pointOfInitiation dynamic and no key", () => {
			expect(parsePixPayload(generatePixPayload(DYNAMIC_BASE) ?? "")).toEqual({
				url: "pix.example.com/qr/v2/1234",
				merchantName: "Fulano de Tal",
				merchantCity: "Brasilia",
				pointOfInitiation: "dynamic",
			});
		});

		test("accepting a url of exactly 77 characters", () => {
			const url = `pix.example.com/${"a".repeat(61)}`;

			expect(url.length).toBe(77);

			const payload = generatePixPayload({ ...DYNAMIC_BASE, url });

			expect(payload).not.toBeNull();
			expect(parsePixPayload(payload ?? "")?.url).toBe(url);
		});
	});

	describe("should normalize its parameters", () => {
		test("folding accents out of the merchant name and city", () => {
			expect(
				parsePixPayload(generatePixPayload({ ...BASE, merchantCity: "Brasília" }) ?? ""),
			).toMatchObject({
				merchantCity: "Brasilia",
			});
			expect(
				parsePixPayload(generatePixPayload({ ...BASE, merchantName: "José Antônio" }) ?? ""),
			).toMatchObject({
				merchantName: "Jose Antonio",
			});
		});

		test("trimming trailing whitespace introduced by truncating to the maximum length", () => {
			const pix = parsePixPayload(
				generatePixPayload({ ...BASE, merchantName: `${"A".repeat(24)} B` }) ?? "",
			);

			expect(pix?.merchantName).toBe("A".repeat(24));
		});

		test("truncating the merchant name to 25 characters", () => {
			const pix = parsePixPayload(
				generatePixPayload({ ...BASE, merchantName: "A".repeat(40) }) ?? "",
			);

			expect(pix?.merchantName).toBe("A".repeat(25));
		});

		test("truncating the merchant city to 15 characters", () => {
			const pix = parsePixPayload(
				generatePixPayload({ ...BASE, merchantCity: "B".repeat(40) }) ?? "",
			);

			expect(pix?.merchantCity).toBe("B".repeat(15));
		});

		test("normalizing the key to its DICT canonical form", () => {
			expect(
				parsePixPayload(generatePixPayload({ ...BASE, key: "123.456.789-09" }) ?? "")?.key,
			).toBe("12345678909");
			expect(
				parsePixPayload(generatePixPayload({ ...BASE, key: "(11) 98765-4321" }) ?? "")?.key,
			).toBe("+5511987654321");
			expect(
				parsePixPayload(generatePixPayload({ ...BASE, key: " Fulano@Example.COM " }) ?? "")?.key,
			).toBe("fulano@example.com");
			const upperCaseEvp = EVP.toUpperCase();

			expect(parsePixPayload(generatePixPayload({ ...BASE, key: upperCaseEvp }) ?? "")?.key).toBe(
				EVP,
			);
		});

		test("truncating the description to what the 99 character template leaves", () => {
			const payload = generatePixPayload({
				...BASE,
				key: "12345678909",
				description: "y".repeat(90),
			});

			expect(parsePixPayload(payload ?? "")?.description).toBe("y".repeat(62));
		});

		test("truncating the description to what a phone key leaves", () => {
			const payload = generatePixPayload({
				...BASE,
				key: "1130000000",
				description: "y".repeat(90),
			});

			expect(parsePixPayload(payload ?? "")?.description).toBe("y".repeat(60));
		});

		test("leaving room for the description on a long key", () => {
			const key = `${"a".repeat(56)}@example.com`;
			const payload = generatePixPayload({ ...BASE, key, description: "z".repeat(30) }) ?? "";

			expect(parsePixPayload(payload)?.description).toBe("z".repeat(5));
		});

		test("dropping a description that does not fit at all", () => {
			const key = `${"a".repeat(65)}@example.com`;
			const payload = generatePixPayload({ ...BASE, key, description: "z".repeat(30) }) ?? "";

			expect(parsePixPayload(payload)).not.toHaveProperty("description");
		});
	});

	describe("should round-trip", () => {
		test("through isValidPixPayload and parsePixPayload for randomized CPF keys", () => {
			for (let index = 0; index < 200; index++) {
				const params = {
					key: generateCpf(),
					merchantName: "Fulano de Tal",
					merchantCity: "Brasilia",
					amount: Number(((index + 1) / 100).toFixed(2)),
					txid: `TX${index}`,
				};
				const payload = generatePixPayload(params) ?? "";

				expect(isValidPixPayload(payload)).toBe(true);
				expect(parsePixPayload(payload)).toEqual(params);
			}
		});

		test("through isValidPixPayload and parsePixPayload for randomized CNPJ keys", () => {
			for (let index = 0; index < 200; index++) {
				const params = {
					key: generateCnpj(),
					merchantName: "Loja Exemplo",
					merchantCity: "Sao Paulo",
				};
				const payload = generatePixPayload(params) ?? "";

				expect(isValidPixPayload(payload)).toBe(true);
				expect(parsePixPayload(payload)).toEqual(params);
			}
		});

		test("through isValidPixPayload and parsePixPayload for randomized dynamic urls", () => {
			for (let index = 0; index < 200; index++) {
				const params = {
					url: `pix.example.com/qr/v2/${index}`,
					merchantName: "Fulano de Tal",
					merchantCity: "Brasilia",
				};
				const payload = generatePixPayload(params) ?? "";

				expect(isValidPixPayload(payload)).toBe(true);
				expect(parsePixPayload(payload)).toEqual({ ...params, pointOfInitiation: "dynamic" });
			}
		});
	});
});
