import { describe, expect, test } from "../test/runtime";
import { isValidPixUrl } from "./is-valid-pix-url";

describe("isValidPixUrl", () => {
	describe("should return true", () => {
		test("for a host with a path", () => {
			expect(isValidPixUrl("pix.example.com/qr/v2/1234")).toBe(true);
		});

		test("for a bare host", () => {
			expect(isValidPixUrl("pix.example.com")).toBe(true);
		});

		test("for a host with a trailing slash and upper case letters", () => {
			expect(isValidPixUrl("PIX.Example.com/")).toBe(true);
		});

		test("for a path with the URL unreserved and sub-delimiter characters", () => {
			expect(isValidPixUrl("pix.example.com/a-b_c.d~e%20f!$&'()*+,;=:@")).toBe(true);
		});
	});

	describe("should return false", () => {
		test("for an empty string", () => {
			expect(isValidPixUrl("")).toBe(false);
		});

		test("when it carries a scheme", () => {
			expect(isValidPixUrl("https://pix.example.com/x")).toBe(false);
		});

		test("when it contains whitespace", () => {
			expect(isValidPixUrl("pix example.com/x")).toBe(false);
			expect(isValidPixUrl("pix.example.com/x y")).toBe(false);
		});

		test("when the host has no dot", () => {
			expect(isValidPixUrl("localhost/x")).toBe(false);
		});

		test("when a host label starts or ends with a hyphen", () => {
			expect(isValidPixUrl("-pix.example.com")).toBe(false);
			expect(isValidPixUrl("pix-.example.com")).toBe(false);
		});

		test("when the path carries characters outside the allowed sets", () => {
			expect(isValidPixUrl("pix.example.com/<x>")).toBe(false);
			expect(isValidPixUrl("pix.example.com/x?y=1")).toBe(false);
		});
	});
});
