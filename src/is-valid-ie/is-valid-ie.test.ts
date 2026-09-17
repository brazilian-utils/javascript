import * as fc from "fast-check";

import { DATA as STATES, type StateCode } from "../_internals/constants/states";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { type IsValidIeParams, isValidIe } from "./is-valid-ie";

describe("isValidIe", () => {
	describe("AC", () => {
		test("should return true for a valid IE, including one with formatting characters", () => {
			expect(isValidIe({ value: "0108368143106", stateCode: "AC" })).toBe(true);
			expect(isValidIe({ value: "01.349.541/474-57", stateCode: "AC" })).toBe(true);
		});

		test("should return false when the second verifier digit is incorrect", () => {
			expect(isValidIe({ value: "0187634580933", stateCode: "AC" })).toBe(false);
		});

		test("should return false when the first verifier digit is incorrect", () => {
			expect(isValidIe({ value: "0187634580924", stateCode: "AC" })).toBe(false);
		});

		test("should return false when the IE does not start with 01", () => {
			expect(isValidIe({ value: "0018763458000", stateCode: "AC" })).toBe(false);
		});

		test("should return false when the length is bigger than 13", () => {
			expect(isValidIe({ value: "01018763458064", stateCode: "AC" })).toBe(false);
		});

		test("should return false when only the first verifier digit is wrong, even though the second still matches its recomputed value", () => {
			expect(isValidIe({ value: "0108368143116", stateCode: "AC" })).toBe(false);
		});

		test("should return false when the length is 14, even though the verifier digits still sit at the valid positions", () => {
			expect(isValidIe({ value: "01083681431069", stateCode: "AC" })).toBe(false);
		});
	});

	describe("AL", () => {
		test("should return true for a valid IE", () => {
			expect(isValidIe({ value: "248659758", stateCode: "AL" })).toBe(true);
		});

		test("should return true when the check digit 10 is converted to 0", () => {
			expect(isValidIe({ value: "247424170", stateCode: "AL" })).toBe(true);
		});

		test("should return false when the verifier digit is incorrect", () => {
			expect(isValidIe({ value: "248659759", stateCode: "AL" })).toBe(false);
		});

		test("should return false when the IE does not start with 24", () => {
			expect(isValidIe({ value: "258659750", stateCode: "AL" })).toBe(false);
		});

		test("should return false when the length is more than 9", () => {
			expect(isValidIe({ value: "2486597584", stateCode: "AL" })).toBe(false);
		});

		test("should return true for another valid IE", () => {
			expect(isValidIe({ value: "240000005", stateCode: "AL" })).toBe(true);
		});
	});

	describe("AP", () => {
		test("should return true for valid IEs", () => {
			expect(isValidIe({ value: "036029572", stateCode: "AP" })).toBe(true);
			expect(isValidIe({ value: "030123459", stateCode: "AP" })).toBe(true);
			expect(isValidIe({ value: "030000080", stateCode: "AP" })).toBe(true);
			expect(isValidIe({ value: "030000160", stateCode: "AP" })).toBe(true);
			expect(isValidIe({ value: "030170011", stateCode: "AP" })).toBe(true);
			expect(isValidIe({ value: "030170020", stateCode: "AP" })).toBe(true);
			expect(isValidIe({ value: "030170071", stateCode: "AP" })).toBe(true);
		});

		test("should return false when the verifier digit is incorrect", () => {
			expect(isValidIe({ value: "036029573", stateCode: "AP" })).toBe(false);
		});

		test("should return false when the length is more than 9 digits", () => {
			expect(isValidIe({ value: "0306029570", stateCode: "AP" })).toBe(false);
		});

		test("should return false when the IE does not start with 03", () => {
			expect(isValidIe({ value: "003060292", stateCode: "AP" })).toBe(false);
		});

		test("should return true when the inscricao is exactly 3000000, one below the special range starting at 3000001", () => {
			expect(isValidIe({ value: "030000009", stateCode: "AP" })).toBe(true);
		});

		test("should return true when the inscricao is exactly 3019023, one above the special range ending at 3019022", () => {
			expect(isValidIe({ value: "030190231", stateCode: "AP" })).toBe(true);
		});

		test("should return true when the inscricao is exactly 3000001, the inclusive lower bound of the first special range", () => {
			expect(isValidIe({ value: "030000012", stateCode: "AP" })).toBe(true);
		});

		test("should return true when the inscricao is exactly 3017000, the inclusive upper bound of the first special range", () => {
			expect(isValidIe({ value: "030170007", stateCode: "AP" })).toBe(true);
		});

		test("should return true when the inscricao is exactly 3019022, the inclusive upper bound of the second special range", () => {
			expect(isValidIe({ value: "030190225", stateCode: "AP" })).toBe(true);
		});
	});

	describe("AM", () => {
		test("should return true for valid IEs, including one with formatting characters", () => {
			expect(isValidIe({ value: "48.063.523-4", stateCode: "AM" })).toBe(true);
			expect(isValidIe({ value: "036029572", stateCode: "AM" })).toBe(true);
			expect(isValidIe({ value: "000000019", stateCode: "AM" })).toBe(true);
			expect(isValidIe({ value: "046893830", stateCode: "AM" })).toBe(true);
		});

		test("should return false when the verifier digit is incorrect", () => {
			expect(isValidIe({ value: "036029573", stateCode: "AM" })).toBe(false);
		});

		test("should return false when the length is more than 9 digits", () => {
			expect(isValidIe({ value: "0036029572", stateCode: "AM" })).toBe(false);
		});

		test("should return false when the length is 10, even though the first eight digits alone would form a valid checksum", () => {
			expect(isValidIe({ value: "0468938309", stateCode: "AM" })).toBe(false);
		});
	});

	describe("BA", () => {
		test("should return true for an 8-digit IE using the mod 10 rule", () => {
			expect(isValidIe({ value: "12345663", stateCode: "BA" })).toBe(true);
		});

		test("should return true for an 8-digit IE using the mod 11 rule", () => {
			expect(isValidIe({ value: "74219145", stateCode: "BA" })).toBe(true);
		});

		test("should return true for a 9-digit IE using the mod 10 rule", () => {
			expect(isValidIe({ value: "038343081", stateCode: "BA" })).toBe(true);
			expect(isValidIe({ value: "100000306", stateCode: "BA" })).toBe(true);
		});

		test("should return true for a 9-digit IE using the mod 11 rule", () => {
			expect(isValidIe({ value: "778514741", stateCode: "BA" })).toBe(true);
		});

		test("should return true for a 9-digit IE starting with 0", () => {
			expect(isValidIe({ value: "078771760", stateCode: "BA" })).toBe(true);
			expect(isValidIe({ value: "039474751", stateCode: "BA" })).toBe(true);
			expect(isValidIe({ value: "090529323", stateCode: "BA" })).toBe(true);
		});

		test("should return true for an 8-digit IE starting with 0", () => {
			expect(isValidIe({ value: "04772253", stateCode: "BA" })).toBe(true);
		});

		test("should return false for an 8-digit IE with an incorrect mod 10 digit", () => {
			expect(isValidIe({ value: "12345636", stateCode: "BA" })).toBe(false);
		});

		test("should return false for an 8-digit IE with an incorrect mod 11 digit", () => {
			expect(isValidIe({ value: "74219154", stateCode: "BA" })).toBe(false);
		});

		test("should return false for a 9-digit IE with an incorrect mod 10 digit", () => {
			expect(isValidIe({ value: "038343001", stateCode: "BA" })).toBe(false);
		});

		test("should return false for a 9-digit IE with an incorrect mod 11 digit", () => {
			expect(isValidIe({ value: "778514731", stateCode: "BA" })).toBe(false);
		});

		test("should return false when the length is more than 9 digits", () => {
			expect(isValidIe({ value: "0012345636", stateCode: "BA" })).toBe(false);
		});

		test("should return false when the length is 10, even though the digits would satisfy the checksum formula for that length", () => {
			expect(isValidIe({ value: "1234567804", stateCode: "BA" })).toBe(false);
		});

		test("should return false when only the second verifier digit is wrong, even though the first still matches its recomputed value", () => {
			expect(isValidIe({ value: "778514740", stateCode: "BA" })).toBe(false);
		});
	});

	describe("CE", () => {
		test("should return true for a valid IE", () => {
			expect(isValidIe({ value: "853511942", stateCode: "CE" })).toBe(true);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe({ value: "853511943", stateCode: "CE" })).toBe(false);
		});

		test("should return false when the length is more than 9 digits", () => {
			expect(isValidIe({ value: "0853511942", stateCode: "CE" })).toBe(false);
		});
	});

	describe("DF", () => {
		test("should return true for a valid IE", () => {
			expect(isValidIe({ value: "0754002000176", stateCode: "DF" })).toBe(true);
		});

		test("should return true when the tenth digit is converted to 0", () => {
			expect(isValidIe({ value: "0754002000508", stateCode: "DF" })).toBe(true);
		});

		test("should return false when the IE does not start with 07", () => {
			expect(isValidIe({ value: "0108368143017", stateCode: "DF" })).toBe(false);
		});

		test("should return false when the length is not 13 digits", () => {
			expect(isValidIe({ value: "07008368143094", stateCode: "DF" })).toBe(false);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe({ value: "0754002000175", stateCode: "DF" })).toBe(false);
		});

		test("should return false when only the first verifier digit is wrong, even though the second still matches its recomputed value", () => {
			expect(isValidIe({ value: "0754002000186", stateCode: "DF" })).toBe(false);
		});
	});

	describe("ES", () => {
		test("should return true for a valid IE", () => {
			expect(isValidIe({ value: "639191444", stateCode: "ES" })).toBe(true);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe({ value: "639191445", stateCode: "ES" })).toBe(false);
		});

		test("should return false when the length is more than 9 digits", () => {
			expect(isValidIe({ value: "0639191444", stateCode: "ES" })).toBe(false);
		});
	});

	describe("GO", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "109161793", stateCode: "GO" })).toBe(true);
		});

		test("should return true for an IE with prefix 15", () => {
			expect(isValidIe({ value: "159876540", stateCode: "GO" })).toBe(true);
		});

		test("should return true when the remainder is 1 and the inscricao falls inside the special range 10103105..10119997", () => {
			expect(isValidIe({ value: "101031051", stateCode: "GO" })).toBe(true);
		});

		test("should return true when the remainder is 0", () => {
			expect(isValidIe({ value: "101030940", stateCode: "GO" })).toBe(true);
		});

		test("should return true for IE 11094402, which accepts both digit 0 and digit 1", () => {
			expect(isValidIe({ value: "110944020", stateCode: "GO" })).toBe(true);
			expect(isValidIe({ value: "110944021", stateCode: "GO" })).toBe(true);
		});

		test("should return false when the verified digit is incorrect", () => {
			expect(isValidIe({ value: "109161794", stateCode: "GO" })).toBe(false);
		});

		test("should return false when the IE does not start with 10, 11 or 15", () => {
			expect(isValidIe({ value: "121031131", stateCode: "GO" })).toBe(false);
		});

		test("should return false for prefixes 20 to 29, which the current SEFAZ-GO rule does not accept", () => {
			expect(isValidIe({ value: "209876549", stateCode: "GO" })).toBe(false);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe({ value: "0101030940", stateCode: "GO" })).toBe(false);
		});

		test("should return false when the remainder is 0, since the special range rule must not apply (10103113 has remainder 0, so the digit is 0, not 1)", () => {
			expect(isValidIe({ value: "101031131", stateCode: "GO" })).toBe(false);
			expect(isValidIe({ value: "101031130", stateCode: "GO" })).toBe(true);
		});

		test("should return false when the remainder is 1 but the inscricao (10000007) falls outside the special range 10103105..10119997, so the digit is 0", () => {
			expect(isValidIe({ value: "100000071", stateCode: "GO" })).toBe(false);
			expect(isValidIe({ value: "100000070", stateCode: "GO" })).toBe(true);
		});

		test("should return false when the length is 10, even though the first eight digits alone would form a valid checksum", () => {
			expect(isValidIe({ value: "1091617930", stateCode: "GO" })).toBe(false);
		});

		test("should return false for IE 11094402 when the digit is neither 0 nor 1", () => {
			expect(isValidIe({ value: "110944022", stateCode: "GO" })).toBe(false);
		});

		test("should return true when the remainder is 1 and the inscricao (10103086) falls just below the special range 10103105..10119997, so the digit is 0", () => {
			expect(isValidIe({ value: "101030860", stateCode: "GO" })).toBe(true);
		});

		test("should return true when the remainder is 1 and the inscricao (10120003) falls just above the special range 10103105..10119997, so the digit is 0", () => {
			expect(isValidIe({ value: "101200030", stateCode: "GO" })).toBe(true);
		});

		test("should return true when the remainder is 1 and the inscricao is exactly 10119997, the inclusive upper bound of the special range", () => {
			expect(isValidIe({ value: "101199971", stateCode: "GO" })).toBe(true);
		});
	});

	describe("MA", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "120000008", stateCode: "MA" })).toBe(true);
		});

		test("should return true when digit 11 is converted to zero", () => {
			expect(isValidIe({ value: "120000040", stateCode: "MA" })).toBe(true);
		});

		test("should return true when digit 10 is converted to 1", () => {
			expect(isValidIe({ value: "120000130", stateCode: "MA" })).toBe(true);
		});

		test("should return false when the verified digit is incorrect", () => {
			expect(isValidIe({ value: "120000007", stateCode: "MA" })).toBe(false);
		});

		test("should return false when the IE does not start with 12", () => {
			expect(isValidIe({ value: "109161793", stateCode: "MA" })).toBe(false);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe({ value: "0120000008", stateCode: "MA" })).toBe(false);
		});
	});

	describe("MG", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "4333908330177", stateCode: "MG" })).toBe(true);
		});

		test("should return true when the first check digit 10 is converted to 0", () => {
			expect(isValidIe({ value: "4333908330410", stateCode: "MG" })).toBe(true);
			expect(isValidIe({ value: "7489439278602", stateCode: "MG" })).toBe(true);
		});

		test("should return true when the second check digit 11 is converted to 0", () => {
			expect(isValidIe({ value: "4333908332560", stateCode: "MG" })).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe({ value: "4333908330167", stateCode: "MG" })).toBe(false);
		});

		test("should return false when the length is different from 13", () => {
			expect(isValidIe({ value: "04333908330177", stateCode: "MG" })).toBe(false);
		});

		test("should return false when the second verified digit is incorrect", () => {
			expect(isValidIe({ value: "4333908330176", stateCode: "MG" })).toBe(false);
		});

		test("should return false when the length is 14, even though the verifier digits still sit at the valid positions", () => {
			expect(isValidIe({ value: "43339083301770", stateCode: "MG" })).toBe(false);
		});
	});

	describe("MT", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "60474120469", stateCode: "MT" })).toBe(true);
		});

		test("should return false when the verified digit is incorrect", () => {
			expect(isValidIe({ value: "12345678901", stateCode: "MT" })).toBe(false);
		});

		test("should return false when the length is different from 11", () => {
			expect(isValidIe({ value: "1234567890112", stateCode: "MT" })).toBe(false);
		});

		test("should return false when the length is 12, even though the first ten digits alone would form a valid checksum", () => {
			expect(isValidIe({ value: "604741204699", stateCode: "MT" })).toBe(false);
		});
	});

	describe("MS", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "280000006", stateCode: "MS" })).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe({ value: "280000090", stateCode: "MS" })).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe({ value: "280000030", stateCode: "MS" })).toBe(true);
		});

		test("should return true for an IE with prefix 50", () => {
			expect(isValidIe({ value: "500000000", stateCode: "MS" })).toBe(true);
		});

		test("should return false when the verified digit is incorrect", () => {
			expect(isValidIe({ value: "280000031", stateCode: "MS" })).toBe(false);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe({ value: "0280000006", stateCode: "MS" })).toBe(false);
		});

		test("should return false when the IE does not start with 28", () => {
			expect(isValidIe({ value: "853511942", stateCode: "MS" })).toBe(false);
		});
	});

	describe("PA", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "150000006", stateCode: "PA" })).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe({ value: "150000260", stateCode: "PA" })).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe({ value: "150000030", stateCode: "PA" })).toBe(true);
		});

		test("should return true for IEs with prefixes 75 to 79", () => {
			expect(isValidIe({ value: "750000023", stateCode: "PA" })).toBe(true);
			expect(isValidIe({ value: "760000000", stateCode: "PA" })).toBe(true);
			expect(isValidIe({ value: "770000002", stateCode: "PA" })).toBe(true);
			expect(isValidIe({ value: "780000005", stateCode: "PA" })).toBe(true);
			expect(isValidIe({ value: "790000008", stateCode: "PA" })).toBe(true);
		});

		test("should return false when the IE does not start with 15, 75, 76, 77, 78 or 79", () => {
			expect(isValidIe({ value: "120000008", stateCode: "PA" })).toBe(false);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe({ value: "0150000006", stateCode: "PA" })).toBe(false);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe({ value: "150000007", stateCode: "PA" })).toBe(false);
		});
	});

	describe("PB", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "853511942", stateCode: "PB" })).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe({ value: "853512230", stateCode: "PB" })).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe({ value: "853511950", stateCode: "PB" })).toBe(true);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe({ value: "0853511942", stateCode: "PB" })).toBe(false);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe({ value: "853511943", stateCode: "PB" })).toBe(false);
		});
	});

	describe("PE", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "288625706", stateCode: "PE" })).toBe(true);
		});

		test("should return false when the length is different from 9 digits", () => {
			expect(isValidIe({ value: "0925870110", stateCode: "PE" })).toBe(false);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe({ value: "925870101", stateCode: "PE" })).toBe(false);
		});

		test("should return true for a valid IE whose first verifier digit is not zero", () => {
			expect(isValidIe({ value: "123456797", stateCode: "PE" })).toBe(true);
		});

		test("should return false when only the second verifier digit is wrong, even though the first still matches", () => {
			expect(isValidIe({ value: "123456790", stateCode: "PE" })).toBe(false);
		});

		test("should return false when only the first verifier digit is wrong, even though the second still matches", () => {
			expect(isValidIe({ value: "123456787", stateCode: "PE" })).toBe(false);
		});
	});

	describe("PI", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "052364534", stateCode: "PI" })).toBe(true);
		});
	});

	describe("PR", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "4447953604", stateCode: "PR" })).toBe(true);
		});

		test("should return true when the first check digit is below 10 and needs no clamping", () => {
			expect(isValidIe({ value: "0000000191", stateCode: "PR" })).toBe(true);
		});

		test("should return true when the second check digit is the exceptional 10, clamped to 0", () => {
			expect(isValidIe({ value: "0000000000", stateCode: "PR" })).toBe(true);
		});

		test("should return false when the length is different from 10 digits", () => {
			expect(isValidIe({ value: "04447953604", stateCode: "PR" })).toBe(false);
		});

		test("should return false when the digit is incorrect", () => {
			expect(isValidIe({ value: "4447953640", stateCode: "PR" })).toBe(false);
		});

		test("should return false when the length is 11, even though the verifier digits still sit at the valid positions", () => {
			expect(isValidIe({ value: "44479536044", stateCode: "PR" })).toBe(false);
		});

		test("should return false when only the second verifier digit is wrong, even though the first still matches", () => {
			expect(isValidIe({ value: "4447953600", stateCode: "PR" })).toBe(false);
		});

		test("should return false when only the first verifier digit is wrong, even though the second still matches", () => {
			expect(isValidIe({ value: "4447953614", stateCode: "PR" })).toBe(false);
		});
	});

	describe("RJ", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "62545372", stateCode: "RJ" })).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe({ value: "62545470", stateCode: "RJ" })).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe({ value: "62545380", stateCode: "RJ" })).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe({ value: "20441620", stateCode: "RJ" })).toBe(false);
		});

		test("should return false when the length is different from 8", () => {
			expect(isValidIe({ value: "020441623", stateCode: "RJ" })).toBe(false);
		});

		test("should return false when the length is 9, even though the verifier digit still sits at the valid position", () => {
			expect(isValidIe({ value: "625453720", stateCode: "RJ" })).toBe(false);
		});
	});

	describe("RN", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "2007693232", stateCode: "RN" })).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe({ value: "2003569880", stateCode: "RN" })).toBe(true);
		});

		test("should return true for an old-format IE", () => {
			expect(isValidIe({ value: "203569881", stateCode: "RN" })).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe({ value: "2007693231", stateCode: "RN" })).toBe(false);
		});

		test("should return false when the IE does not start with 20", () => {
			expect(isValidIe({ value: "0203569881", stateCode: "RN" })).toBe(false);
		});

		test("should return false when the length is different from 9 or 10", () => {
			expect(isValidIe({ value: "20356988104", stateCode: "RN" })).toBe(false);
		});
	});

	describe("RO", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "01078042249629", stateCode: "RO" })).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe({ value: "01078042249670", stateCode: "RO" })).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe({ value: "01078042249751", stateCode: "RO" })).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe({ value: "01078042249756", stateCode: "RO" })).toBe(false);
		});

		test("should return false when the length is different from 14", () => {
			expect(isValidIe({ value: "001078042249627", stateCode: "RO" })).toBe(false);
		});

		test("should return true for another valid IE that exercises the wrap-around weight", () => {
			expect(isValidIe({ value: "12345678901231", stateCode: "RO" })).toBe(true);
		});
	});

	describe("RR", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "240061536", stateCode: "RR" })).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe({ value: "240061537", stateCode: "RR" })).toBe(false);
		});

		test("should return false when the length is different from 9", () => {
			expect(isValidIe({ value: "2400615366", stateCode: "RR" })).toBe(false);
		});

		test("should return false when the IE does not start with 24", () => {
			expect(isValidIe({ value: "024006150", stateCode: "RR" })).toBe(false);
		});

		test("should return true for another valid IE with a non-zero check digit", () => {
			expect(isValidIe({ value: "240000001", stateCode: "RR" })).toBe(true);
		});
	});

	describe("RS", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "0305169149", stateCode: "RS" })).toBe(true);
		});

		test("should return true when digit 10 is converted to 0", () => {
			expect(isValidIe({ value: "1202762660", stateCode: "RS" })).toBe(true);
		});

		test("should return true when digit 11 is converted to 0", () => {
			expect(isValidIe({ value: "1202762120", stateCode: "RS" })).toBe(true);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe({ value: "2007693232", stateCode: "RS" })).toBe(false);
		});

		test("should return false when the length is different from 10", () => {
			expect(isValidIe({ value: "02007693230", stateCode: "RS" })).toBe(false);
		});

		test("should return false when the length is 11, even though the verifier digit still sits at the valid position", () => {
			expect(isValidIe({ value: "03051691499", stateCode: "RS" })).toBe(false);
		});
	});

	describe("SC", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "330430572", stateCode: "SC" })).toBe(true);
		});
	});

	describe("SE", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "017682606", stateCode: "SE" })).toBe(true);
		});
	});

	describe("SP", () => {
		test("should return true for a valid IE using the base rule", () => {
			expect(isValidIe({ value: "110042490114", stateCode: "SP" })).toBe(true);
		});

		test("should return true for a produtor rural IE (P0MMMSSSSD000), including with formatting characters and lowercase prefix", () => {
			expect(isValidIe({ value: "P011004243002", stateCode: "SP" })).toBe(true);
			expect(isValidIe({ value: "P-01100424.3/002", stateCode: "SP" })).toBe(true);
			expect(isValidIe({ value: "p011004243002", stateCode: "SP" })).toBe(true);
		});

		test("should return false when the length is bigger than 12", () => {
			expect(isValidIe({ value: "1110042494114", stateCode: "SP" })).toBe(false);
		});

		test("should return false when the second verified digit is incorrect", () => {
			expect(isValidIe({ value: "110042490113", stateCode: "SP" })).toBe(false);
		});

		test("should return false when the first verified digit is incorrect", () => {
			expect(isValidIe({ value: "110042498113", stateCode: "SP" })).toBe(false);
		});

		test("should return false for a produtor rural IE with an incorrect verified digit", () => {
			expect(isValidIe({ value: "P011004244002", stateCode: "SP" })).toBe(false);
		});

		test("should return false for a produtor rural IE with a length different from 13", () => {
			expect(isValidIe({ value: "P01100424300", stateCode: "SP" })).toBe(false);
		});

		test("should return false when a letter appears in a position that must be a digit", () => {
			expect(isValidIe({ value: "11004249011A", stateCode: "SP" })).toBe(false);
		});

		test("should return false when a company IE has an extra trailing digit, even though the first twelve digits alone would form a valid checksum", () => {
			expect(isValidIe({ value: "1100424901149", stateCode: "SP" })).toBe(false);
		});

		test("should return false when a 'P' followed by twelve digits appears at the end of a longer string, instead of at the very start", () => {
			expect(isValidIe({ value: "0011004243P000000000000", stateCode: "SP" })).toBe(false);
		});

		test("should return false when a produtor rural IE has an extra trailing digit, even though the verifier digit still sits at the valid position", () => {
			expect(isValidIe({ value: "P0110042430029", stateCode: "SP" })).toBe(false);
		});
	});

	describe("TO", () => {
		test("should return true for a valid IE using the old base rule", () => {
			expect(isValidIe({ value: "01027737427", stateCode: "TO" })).toBe(true);
		});

		test("should return true for a valid IE using the new base rule", () => {
			expect(isValidIe({ value: "294467696", stateCode: "TO" })).toBe(true);
		});

		test("should return true when the digit is zero", () => {
			expect(isValidIe({ value: "294150870", stateCode: "TO" })).toBe(true);
		});

		test("should return false for an old-rule IE with an invalid category", () => {
			expect(isValidIe({ value: "01047737427", stateCode: "TO" })).toBe(false);
		});

		test("should return false for an 11-digit IE with an invalid type, since it must not fall back to the 9-digit rule", () => {
			expect(isValidIe({ value: "29000000947", stateCode: "TO" })).toBe(false);
		});

		test("should return false when the length is more than 11 digits", () => {
			expect(isValidIe({ value: "099999916599", stateCode: "TO" })).toBe(false);
		});

		test("should return false when the verified digit is incorrect", () => {
			expect(isValidIe({ value: "99999916598", stateCode: "TO" })).toBe(false);
		});

		test("should return false for a new-rule IE with an incorrect verified digit", () => {
			expect(isValidIe({ value: "294467690", stateCode: "TO" })).toBe(false);
		});

		test("should return false when the length is 10, even though the first eight digits alone would form a valid checksum", () => {
			expect(isValidIe({ value: "2944676960", stateCode: "TO" })).toBe(false);
		});
	});

	describe("SINTEGRA worked examples", () => {
		const publishedExamples: [StateCode, string][] = [
			["AC", "01.004.823/001-12"],
			["AL", "240000048"],
			["AP", "030123459"],
			["BA", "123456-63"],
			["BA", "612345-57"],
			["BA", "1000003-06"],
			["CE", "06000001-5"],
			["ES", "999999990"],
			["GO", "10.987.654-7"],
			["MA", "120000385"],
			["MG", "062.307.904/0081"],
			["MT", "0013000001-9"],
			["PA", "15999999-5"],
			["PA", "75000002-3"],
			["PB", "06000001-5"],
			["PE", "0321418-40"],
			["PI", "012345679"],
			["PR", "123.45678-50"],
			["RN", "20.040.040-1"],
			["RN", "20.0.040.040-0"],
			["RO", "0000000062521-3"],
			["RR", "24006628-1"],
			["RR", "24001755-6"],
			["RR", "24003429-0"],
			["RR", "24001360-3"],
			["RR", "24008266-8"],
			["RR", "24006153-6"],
			["RR", "24007356-2"],
			["RR", "24005467-4"],
			["RR", "24004145-5"],
			["RR", "24001340-7"],
			["RS", "224/3658792"],
			["SC", "251.040.852"],
			["SE", "27123456-3"],
			["SP", "110.042.490.114"],
			["SP", "P-01100424.3/002"],
			["TO", "29010227836"],
		];

		test("should accept every worked example the SINTEGRA pages print", () => {
			for (const [stateCode, ie] of publishedExamples) {
				expect(isValidIe({ value: ie, stateCode })).toBe(true);
			}
		});

		const derivedFromPublishedFormula: [StateCode, string][] = [
			["AM", "99.999.999-0"],
			["MS", "280000006"],
		];

		test("should accept the values derived from the formulas the AM and MS pages publish", () => {
			for (const [stateCode, ie] of derivedFromPublishedFormula) {
				expect(isValidIe({ value: ie, stateCode })).toBe(true);
			}
		});
	});

	describe("state code lookup", () => {
		test("should not resolve properties from the prototype chain", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe({ value: "110042490114", stateCode: "constructor" })).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe({ value: "110042490114", stateCode: "toString" })).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe({ value: "110042490114", stateCode: "__proto__" })).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe({ value: "110042490114", stateCode: "valueOf" })).toBe(false);
		});

		test("should accept lowercase state codes", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe({ value: "110042490114", stateCode: "sp" })).toBe(true);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe({ value: "109161793", stateCode: "go" })).toBe(true);
		});

		test("should return false for missing arguments", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe({ value: "110042490114", stateCode: null })).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe({ value: "110042490114", stateCode: 1 })).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe({ value: null, stateCode: "SP" })).toBe(false);
		});

		test("should return false when the sanitized IE is empty", () => {
			expect(isValidIe({ value: "----", stateCode: "RJ" })).toBe(false);
		});

		test("should return false when the IE is not a string, even though its digits alone would form a valid checksum", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe({ value: 62_545_372, stateCode: "RJ" })).toBe(false);
		});

		test("should strip letters from a non-SP IE before validating it", () => {
			expect(isValidIe({ value: "625X45372", stateCode: "RJ" })).toBe(true);
		});
	});

	describe("the object form", () => {
		test("should validate the registration against the state code given beside it", () => {
			expect(isValidIe({ value: "110042490114", stateCode: "SP" })).toBe(true);
			expect(isValidIe({ value: "P011004243002", stateCode: "SP" })).toBe(true);
			expect(isValidIe({ value: "0108368143106", stateCode: "AC" })).toBe(true);
			expect(isValidIe({ value: "12345", stateCode: "RJ" })).toBe(false);
			expect(isValidIe({ value: "0187634580933", stateCode: "AC" })).toBe(false);
		});

		test("should return false when the object carries no usable registration or state code", () => {
			expect(isValidIe({} as IsValidIeParams)).toBe(false);
			expect(isValidIe({ value: "110042490114" } as IsValidIeParams)).toBe(false);
			expect(isValidIe({ stateCode: "SP" } as IsValidIeParams)).toBe(false);
			expect(isValidIe({ value: "110042490114", stateCode: null as unknown as StateCode })).toBe(
				false,
			);
		});

		test("should return false when the first argument is neither an object nor a string", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe()).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe(null)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe(1)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe(true, "110042490114")).toBe(false);
		});
	});

	/* oxlint-disable typescript/no-deprecated -- the deprecated `(stateCode, ie)` form is what this
	   block is about: it has to keep working, and answering exactly like the object form, until v3. */
	describe("the deprecated positional form", () => {
		test("should still validate a registration given after the state code", () => {
			expect(isValidIe("SP", "110042490114")).toBe(true);
			expect(isValidIe("SP", "P011004243002")).toBe(true);
			expect(isValidIe("AC", "0108368143106")).toBe(true);
			expect(isValidIe("RJ", "12345")).toBe(false);
			expect(isValidIe("AC", "0187634580933")).toBe(false);
		});

		test("should return false when the registration is missing", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidIe("SP")).toBe(false);
		});

		test("should give the same verdict as the object form for every state code", () => {
			const registrations = [
				"110042490114",
				"P011004243002",
				"0108368143106",
				"109161793",
				"625X45372",
				"----",
				"",
			];

			for (const state of STATES) {
				for (const registration of registrations) {
					expect(isValidIe(state.code, registration)).toBe(
						isValidIe({ value: registration, stateCode: state.code }),
					);
				}
			}
		});
	});
	/* oxlint-enable typescript/no-deprecated */

	describe("properties", () => {
		const stateCodeArbitrary = fc.constantFrom(...STATES.map((state) => state.code));

		test("should never throw and always return a boolean, for any pair of arguments", () => {
			fc.assert(
				fc.property(fc.anything(), fc.anything(), (first, second) => {
					let result: unknown;

					expect(() => {
						// oxlint-disable-next-line typescript/no-deprecated -- a two argument call resolves to the deprecated overload, and both forms have to survive arbitrary input
						result = isValidIe(first as never, second as never);
					}).not.toThrow();
					expect(typeof result).toBe("boolean");
				}),
			);
		});

		test("should never throw and always return a boolean, for an arbitrary object", () => {
			fc.assert(
				fc.property(fc.anything(), fc.anything(), (value, stateCode) => {
					let result: unknown;

					expect(() => {
						result = isValidIe({ value, stateCode } as never);
					}).not.toThrow();
					expect(typeof result).toBe("boolean");
				}),
			);
		});

		test("should never throw and always return a boolean, for every known state code and arbitrary text", () => {
			fc.assert(
				fc.property(stateCodeArbitrary, fc.string({ unit: "grapheme" }), (stateCode, value) => {
					expect(typeof isValidIe({ value, stateCode })).toBe("boolean");
				}),
			);
		});

		test("should answer the object form exactly like the deprecated positional one", () => {
			fc.assert(
				fc.property(stateCodeArbitrary, fc.string({ unit: "grapheme" }), (stateCode, value) => {
					// oxlint-disable-next-line typescript/no-deprecated -- the deprecated form is one half of the equivalence under test
					expect(isValidIe({ value, stateCode })).toBe(isValidIe(stateCode, value));
				}),
			);
		});

		test("should return false for a state code that does not exist", () => {
			const unknownStateCodeArbitrary = fc
				.string()
				.filter((code) => !STATES.some((state) => state.code === code.toUpperCase()));

			fc.assert(
				fc.property(unknownStateCodeArbitrary, fc.string(), (stateCode, value) => {
					expect(isValidIe({ value, stateCode: stateCode as never })).toBe(false);
				}),
			);
		});
	});
});

/* oxlint-disable typescript/no-deprecated -- a bare `isValidIe` reference resolves to its deprecated
   overload, and this block pins both overloads of the signature on purpose. */
describe("isValidIe types", () => {
	test("should take a single object carrying the registration and the state code", () => {
		const objectForm: (params: IsValidIeParams) => boolean = isValidIe;

		expectTypeOf(objectForm).parameter(0).toEqualTypeOf<IsValidIeParams>();
		expectTypeOf(objectForm).returns.toEqualTypeOf<boolean>();
	});

	test("should require a registration and a state code in the parameters", () => {
		expectTypeOf<IsValidIeParams["value"]>().toEqualTypeOf<string>();
		expectTypeOf<IsValidIeParams["stateCode"]>().toEqualTypeOf<StateCode>();
	});

	test("should still take a StateCode and a string, the deprecated form", () => {
		const deprecatedForm: (stateCode: StateCode, ie: string) => boolean = isValidIe;

		expectTypeOf(deprecatedForm).parameter(0).toEqualTypeOf<StateCode>();
		expectTypeOf(deprecatedForm).parameter(1).toEqualTypeOf<string>();
		expectTypeOf(deprecatedForm).returns.toEqualTypeOf<boolean>();
	});
});
/* oxlint-enable typescript/no-deprecated */
