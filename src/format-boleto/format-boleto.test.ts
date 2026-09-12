import { ARRECADACAO_LINE_LENGTH } from "../_internals/constants/arrecadacao";
import { BOLETO_LENGTH } from "../_internals/constants/boleto";
import { describe, expect, test } from "../_internals/test/runtime";
import { formatBoleto } from "./format-boleto";

describe("formatBoleto", () => {
	test("should format boleto with mask", () => {
		expect(formatBoleto("")).toBe("");
		expect(formatBoleto("1")).toBe("1");
		expect(formatBoleto("10")).toBe("10");
		expect(formatBoleto("104")).toBe("104");
		expect(formatBoleto("1049")).toBe("1049");
		expect(formatBoleto("10491")).toBe("10491");
		expect(formatBoleto("104914")).toBe("10491.4");
		expect(formatBoleto("1049144")).toBe("10491.44");
		expect(formatBoleto("10491443")).toBe("10491.443");
		expect(formatBoleto("104914433")).toBe("10491.4433");
		expect(formatBoleto("1049144338")).toBe("10491.44338");
		expect(formatBoleto("10491443385")).toBe("10491.44338 5");
		expect(formatBoleto("104914433855")).toBe("10491.44338 55");
		expect(formatBoleto("1049144338551")).toBe("10491.44338 551");
		expect(formatBoleto("10491443385511")).toBe("10491.44338 5511");
		expect(formatBoleto("104914433855119")).toBe("10491.44338 55119");
		expect(formatBoleto("1049144338551190")).toBe("10491.44338 55119.0");
		expect(formatBoleto("10491443385511900")).toBe("10491.44338 55119.00");
		expect(formatBoleto("104914433855119000")).toBe("10491.44338 55119.000");
		expect(formatBoleto("1049144338551190000")).toBe("10491.44338 55119.0000");
		expect(formatBoleto("10491443385511900000")).toBe("10491.44338 55119.00000");
		expect(formatBoleto("104914433855119000002")).toBe("10491.44338 55119.000002");
		expect(formatBoleto("1049144338551190000020")).toBe("10491.44338 55119.000002 0");
		expect(formatBoleto("10491443385511900000200")).toBe("10491.44338 55119.000002 00");
		expect(formatBoleto("104914433855119000002000")).toBe("10491.44338 55119.000002 000");
		expect(formatBoleto("1049144338551190000020000")).toBe("10491.44338 55119.000002 0000");
		expect(formatBoleto("10491443385511900000200000")).toBe("10491.44338 55119.000002 00000");
		expect(formatBoleto("104914433855119000002000000")).toBe("10491.44338 55119.000002 00000.0");
		expect(formatBoleto("1049144338551190000020000000")).toBe("10491.44338 55119.000002 00000.00");
		expect(formatBoleto("10491443385511900000200000000")).toBe(
			"10491.44338 55119.000002 00000.000",
		);
		expect(formatBoleto("104914433855119000002000000001")).toBe(
			"10491.44338 55119.000002 00000.0001",
		);
		expect(formatBoleto("1049144338551190000020000000014")).toBe(
			"10491.44338 55119.000002 00000.00014",
		);
		expect(formatBoleto("10491443385511900000200000000141")).toBe(
			"10491.44338 55119.000002 00000.000141",
		);
		expect(formatBoleto("104914433855119000002000000001413")).toBe(
			"10491.44338 55119.000002 00000.000141 3",
		);
		expect(formatBoleto("1049144338551190000020000000014132")).toBe(
			"10491.44338 55119.000002 00000.000141 3 2",
		);
		expect(formatBoleto("10491443385511900000200000000141325")).toBe(
			"10491.44338 55119.000002 00000.000141 3 25",
		);
		expect(formatBoleto("104914433855119000002000000001413252")).toBe(
			"10491.44338 55119.000002 00000.000141 3 252",
		);
		expect(formatBoleto("1049144338551190000020000000014132523")).toBe(
			"10491.44338 55119.000002 00000.000141 3 2523",
		);
		expect(formatBoleto("10491443385511900000200000000141325230")).toBe(
			"10491.44338 55119.000002 00000.000141 3 25230",
		);
		expect(formatBoleto("104914433855119000002000000001413252300")).toBe(
			"10491.44338 55119.000002 00000.000141 3 252300",
		);
		expect(formatBoleto("1049144338551190000020000000014132523000")).toBe(
			"10491.44338 55119.000002 00000.000141 3 2523000",
		);
		expect(formatBoleto("10491443385511900000200000000141325230000")).toBe(
			"10491.44338 55119.000002 00000.000141 3 25230000",
		);
		expect(formatBoleto("104914433855119000002000000001413252300000")).toBe(
			"10491.44338 55119.000002 00000.000141 3 252300000",
		);
		expect(formatBoleto("1049144338551190000020000000014132523000009")).toBe(
			"10491.44338 55119.000002 00000.000141 3 2523000009",
		);
		expect(formatBoleto("10491443385511900000200000000141325230000093")).toBe(
			"10491.44338 55119.000002 00000.000141 3 25230000093",
		);
		expect(formatBoleto("104914433855119000002000000001413252300000934")).toBe(
			"10491.44338 55119.000002 00000.000141 3 252300000934",
		);
		expect(formatBoleto("1049144338551190000020000000014132523000009342")).toBe(
			"10491.44338 55119.000002 00000.000141 3 2523000009342",
		);
		expect(formatBoleto("10491443385511900000200000000141325230000093423")).toBe(
			"10491.44338 55119.000002 00000.000141 3 25230000093423",
		);
	});

	test(`shouldn't add digits after the boleto length (${BOLETO_LENGTH})`, () => {
		expect(formatBoleto("10491443385511900000200000000141325230000093423123123123")).toBe(
			"10491.44338 55119.000002 00000.000141 3 25230000093423",
		);

		expect(formatBoleto("10491443385511900000200000000141325230000093423123123123")).toBe(
			"10491.44338 55119.000002 00000.000141 3 25230000093423",
		);
	});

	test("should remove all non numeric characters boleto", () => {
		expect(formatBoleto("10491.44A338 55119.000002? ABC00000.000?141 3 25230000093423")).toBe(
			"10491.44338 55119.000002 00000.000141 3 25230000093423",
		);

		expect(formatBoleto("10491.44A338 55119.000002? ABC00000.000?141 3 25230000093423")).toBe(
			"10491.44338 55119.000002 00000.000141 3 25230000093423",
		);
	});

	test("should return an empty string when receive an empty string", () => {
		expect(formatBoleto("")).toBe("");
		expect(formatBoleto("")).toBe("");
	});

	test("should return an empty string when the value is nullish", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatBoleto(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatBoleto()).toBe("");
	});

	describe("arrecadação", () => {
		test("should use the arrecadação mask when it starts with 8", () => {
			expect(formatBoleto("846100000005246100291102005460339004695895061080")).toBe(
				"84610000000-5 24610029110-2 00546033900-4 69589506108-0",
			);
			expect(formatBoleto("858900004609524601791605607593050865831483000010")).toBe(
				"85890000460-9 52460179160-5 60759305086-5 83148300001-0",
			);
		});

		test("should keep the cobrança bancária mask for partial values", () => {
			expect(formatBoleto("8")).toBe("8");
			expect(formatBoleto("84610000000")).toBe("84610.00000 0");
			expect(formatBoleto("846100000005")).toBe("84610.00000 05");
			expect(formatBoleto("8461000000052")).toBe("84610.00000 052");
		});

		test("should keep the cobrança bancária mask for the 44 digit barcode", () => {
			expect(formatBoleto("84610000000246100291100054603390069589506108")).toBe(
				"84610.00000 02461.002911 00054.603390 0 69589506108",
			);
		});

		test(`shouldn't apply the arrecadação mask past its length (${ARRECADACAO_LINE_LENGTH})`, () => {
			expect(formatBoleto("846100000005246100291102005460339004695895061080123")).toBe(
				"84610.00000 05246.100291 10200.546033 9 00469589506108",
			);
		});

		test("should remove all non numeric characters", () => {
			expect(formatBoleto("84610000000-5 24610029110-2 00546033900-4 69589506108-0")).toBe(
				"84610000000-5 24610029110-2 00546033900-4 69589506108-0",
			);
		});
	});
});
