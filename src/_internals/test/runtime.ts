type RuntimeModule = {
	afterEach: (callback: () => void | Promise<void>) => void;
	beforeEach: (callback: () => void | Promise<void>) => void;
	describe: ((name: string, callback: () => void) => void) & {
		skip: (name: string, callback: () => void) => void;
	};
	expect: (actual: unknown) => any;
	it: (name: string, callback: () => void | Promise<void>, timeout?: number) => void;
	test: (name: string, callback: () => void | Promise<void>, timeout?: number) => void;
	vi: { fn: (...args: any[]) => any; restoreAllMocks: () => void };
};

const runtimeModule: RuntimeModule =
	"Bun" in globalThis
		? await import("./runtime-bun")
		: "Deno" in globalThis
			? await import("./runtime-deno")
			: await import("./runtime-vitest");

export const { afterEach, beforeEach, describe, expect, it, test, vi } = runtimeModule;
