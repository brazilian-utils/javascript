import { describe, expect, test } from "../test/runtime";
import { findPixMerchantAccountInformation } from "./find-pix-merchant-account-information";

describe("findPixMerchantAccountInformation", () => {
	test("should return the objects of the first template carrying the Pix GUI", () => {
		expect(
			findPixMerchantAccountInformation({
				"26": "0004abcd",
				"27": "0014BR.GOV.BCB.PIX0103key",
				"28": "0014br.gov.bcb.pix0105other",
			}),
		).toStrictEqual({ "00": "BR.GOV.BCB.PIX", "01": "key" });
	});

	test("should read the last template of the range, ID 51", () => {
		expect(findPixMerchantAccountInformation({ "51": "0014br.gov.bcb.pix0103key" })).toStrictEqual({
			"00": "br.gov.bcb.pix",
			"01": "key",
		});
	});

	test("should skip a template that is not well-formed TLV", () => {
		expect(
			findPixMerchantAccountInformation({
				"26": "0014br.gov.bcb.pix01",
				"30": "0014br.gov.bcb.pix0103key",
			}),
		).toStrictEqual({ "00": "br.gov.bcb.pix", "01": "key" });
	});

	test("should return null when no template in IDs 26 to 51 carries the Pix GUI", () => {
		expect(
			findPixMerchantAccountInformation({
				"25": "0014br.gov.bcb.pix0103key",
				"26": "0004abcd",
				"52": "0014br.gov.bcb.pix0103key",
			}),
		).toBeNull();
	});
});
