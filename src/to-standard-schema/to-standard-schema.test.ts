import * as fc from "fast-check";

import { anyGarbage, anyValue } from "../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidBankAccount } from "../is-valid-bank-account/is-valid-bank-account";
import { isValidCnpj } from "../is-valid-cnpj/is-valid-cnpj";
import { isValidCpf } from "../is-valid-cpf/is-valid-cpf";
import { type IsValidIeParams, isValidIe } from "../is-valid-ie/is-valid-ie";
import {
	type StandardSchemaV1,
	type StandardSchemaV1Result,
	type ToStandardSchemaOptions,
	toStandardSchema,
} from "./to-standard-schema";

describe("toStandardSchema", () => {
	test("should expose the Standard Schema properties", () => {
		const schema = toStandardSchema(isValidCpf);

		expect(schema["~standard"].version).toBe(1);
		expect(schema["~standard"].vendor).toBe("brazilian-utils");
		expect(typeof schema["~standard"].validate).toBe("function");
	});

	test("should return the value as it was given when it is valid", () => {
		const schema = toStandardSchema(isValidCpf);

		expect(schema["~standard"].validate("123.456.789-09")).toStrictEqual({
			value: "123.456.789-09",
		});
		expect(schema["~standard"].validate("12345678909")).toStrictEqual({ value: "12345678909" });
	});

	test("should return a single issue with the default message when the value is invalid", () => {
		const schema = toStandardSchema(isValidCpf);

		expect(schema["~standard"].validate("123")).toStrictEqual({
			issues: [{ message: "Invalid value" }],
		});
		expect(schema["~standard"].validate(null)).toStrictEqual({
			issues: [{ message: "Invalid value" }],
		});
	});

	test("should report the message given in the options", () => {
		const schema = toStandardSchema(isValidCpf, { message: "CPF inválido" });

		expect(schema["~standard"].validate("123")).toStrictEqual({
			issues: [{ message: "CPF inválido" }],
		});
		expect(schema["~standard"].validate("12345678909")).toStrictEqual({ value: "12345678909" });
	});

	test("should hand the options to the validator on every call", () => {
		const numeric = toStandardSchema(isValidCnpj);
		const alphanumeric = toStandardSchema(isValidCnpj, { options: { version: 2 } });

		expect(numeric["~standard"].validate("Q0SLFMBD7VX439")).toStrictEqual({
			issues: [{ message: "Invalid value" }],
		});
		expect(alphanumeric["~standard"].validate("Q0SLFMBD7VX439")).toStrictEqual({
			value: "Q0SLFMBD7VX439",
		});
		expect(alphanumeric["~standard"].validate("12345678000195")).toStrictEqual({
			value: "12345678000195",
		});
	});

	test("should validate the object of a validator that takes a single object", () => {
		const ie = toStandardSchema((params: IsValidIeParams) => isValidIe(params));
		const account = toStandardSchema(isValidBankAccount);
		const validIe = { value: "110042490114", stateCode: "SP" } as const;

		expect(ie["~standard"].validate(validIe)).toStrictEqual({ value: validIe });
		expect(ie["~standard"].validate({ value: "110042490115", stateCode: "SP" })).toStrictEqual({
			issues: [{ message: "Invalid value" }],
		});
		expect(account["~standard"].validate({})).toStrictEqual({
			issues: [{ message: "Invalid value" }],
		});
	});

	test("should only accept a validator that answers exactly true", () => {
		const truthy = toStandardSchema((() => 1) as unknown as (value: string) => boolean);

		expect(truthy["~standard"].validate("anything")).toStrictEqual({
			issues: [{ message: "Invalid value" }],
		});
	});

	test("should reject everything when the validator is not a function", () => {
		const notFunctions: unknown[] = [null, undefined, "isValidCpf", 1, {}];

		for (const notAFunction of notFunctions) {
			const schema = toStandardSchema(notAFunction as (value: string) => boolean);

			expect(schema["~standard"].validate("12345678909")).toStrictEqual({
				issues: [{ message: "Invalid value" }],
			});
		}
	});

	test("should fall back to the default message when the message is not a string", () => {
		const notStrings: unknown[] = [null, undefined, 1, {}];

		for (const message of notStrings) {
			const schema = toStandardSchema(isValidCpf, { message: message as string });

			expect(schema["~standard"].validate("123")).toStrictEqual({
				issues: [{ message: "Invalid value" }],
			});
		}
	});

	test("should accept a config that is null", () => {
		const schema = toStandardSchema(isValidCpf, null as unknown as ToStandardSchemaOptions);

		expect(schema["~standard"].validate("12345678909")).toStrictEqual({ value: "12345678909" });
		expect(schema["~standard"].validate("123")).toStrictEqual({
			issues: [{ message: "Invalid value" }],
		});
	});

	describe("properties", () => {
		test("should agree with the validator it wraps, whatever the value", () => {
			const schema = toStandardSchema(isValidCpf);

			fc.assert(
				fc.property(anyValue, (value) => {
					const result = schema["~standard"].validate(value) as StandardSchemaV1Result<string>;

					expect(result.issues === undefined).toBe(isValidCpf(value as string));
				}),
			);
		});

		test("should never throw, whatever the validator, the config and the value", () => {
			fc.assert(
				fc.property(anyGarbage, anyGarbage, anyGarbage, (validate, config, value) => {
					const schema = toStandardSchema(
						validate as (value: unknown) => boolean,
						config as ToStandardSchemaOptions,
					);

					expect(() => schema["~standard"].validate(value)).not.toThrow();
				}),
			);
		});
	});
});

describe("toStandardSchema types", () => {
	test("should infer the value and the options from the validator", () => {
		expectTypeOf(toStandardSchema(isValidCpf)).toEqualTypeOf<StandardSchemaV1<string>>();
		expectTypeOf(toStandardSchema(isValidCnpj, { options: { version: 2 } })).toEqualTypeOf<
			StandardSchemaV1<string>
		>();
		expectTypeOf(toStandardSchema((params: IsValidIeParams) => isValidIe(params))).toEqualTypeOf<
			StandardSchemaV1<IsValidIeParams>
		>();
		expectTypeOf(toStandardSchema)
			.parameter(1)
			.toEqualTypeOf<ToStandardSchemaOptions<unknown> | undefined>();
	});
});
