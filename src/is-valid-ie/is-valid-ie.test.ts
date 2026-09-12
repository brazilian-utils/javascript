import { describe, expect, test } from "../_internals/test/runtime";
import { isValidIe } from "./is-valid-ie";

describe("isValidIe", () => {
	describe("AC", () => {
		test("should return true for a valid IE, including one with formatting characters", () => {
			expect(isValidIe("AC", "0108368143106")).toBe(true);
			expect(isValidIe("AC", "01.349.541/474-57")).toBe(true);
		});

		test("should return false when the second verifier digit is incorrect", () => {
			expect(isValidIe("AC", "0187634580933")).toBe(false);
		});

		test("should return false when the first verifier digit is incorrect", () => {
			expect(isValidIe("AC", "0187634580924")).toBe(false);
		});

		test("should return false when the IE does not start with 01", () => {
			expect(isValidIe("AC", "0018763458000")).toBe(false);
		});

		test("should return false when the length is bigger than 13", () => {
			expect(isValidIe("AC", "01018763458064")).toBe(false);
		});

		test("should return false when only the first verifier digit is wrong, even though the second still matches its recomputed value", () => {
			expect(isValidIe("AC", "0108368143116")).toBe(false);
		});

		test("should return false when the length is 14, even though the verifier digits still sit at the valid positions", () => {
			expect(isValidIe("AC", "01083681431069")).toBe(false);
		});
	});

	describe("AL", () => {
		test("should return true for a valid IE", () => {
			expect(isValidIe("AL", "248659758")).toBe(true);
		});

		test("should return true when the check digit 10 is converted to 0", () => {
			expect(isValidIe("AL", "247424170")).toBe(true);
		});

		test("should return false when the verifier digit is incorrect", () => {
			expect(isValidIe("AL", "248659759")).toBe(false);
		});

		test("should return false when the IE does not start with 24", () => {
			expect(isValidIe("AL", "258659750")).toBe(false);
		});

		test("should return false when the length is more than 9", () => {
			expect(isValidIe("AL", "2486597584")).toBe(false);
		});

		test("should return true for another valid IE", () => {
			expect(isValidIe("AL", "240000005")).toBe(true);
		});
	});

	describe("AP", () => {
		test("should return true for valid IEs", () => {
			expect(isValidIe("AP", "036029572")).toBe(true);
			expect(isValidIe("AP", "030123459")).toBe(true);
			expect(isValidIe("AP", "030000080")).toBe(true);
			expect(isValidIe("AP", "030000160")).toBe(true);
			expect(isValidIe("AP", "030170011")).toBe(true);
			expect(isValidIe("AP", "030170020")).toBe(true);
			expect(isValidIe("AP", "030170071")).toBe(true);
		});

		test("should return false when the verifier digit is incorrect", () => {
			expect(isValidIe("AP", "036029573")).toBe(false);
		});

		test("should return false when the length is more than 9 digits", () => {
			expect(isValidIe("AP", "0306029570")).toBe(false);
		});

		test("should return false when the IE does not start with 03", () => {
			expect(isValidIe("AP", "003060292")).toBe(false);
		});

		test("should return true when the inscricao is exactly 3000000, one below the special range starting at 3000001", () => {
			expect(isValidIe("AP", "030000009")).toBe(true);
		});

		test("should return true when the inscricao is exactly 3019023, one above the special range ending at 3019022", () => {
			expect(isValidIe("AP", "030190231")).toBe(true);
		});

		test("should return true when the inscricao is exactly 3000001, the inclusive lower bound of the first special range", () => {
			expect(isValidIe("AP", "030000012")).toBe(true);
		});

		test("should return true when the inscricao is exactly 3017000, the inclusive upper bound of the first special range", () => {
			expect(isValidIe("AP", "030170007")).toBe(true);
		});

		test("should return true when the inscricao is exactly 3019022, the inclusive upper bound of the second special range", () => {
			expect(isValidIe("AP", "030190225")).toBe(true);
		});
	});

	describe("AM", () => {
		test("should return true for valid IEs, including one with formatting characters", () => {
			expect(isValidIe("AM", "48.063.523-4")).toBe(true);
			expect(isValidIe("AM", "036029572")).toBe(true);
			expect(isValidIe("AM", "000000019")).toBe(true);
			expect(isValidIe("AM", "046893830")).toBe(true);
		});

		test("should return false when the verifier digit is incorrect", () => {
			expect(isValidIe("AM", "036029573")).toBe(false);
		});

		test("should return false when the length is more than 9 digits", () => {
			expect(isValidIe("AM", "0036029572")).toBe(false);
		});

		test("should return false when the length is 10, even though the first eight digits alone would form a valid checksum", () => {
			expect(isValidIe("AM", "0468938309")).toBe(false);
		});
	});

	describe("BA", () => {
		test("should return true for an 8-digit IE using the mod 10 rule", () => {
			expect(isValidIe("BA", "12345663")).toBe(true);
		});

		test("should return true for an 8-digit IE using the mod 11 rule", () => {
			expect(isValidIe("BA", "74219145")).toBe(true);
		});

		test("should return true for a 9-digit IE using the mod 10 rule", () => {
			expect(isValidIe("BA", "038343081")).toBe(true);
			expect(isValidIe("BA", "100000306")).toBe(true);
		});

		test("should return true for a 9-digit IE using the mod 11 rule", () => {
			expect(isValidIe("BA", "778514741")).toBe(true);
		});

		test("should return true for a 9-digit IE starting with 0", () => {
			expect(isValidIe("BA", "078771760")).toBe(true);
			expect(isValidIe("BA", "039474751")).toBe(true);
			expect(isValidIe("BA", "090529323")).toBe(true);
		});

		test("should return true for an 8-digit IE starting with 0", () => {
			expect(isValidIe("BA", "04772253")).toBe(true);
		});

		test("should return false for an 8-digit IE with an incorrect mod 10 digit", () => {
			expect(isValidIe("BA", "12345636")).toBe(false);
		});

		test("should return false for an 8-digit IE with an incorrect mod 11 digit", () => {
			expect(isValidIe("BA", "74219154")).toBe(false);
		});

		test("should return false for a 9-digit IE with an incorrect mod 10 digit", () => {
			expect(isValidIe("BA", "038343001")).toBe(false);
		});

		test("should return false for a 9-digit IE with an incorrect mod 11 digit", () => {
			expect(isValidIe("BA", "778514731")).toBe(false);
		});

		test("should return false when the length is more than 9 digits", () => {
			expect(isValidIe("BA", "0012345636")).toBe(false);
		});

		test("should return false when the length is 10, even though the digits would satisfy the checksum formula for that length", () => {
			expect(isValidIe("BA", "1234567804")).toBe(false);
		});

		test("should return false when only the second verifier digit is wrong, even though the first still matches its recomputed value", () => {
			expect(isValidIe("BA", "778514740")).toBe(false);
		});
	});

	describe("CE", () => {
		test("should return true for a valid IE", () => {
			expect(isValidIe("CE", "853511942")).toBe(true);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe("CE", "853511943")).toBe(false);
		});

		test("should return false when the length is more than 9 digits", () => {
			expect(isValidIe("CE", "0853511942")).toBe(false);
		});
	});

	describe("DF", () => {
		test("should return true for a valid IE", () => {
			expect(isValidIe("DF", "0754002000176")).toBe(true);
		});

		test("should return true when the tenth digit is converted to 0", () => {
			expect(isValidIe("DF", "0754002000508")).toBe(true);
		});

		test("should return false when the IE does not start with 07", () => {
			expect(isValidIe("DF", "0108368143017")).toBe(false);
		});

		test("should return false when the length is not 13 digits", () => {
			expect(isValidIe("DF", "07008368143094")).toBe(false);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe("DF", "0754002000175")).toBe(false);
		});

		test("should return false when only the first verifier digit is wrong, even though the second still matches its recomputed value", () => {
			expect(isValidIe("DF", "0754002000186")).toBe(false);
		});
	});

	describe("ES", () => {
		test("should return true for a valid IE", () => {
			expect(isValidIe("ES", "639191444")).toBe(true);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe("ES", "639191445")).toBe(false);
		});

		test("should return false when the length is more than 9 digits", () => {
			expect(isValidIe("ES", "0639191444")).toBe(false);
		});
	});

	describe("GO", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("GO", "109161793")).toBe(true);
		});

		test("should return true for an IE with prefix 15", () => {
			expect(isValidIe("GO", "159876540")).toBe(true);
		});

		test("should return true when the remainder is 1 and the inscricao falls inside the special range 10103105..10119997", () => {
			expect(isValidIe("GO", "101031051")).toBe(true);
		});

		test("should return true when the remainder is 0", () => {
			expect(isValidIe("GO", "101030940")).toBe(true);
		});

		test("should return true for IE 11094402, which accepts both digit 0 and digit 1", () => {
			expect(isValidIe("GO", "110944020")).toBe(true);
			expect(isValidIe("GO", "110944021")).toBe(true);
		});

		test("should return false when the verified digit is incorrect", () => {
			expect(isValidIe("GO", "109161794")).toBe(false);
		});

		test("should return false when the IE does not start with 10, 11 or 15", () => {
			expect(isValidIe("GO", "121031131")).toBe(false);
		});

		test("should return false for prefixes 20 to 29, which the current SEFAZ-GO rule does not accept", () => {
			expect(isValidIe("GO", "209876549")).toBe(false);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe("GO", "0101030940")).toBe(false);
		});

		test("should return false when the remainder is 0, since the special range rule must not apply (10103113 has remainder 0, so the digit is 0, not 1)", () => {
			expect(isValidIe("GO", "101031131")).toBe(false);
			expect(isValidIe("GO", "101031130")).toBe(true);
		});

		test("should return false when the remainder is 1 but the inscricao (10000007) falls outside the special range 10103105..10119997, so the digit is 0", () => {
			expect(isValidIe("GO", "100000071")).toBe(false);
			expect(isValidIe("GO", "100000070")).toBe(true);
		});

		test("should return false when the length is 10, even though the first eight digits alone would form a valid checksum", () => {
			expect(isValidIe("GO", "1091617930")).toBe(false);
		});

		test("should return false for IE 11094402 when the digit is neither 0 nor 1", () => {
			expect(isValidIe("GO", "110944022")).toBe(false);
		});

		test("should return true when the remainder is 1 and the inscricao (10103086) falls just below the special range 10103105..10119997, so the digit is 0", () => {
			expect(isValidIe("GO", "101030860")).toBe(true);
		});

		test("should return true when the remainder is 1 and the inscricao (10120003) falls just above the special range 10103105..10119997, so the digit is 0", () => {
			expect(isValidIe("GO", "101200030")).toBe(true);
		});

		test("should return true when the remainder is 1 and the inscricao is exactly 10119997, the inclusive upper bound of the special range", () => {
			expect(isValidIe("GO", "101199971")).toBe(true);
		});
	});

	describe("MA", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("MA", "120000008")).toBe(true);
		});

		test("should return true when digit 11 is converted to zero", () => {
			expect(isValidIe("MA", "120000040")).toBe(true);
		});

		test("should return true when digit 10 is converted to 1", () => {
			expect(isValidIe("MA", "120000130")).toBe(true);
		});

		test("should return false when the verified digit is incorrect", () => {
			expect(isValidIe("MA", "120000007")).toBe(false);
		});

		test("should return false when the IE does not start with 12", () => {
			expect(isValidIe("MA", "109161793")).toBe(false);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe("MA", "0120000008")).toBe(false);
		});
	});

	describe("MG", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("MG", "4333908330177")).toBe(true);
		});

		test("should return true when the first check digit 10 is converted to 0", () => {
			expect(isValidIe("MG", "4333908330410")).toBe(true);
			expect(isValidIe("MG", "7489439278602")).toBe(true);
		});

		test("should return true when the second check digit 11 is converted to 0", () => {
			expect(isValidIe("MG", "4333908332560")).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe("MG", "4333908330167")).toBe(false);
		});

		test("should return false when the length is different from 13", () => {
			expect(isValidIe("MG", "04333908330177")).toBe(false);
		});

		test("should return false when the second verified digit is incorrect", () => {
			expect(isValidIe("MG", "4333908330176")).toBe(false);
		});

		test("should return false when the length is 14, even though the verifier digits still sit at the valid positions", () => {
			expect(isValidIe("MG", "43339083301770")).toBe(false);
		});
	});

	describe("MT", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("MT", "60474120469")).toBe(true);
		});

		test("should return false when the verified digit is incorrect", () => {
			expect(isValidIe("MT", "12345678901")).toBe(false);
		});

		test("should return false when the length is different from 11", () => {
			expect(isValidIe("MT", "1234567890112")).toBe(false);
		});

		test("should return false when the length is 12, even though the first ten digits alone would form a valid checksum", () => {
			expect(isValidIe("MT", "604741204699")).toBe(false);
		});
	});

	describe("MS", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("MS", "280000006")).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe("MS", "280000090")).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe("MS", "280000030")).toBe(true);
		});

		test("should return true for an IE with prefix 50", () => {
			expect(isValidIe("MS", "500000000")).toBe(true);
		});

		test("should return false when the verified digit is incorrect", () => {
			expect(isValidIe("MS", "280000031")).toBe(false);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe("MS", "0280000006")).toBe(false);
		});

		test("should return false when the IE does not start with 28", () => {
			expect(isValidIe("MS", "853511942")).toBe(false);
		});
	});

	describe("PA", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("PA", "150000006")).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe("PA", "150000260")).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe("PA", "150000030")).toBe(true);
		});

		test("should return true for IEs with prefixes 75 to 79", () => {
			expect(isValidIe("PA", "750000023")).toBe(true);
			expect(isValidIe("PA", "760000000")).toBe(true);
			expect(isValidIe("PA", "770000002")).toBe(true);
			expect(isValidIe("PA", "780000005")).toBe(true);
			expect(isValidIe("PA", "790000008")).toBe(true);
		});

		test("should return false when the IE does not start with 15, 75, 76, 77, 78 or 79", () => {
			expect(isValidIe("PA", "120000008")).toBe(false);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe("PA", "0150000006")).toBe(false);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe("PA", "150000007")).toBe(false);
		});
	});

	describe("PB", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("PB", "853511942")).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe("PB", "853512230")).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe("PB", "853511950")).toBe(true);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe("PB", "0853511942")).toBe(false);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe("PB", "853511943")).toBe(false);
		});
	});

	describe("PE", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("PE", "288625706")).toBe(true);
		});

		test("should return false when the length is different from 9 digits", () => {
			expect(isValidIe("PE", "0925870110")).toBe(false);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe("PE", "925870101")).toBe(false);
		});

		test("should return true for a valid IE whose first verifier digit is not zero", () => {
			expect(isValidIe("PE", "123456797")).toBe(true);
		});

		test("should return false when only the second verifier digit is wrong, even though the first still matches", () => {
			expect(isValidIe("PE", "123456790")).toBe(false);
		});

		test("should return false when only the first verifier digit is wrong, even though the second still matches", () => {
			expect(isValidIe("PE", "123456787")).toBe(false);
		});
	});

	describe("PI", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("PI", "052364534")).toBe(true);
		});
	});

	describe("PR", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("PR", "4447953604")).toBe(true);
		});

		test("should return true when the first check digit is below 10 and needs no clamping", () => {
			expect(isValidIe("PR", "0000000191")).toBe(true);
		});

		test("should return true when the second check digit is the exceptional 10, clamped to 0", () => {
			expect(isValidIe("PR", "0000000000")).toBe(true);
		});

		test("should return false when the length is different from 10 digits", () => {
			expect(isValidIe("PR", "04447953604")).toBe(false);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe("PR", "4447953640")).toBe(false);
		});

		test("should return false when the length is 11, even though the verifier digits still sit at the valid positions", () => {
			expect(isValidIe("PR", "44479536044")).toBe(false);
		});

		test("should return false when only the second verifier digit is wrong, even though the first still matches", () => {
			expect(isValidIe("PR", "4447953600")).toBe(false);
		});

		test("should return false when only the first verifier digit is wrong, even though the second still matches", () => {
			expect(isValidIe("PR", "4447953614")).toBe(false);
		});
	});

	describe("RJ", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("RJ", "62545372")).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe("RJ", "62545470")).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe("RJ", "62545380")).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe("RJ", "20441620")).toBe(false);
		});

		test("should return false when the length is different from 8", () => {
			expect(isValidIe("RJ", "020441623")).toBe(false);
		});

		test("should return false when the length is 9, even though the verifier digit still sits at the valid position", () => {
			expect(isValidIe("RJ", "625453720")).toBe(false);
		});
	});

	describe("RN", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("RN", "2007693232")).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe("RN", "2003569880")).toBe(true);
		});

		test("should return true for an old-format IE", () => {
			expect(isValidIe("RN", "203569881")).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe("RN", "2007693231")).toBe(false);
		});

		test("should return false when the IE does not start with 20", () => {
			expect(isValidIe("RN", "0203569881")).toBe(false);
		});

		test("should return false when the length is different from 9 or 10", () => {
			expect(isValidIe("RN", "20356988104")).toBe(false);
		});
	});

	describe("RO", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("RO", "01078042249629")).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe("RO", "01078042249670")).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe("RO", "01078042249751")).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe("RO", "01078042249756")).toBe(false);
		});

		test("should return false when the length is different from 14", () => {
			expect(isValidIe("RO", "001078042249627")).toBe(false);
		});

		test("should return true for another valid IE that exercises the wrap-around weight", () => {
			expect(isValidIe("RO", "12345678901231")).toBe(true);
		});
	});

	describe("RR", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("RR", "240061536")).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe("RR", "240061537")).toBe(false);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe("RR", "2400615366")).toBe(false);
		});

		test("should return false when the IE does not start with 24", () => {
			expect(isValidIe("RR", "024006150")).toBe(false);
		});

		test("should return true for another valid IE with a non-zero check digit", () => {
			expect(isValidIe("RR", "240000001")).toBe(true);
		});
	});

	describe("RS", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("RS", "0305169149")).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe("RS", "1202762660")).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe("RS", "1202762120")).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe("RS", "2007693232")).toBe(false);
		});

		test("should return false when the length is different from 10", () => {
			expect(isValidIe("RS", "02007693230")).toBe(false);
		});

		test("should return false when the length is 11, even though the verifier digit still sits at the valid position", () => {
			expect(isValidIe("RS", "03051691499")).toBe(false);
		});
	});

	describe("SC", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("SC", "330430572")).toBe(true);
		});
	});

	describe("SE", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("SE", "017682606")).toBe(true);
		});
	});

	describe("SP", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe("SP", "110042490114")).toBe(true);
		});

		test("should return true for a produtor rural IE (P0MMMSSSSD000), including with formatting characters and lowercase prefix", () => {
			expect(isValidIe("SP", "P011004243002")).toBe(true);
			expect(isValidIe("SP", "P-01100424.3/002")).toBe(true);
			expect(isValidIe("SP", "p011004243002")).toBe(true);
		});

		test("should return false when the length is bigger than 12", () => {
			expect(isValidIe("SP", "1110042494114")).toBe(false);
		});

		test("should return false when the second verified digit is incorrect", () => {
			expect(isValidIe("SP", "110042490113")).toBe(false);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe("SP", "110042498113")).toBe(false);
		});

		test("should return false for a produtor rural IE with an incorrect verified digit", () => {
			expect(isValidIe("SP", "P011004244002")).toBe(false);
		});

		test("should return false for a produtor rural IE with a length different from 13", () => {
			expect(isValidIe("SP", "P01100424300")).toBe(false);
		});

		test("should return false when a letter appears in a position that must be a digit", () => {
			expect(isValidIe("SP", "11004249011A")).toBe(false);
		});

		test("should return false when a company IE has an extra trailing digit, even though the first twelve digits alone would form a valid checksum", () => {
			expect(isValidIe("SP", "1100424901149")).toBe(false);
		});

		test("should return false when a 'P' followed by twelve digits appears at the end of a longer string, instead of at the very start", () => {
			expect(isValidIe("SP", "0011004243P000000000000")).toBe(false);
		});

		test("should return false when a produtor rural IE has an extra trailing digit, even though the verifier digit still sits at the valid position", () => {
			expect(isValidIe("SP", "P0110042430029")).toBe(false);
		});
	});

	describe("TO", () => {
		test("should return true for a valid IE using the old base rule", () => {
			expect(isValidIe("TO", "01027737427")).toBe(true);
		});

		test("should return true for a valid IE using the new base rule", () => {
			expect(isValidIe("TO", "294467696")).toBe(true);
		});

		test("should return true when the digit is zero", () => {
			expect(isValidIe("TO", "294150870")).toBe(true);
		});

		test("should return false for an old-rule IE with an invalid category", () => {
			expect(isValidIe("TO", "01047737427")).toBe(false);
		});

		test("should return false for an 11-digit IE with an invalid type, since it must not fall back to the 9-digit rule", () => {
			expect(isValidIe("TO", "29000000947")).toBe(false);
		});

		test("should return false when the length is more than 11 digits", () => {
			expect(isValidIe("TO", "099999916599")).toBe(false);
		});

		test("should return false when the verified digit is incorrect", () => {
			expect(isValidIe("TO", "99999916598")).toBe(false);
		});

		test("should return false for a new-rule IE with an incorrect verified digit", () => {
			expect(isValidIe("TO", "294467690")).toBe(false);
		});

		test("should return false when the length is 10, even though the first eight digits alone would form a valid checksum", () => {
			expect(isValidIe("TO", "2944676960")).toBe(false);
		});
	});

	describe("state code lookup", () => {
		test("should not resolve properties from the prototype chain", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe("constructor", "110042490114")).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe("toString", "110042490114")).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe("__proto__", "110042490114")).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe("valueOf", "110042490114")).toBe(false);
		});

		test("should accept lowercase state codes", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe("sp", "110042490114")).toBe(true);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe("go", "109161793")).toBe(true);
		});

		test("should return false for missing arguments", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe(null, "110042490114")).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe(1, "110042490114")).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe("SP", null)).toBe(false);
		});

		test("should return false when the sanitized IE is empty", () => {
			expect(isValidIe("RJ", "----")).toBe(false);
		});

		test("should return false when the IE is not a string, even though its digits alone would form a valid checksum", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe("RJ", 62_545_372)).toBe(false);
		});

		test("should strip letters from a non-SP IE before validating it", () => {
			expect(isValidIe("RJ", "625X45372")).toBe(true);
		});
	});
});
