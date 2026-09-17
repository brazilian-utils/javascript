import { type bench as vitestBench, type expectTypeOf as vitestExpectTypeOf } from "vite-plus/test";

type RuntimeModule = {
	afterEach: (callback: () => void | Promise<void>) => void;
	bench: typeof vitestBench;
	beforeEach: (callback: () => void | Promise<void>) => void;
	describe: ((name: string, callback: () => void) => void) & {
		skip: (name: string, callback: () => void) => void;
	};
	expect: (actual: unknown) => any;
	expectTypeOf: typeof vitestExpectTypeOf;
	it: (name: string, callback: () => void | Promise<void>, timeout?: number) => void;
	test: (name: string, callback: () => void | Promise<void>, timeout?: number) => void;
	vi: { fn: (...args: any[]) => any; restoreAllMocks: () => void };
};

const loadRuntime = (): Promise<RuntimeModule> => {
	if ("Bun" in globalThis) return import("./runtime-bun");
	if ("Deno" in globalThis) return import("./runtime-deno");
	return import("./runtime-vitest");
};

const runtimeModule = await loadRuntime();

export const { afterEach, bench, beforeEach, describe, expect, expectTypeOf, it, test, vi } =
	runtimeModule;
