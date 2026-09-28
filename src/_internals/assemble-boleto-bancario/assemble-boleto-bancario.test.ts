import { isValidBoleto } from "../../is-valid-boleto/is-valid-boleto";
import { describe, expect, test } from "../test/runtime";
import { assembleBoletoBancario } from "./assemble-boleto-bancario";

describe("assembleBoletoBancario", () => {
	test("should add the three field check digits and the general check digit", () => {
		expect(
			assembleBoletoBancario({
				field1: "001900000",
				field2: "0000000000",
				field3: "0000000000",
				tail: "000000000000000",
			}),
		).toBe("00190000090000000000000000000000500000000000000");
		expect(
			assembleBoletoBancario({
				field1: "341912345",
				field2: "6789012345",
				field3: "6789012345",
				tail: "712340000012345",
			}),
		).toBe("34191234546789012345767890123457812340000012345");
	});

	test("should build a line the validator accepts", () => {
		expect(
			isValidBoleto(
				assembleBoletoBancario({
					field1: "341912345",
					field2: "6789012345",
					field3: "6789012345",
					tail: "712340000012345",
				}),
			),
		).toBe(true);
	});
});
