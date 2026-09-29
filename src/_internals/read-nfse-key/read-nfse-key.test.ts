import { describe, expect, test } from "../test/runtime";
import { readNfseKey } from "./read-nfse-key";

const KEY = "35503082258716523000119000000000001226011357924683";

describe("readNfseKey", () => {
	test("should read the bare key and the key behind the NFS prefix, in any case", () => {
		expect(readNfseKey(KEY)).toBe(KEY);
		expect(readNfseKey(`nfs${KEY}`)).toBe(KEY);
		expect(readNfseKey(" 35503082212abc34501de35000000000001226091357924682 ")).toBe(
			"35503082212ABC34501DE35000000000001226091357924682",
		);
	});

	test("should read the key with any run of separators at the boundaries of its fields", () => {
		expect(readNfseKey("3550308 2 2 58716523000119 0000000000012 2601 135792468 3")).toBe(KEY);
		expect(readNfseKey("3550308.2-2/58716523000119  0000000000012 . 2601-135792468/3")).toBe(KEY);
		expect(readNfseKey(`NFS3550308 2 2 58716523000119 0000000000012 2601 135792468 3`)).toBe(KEY);
	});

	test("should return null for a separator inside a field, before the key or after it", () => {
		expect(readNfseKey("355030 82258716523000119000000000001226011357924683")).toBeNull();
		expect(readNfseKey("35503082258716523000119000000000001226011357924 683")).toBeNull();
		expect(readNfseKey(`-${KEY}`)).toBeNull();
		expect(readNfseKey(`${KEY}.`)).toBeNull();
		expect(readNfseKey(`NFS ${KEY}`)).toBeNull();
	});

	test("should return null for any other character and for the wrong length", () => {
		expect(readNfseKey(`${KEY}_`)).toBeNull();
		expect(readNfseKey(KEY.slice(1))).toBeNull();
		expect(readNfseKey("")).toBeNull();
	});
});
