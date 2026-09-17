import { bench as vitestBench, test } from "vite-plus/test";

import { bench as noopBench } from "./noop";

export {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
	test,
	vi,
} from "vite-plus/test";

const isBenchmarkMode = (): boolean => import.meta.env.MODE === "benchmark";

/**
 * In benchmark mode (`npm run bench`) this is vitest's own `bench`. In test mode every benchmark
 * is registered as a todo test instead, so a `describe("<name> benchmarks")` block is never an
 * empty suite (which vitest reports as a failure) and shows up in the run as todo.
 */
export const bench: typeof vitestBench = isBenchmarkMode()
	? vitestBench
	: Object.assign((name: string): void => {
			test.todo(name);
		}, noopBench);
