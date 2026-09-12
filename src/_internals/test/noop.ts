import { type bench as vitestBench, type expectTypeOf as vitestExpectTypeOf } from "vite-plus/test";

const chain: unknown = new Proxy(() => chain, { apply: () => chain, get: () => chain });

/**
 * Runtime stand-in for vitest's `expectTypeOf` on Bun and Deno: every call and property access
 * returns the same chainable no-op, so a `describe("<name> types")` block runs without effect
 * there. The assertions themselves are checked statically by `vp check` and by
 * `npm run test:types`.
 */
export const expectTypeOf = chain as typeof vitestExpectTypeOf;

/**
 * Runtime stand-in for vitest's `bench` outside benchmark mode (vitest in test mode, Bun, Deno):
 * a `describe("<name> benchmarks")` block registers nothing there. `npm run bench` runs vitest in
 * benchmark mode, where the real `bench` is used and the `test` blocks are ignored instead.
 */
export const bench = chain as typeof vitestBench;
