import { jest } from "bun:test";

export { afterEach, beforeEach, describe, expect, it, test } from "bun:test";
export { bench, expectTypeOf } from "./noop";

export const vi = {
	fn: jest.fn,
	restoreAllMocks: (): void => {
		jest.restoreAllMocks();
	},
};
