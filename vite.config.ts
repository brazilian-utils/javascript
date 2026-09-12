import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { transform } from "esbuild";
import { defineConfig } from "vite-plus";
import { type PackUserConfig } from "vite-plus/pack";
import { webdriverio } from "vite-plus/test/browser-webdriverio";

const rootDir = import.meta.dirname;
const srcDir = resolve(rootDir, "src");

type PackPlugin = Extract<NonNullable<PackUserConfig["plugins"]>, unknown[]>[number];

/**
 * The root build ships a UMD file for `require()`, which tsdown never pairs with a `.d.cts`
 * twin (that only happens for the `cjs` format). The bundled declaration has no
 * format-specific syntax, so a same-content copy keeps CommonJS consumers off TypeScript's
 * "masquerading as ESM" error under `moduleResolution: node16`/`nodenext`.
 * @returns {PackPlugin} The pack plugin that emits the `.d.cts` twin.
 */
const emitCjsDtsTwin = (): PackPlugin => ({
	name: "brazilian-utils:emit-cjs-dts-twin",
	generateBundle(_options, bundle) {
		const dts: (typeof bundle)[string] | undefined = bundle["brazilian-utils.d.ts"];
		if (dts === undefined) return;
		this.emitFile({
			type: "asset",
			fileName: "brazilian-utils.d.cts",
			source: dts.type === "chunk" ? dts.code : dts.source,
		});
	},
});

/**
 * The UMD bundle is consumed as-is from a CDN `<script>` tag, where no consumer bundler will
 * ever tree-shake it, so it can take the full `compress` pass (see the `minify` note below for
 * why the ESM bundle cannot). rolldown composes the source map returned here with its own.
 * @returns {PackPlugin} The pack plugin that minifies the UMD chunk.
 */
const minifyUmdChunk = (): PackPlugin => ({
	name: "brazilian-utils:minify-umd",
	async renderChunk(code, _chunk, options) {
		if (options.format !== "umd") return null;
		const result = await transform(code, { minify: true, sourcemap: true, target: "es2020" });
		return { code: result.code, map: result.map };
	},
});

/**
 * Every util directory under `src/` (skipping the `_`-prefixed internal ones) that has a
 * same-named entry file (`src/get-cities/get-cities.ts`, `src/is-valid-cpf/is-valid-cpf.ts`,
 * etc.) becomes its own subpath build entry below, served through the `"./*"` pattern in
 * `package.json`'s `exports`. That lets a consumer `import("@brazilian-utils/brazilian-utils/
 * get-cities")` and pull in only that util's code (and, for `getCities`, its ~90 KB embedded
 * IBGE dataset) instead of the whole root bundle, with no bespoke entry file to maintain per
 * util.
 */
const utilEntryNames = readdirSync(srcDir, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
	.map((entry) => entry.name)
	.filter((name) => existsSync(resolve(srcDir, name, `${name}.ts`)))
	.toSorted();

const utilEntries = Object.fromEntries(
	utilEntryNames.map((name) => [name, resolve(srcDir, name, `${name}.ts`)]),
);

/**
 * Settings shared by both pack configs below (the root build and the per-util subpath build).
 */
const sharedPack = {
	outDir: "dist",
	sourcemap: true,
	dts: true,
	outExtensions: ({ format }: { format: string }): { js: string } => ({
		js: format === "es" ? ".js" : ".cjs",
	}),
	// `compress: false` is intentional: tsdown's default oxc-minify `compress`
	// pass restructures/merges top-level statements, which defeats a
	// consumer bundler's ability to tree-shake unused exports from this
	// entry point (verified: full `compress` shrinks this package's own
	// bundle but makes a single-import consumer bundle balloon to ~80% of
	// the whole library instead of a small fraction of it). Mangling names
	// and stripping whitespace still gets us close to the previous
	// (rollup/esbuild-built) bundle size without breaking tree-shaking.
	minify: { compress: false, mangle: true, codegen: true },
	treeshake: {
		moduleSideEffects: false,
		propertyReadSideEffects: false,
	},
	// Both pack configs below declare the same `publint`/`attw` value, so the build engine
	// dedupes them and runs a single combined check over the fully assembled `dist/`, once
	// every entry (root + every subpath) has finished building, rather than once per config.
	publint: true,
	attw: true,
} satisfies Partial<PackUserConfig>;

/**
 * Why this is two separate `PackUserConfig`s (`pack: [...]`) instead of one multi-entry config
 * with ~77 entries (the root plus one per util):
 *
 * rolldown's default multi-entry code splitting factors any module reachable from 2+ entries out
 * into shared, hash-named chunk files. With every util *also* being its own subpath entry, that
 * means every util module (root's `index.ts` importing it, plus its own subpath entry importing
 * it) clears the "shared by 2+" bar. A combined build turned `dist/brazilian-utils.js` from a
 * ~137 KB self-contained bundle into a ~6 KB barrel of `export ... from "./is-valid-cpf-<hash>.js"`
 * re-exports pointing at ~76 sibling chunk files. Functionally equivalent (an npm-installed
 * consumer still gets everything, since `files` ships the whole `dist/`), but it violates the
 * actual requirement here: the root bundle's *content* must stay put.
 *
 * Two ways to keep multi-entry splitting from touching the root were tried and are dead ends:
 *   - `codeSplitting: false` is rejected outright for a multi-entry build (error: "multiple
 *     inputs are not supported when output.codeSplitting is false"; that flag maps to
 *     `inlineDynamicImports: true`, meaningful only for a single input).
 *   - An explicit catch-all `codeSplitting.groups` entry (`test: /./`) with `minShareCount` set
 *     far above the entry count, intended to make every module fail the threshold and fall back
 *     to being inlined per-entry, has no effect: a module that doesn't clear a group's
 *     `minShareCount` falls back to the *same default automatic splitting*, not to per-entry
 *     inlining (confirmed by comparing `dist/` output with and without the group: identical).
 *
 * So instead, the root is built completely alone, in its own rolldown invocation with no other
 * entry in its module graph (byte-for-byte the same single-entry build this package always
 * shipped), and the ~76 util subpaths are built together in a second, separate invocation. Within
 * that second group, rolldown's default splitting still applies *among the utils themselves*:
 * most end up self-contained (single importer within that graph), but a few genuine cross-util
 * dependencies (e.g. `parsePixKey` reusing `isValidCpf`'s digit-check, several phone utils sharing
 * `formatPhone`'s area-code table) get factored into a small shared chunk, real code reuse that
 * would otherwise be duplicated; either way, none of it touches the root. Running
 * ~77 entries as ~77 *separate* `PackUserConfig`s (fully self-contained, zero sharing at all) was
 * also tried and rejected: with no way to throttle this build engine's per-config concurrency from
 * `vite.config.ts` (`--concurrency` is a CLI-only flag, and this project's `build` script is fixed
 * to plain `vp pack`), that many concurrent rolldown + dts builds reliably exhausted the heap
 * (`FATAL ERROR: Reached heap limit`) before producing any output. Two configs is the balance that
 * keeps both memory use and cross-entry sharing in check.
 */

export default defineConfig({
	fmt: {
		ignorePatterns: ["dist", "coverage", "docs", ".claude"],
		singleQuote: false,
		sortImports: true,
		useTabs: true,
	},
	lint: {
		options: {
			typeAware: true,
			typeCheck: true,
		},
		plugins: ["oxc", "typescript", "unicorn", "import", "jsdoc", "promise", "vitest"],
		categories: {
			correctness: "error",
			suspicious: "error",
			perf: "error",
			pedantic: "error",
		},
		ignorePatterns: ["dist", "coverage", "docs", "reports", ".stryker-tmp", ".claude"],
		rules: {
			"eslint/complexity": ["error", { max: 20 }],
			"eslint/max-lines": "off",
			"eslint/max-lines-per-function": [
				"error",
				{ max: 120, skipBlankLines: true, skipComments: true },
			],
			"eslint/no-console": "error",
			"eslint/no-empty": "error",
			"import/no-unassigned-import": ["error", { allow: ["**/*.d.ts"] }],
			"eslint/max-classes-per-file": "off",
			"eslint/no-empty-function": "error",
			"eslint/no-param-reassign": "error",
			"eslint/no-use-before-define": "error",
			"eslint/no-void": "error",
			"eslint/require-unicode-regexp": "off",
			"typescript/prefer-readonly-parameter-types": "off",
			"unicorn/prefer-code-point": "off",
			"unicorn/prefer-number-coercion": "off",
			"import/no-cycle": "error",
			"import/no-default-export": "error",
			"import/no-duplicates": "error",
			"jsdoc/check-tag-names": "error",
			"jsdoc/require-param": "error",
			"jsdoc/require-returns": "error",
			"typescript/array-type": ["error", { default: "array" }],
			"typescript/ban-ts-comment": ["error", { "ts-expect-error": "allow-with-description" }],
			"typescript/consistent-type-definitions": ["error", "type"],
			"typescript/explicit-function-return-type": "error",
			"typescript/explicit-member-accessibility": "error",
			"typescript/explicit-module-boundary-types": "error",
			"typescript/no-non-null-assertion": "error",
			"unicorn/max-nested-calls": "error",
			"unicorn/no-array-for-each": "error",
			"unicorn/no-array-reverse": "off",
			"unicorn/no-array-sort": "off",
			"unicorn/no-nested-ternary": "off",
			"unicorn/no-zero-fractions": "error",
			"unicorn/number-literal-case": "off",
			"unicorn/numeric-separators-style": "error",
			"unicorn/prefer-export-from": "error",
			"unicorn/prefer-spread": "error",
			"unicorn/switch-case-braces": "error",
			"eslint/max-params": ["error", { max: 4 }],
			"eslint/prefer-template": "error",
			"eslint/prefer-regex-literals": "error",
			"eslint/no-duplicate-imports": "error",
			"eslint/operator-assignment": "error",
			"eslint/arrow-body-style": "error",
			"eslint/no-multi-assign": "error",
			"eslint/prefer-spread": "error",
			"eslint/no-else-return": "error",
			"eslint/no-lonely-if": "error",
			"eslint/no-unneeded-ternary": "error",
			"eslint/no-useless-return": "error",
			"eslint/no-useless-concat": "error",
			"eslint/no-useless-computed-key": "error",
			"eslint/no-useless-rename": "error",
			"eslint/prefer-exponentiation-operator": "error",
			"eslint/prefer-numeric-literals": "error",
			"eslint/prefer-object-has-own": "error",
			"eslint/prefer-promise-reject-errors": "error",
			"eslint/require-await": "error",
			"eslint/yoda": "error",
			"eslint/eqeqeq": "error",
			"eslint/no-negated-condition": "error",
			"eslint/default-case-last": "error",
			"eslint/grouped-accessor-pairs": "error",
			"eslint/no-label-var": "error",
			"eslint/no-labels": "error",
			"eslint/no-sequences": "error",
			"eslint/no-throw-literal": "error",
			"eslint/radix": "error",
			"eslint/symbol-description": "error",
			"eslint/no-implicit-coercion": "error",
			"typescript/prefer-for-of": "error",
			"typescript/method-signature-style": "error",
			"typescript/prefer-optional-chain": "error",
			"typescript/prefer-nullish-coalescing": "error",
			"typescript/prefer-readonly": "error",
			"typescript/prefer-string-starts-ends-with": "error",
			"typescript/prefer-includes": "error",
			"typescript/prefer-regexp-exec": "error",
			"typescript/no-unnecessary-type-arguments": "error",
			"typescript/no-unnecessary-boolean-literal-compare": "error",
			"typescript/switch-exhaustiveness-check": "error",
			"typescript/no-inferrable-types": "error",
			"typescript/require-array-sort-compare": "error",
			"typescript/no-confusing-void-expression": "error",
			"typescript/no-meaningless-void-operator": "error",
			"typescript/no-redundant-type-constituents": "error",
			"typescript/no-useless-empty-export": "error",
			"typescript/prefer-reduce-type-parameter": "error",
			"typescript/no-empty-object-type": "error",
			"unicorn/prefer-negative-index": "error",
			"unicorn/consistent-existence-index-check": "error",
			"unicorn/prefer-default-parameters": "error",
			"unicorn/no-unreadable-array-destructuring": "error",
			"unicorn/prefer-string-raw": "error",
			"unicorn/consistent-date-clone": "error",
			"unicorn/no-await-expression-member": "error",
			"unicorn/no-array-reduce": "error",
			"unicorn/filename-case": ["error", { case: "kebabCase" }],
			"unicorn/catch-error-name": "error",
			"unicorn/prefer-array-flat-map": "error",
			"unicorn/prefer-array-flat": "error",
			"unicorn/prefer-array-some": "error",
			"unicorn/prefer-array-find": "error",
			"unicorn/prefer-array-index-of": "error",
			"unicorn/prefer-includes": "error",
			"unicorn/prefer-string-slice": "error",
			"unicorn/prefer-string-trim-start-end": "error",
			"unicorn/prefer-regexp-test": "error",
			"unicorn/prefer-optional-catch-binding": "error",
			"unicorn/prefer-set-has": "error",
			"unicorn/prefer-set-size": "error",
			"unicorn/prefer-logical-operator-over-ternary": "error",
			"unicorn/prefer-date-now": "error",
			"unicorn/prefer-math-min-max": "error",
			"unicorn/prefer-modern-math-apis": "error",
			"unicorn/prefer-math-trunc": "error",
			"unicorn/prefer-native-coercion-functions": "error",
			"unicorn/prefer-number-properties": "error",
			"unicorn/prefer-object-from-entries": "error",
			"unicorn/prefer-structured-clone": "error",
			"unicorn/prefer-type-error": "error",
			"unicorn/prefer-global-this": "error",
			"unicorn/prefer-node-protocol": "error",
			"unicorn/prefer-at": "error",
			"unicorn/require-array-join-separator": "error",
			"unicorn/require-number-to-fixed-digits-argument": "error",
			"unicorn/throw-new-error": "error",
			"unicorn/error-message": "error",
			"unicorn/no-instanceof-builtins": "error",
			"unicorn/no-typeof-undefined": "error",
			"unicorn/no-negation-in-equality-check": "error",
			"unicorn/no-thenable": "error",
			"unicorn/no-unnecessary-await": "error",
			"unicorn/no-useless-promise-resolve-reject": "error",
			"unicorn/no-useless-spread": "error",
			"unicorn/no-useless-fallback-in-spread": "error",
			"unicorn/no-useless-length-check": "error",
			"unicorn/no-useless-switch-case": "error",
			"unicorn/no-lonely-if": "error",
			"unicorn/no-negated-condition": "error",
			"unicorn/no-object-as-default-parameter": "error",
			"unicorn/no-static-only-class": "error",
			"unicorn/no-empty-file": "error",
			"unicorn/no-hex-escape": "error",
			"unicorn/escape-case": "error",
			"unicorn/no-new-array": "error",
			"unicorn/no-array-method-this-argument": "error",
			"unicorn/no-array-callback-reference": "error",
			"unicorn/no-length-as-slice-end": "error",
			"unicorn/no-magic-array-flat-depth": "error",
			"unicorn/no-single-promise-in-promise-methods": "error",
			"unicorn/no-await-in-promise-methods": "error",
			"unicorn/no-unreadable-iife": "error",
			"unicorn/no-anonymous-default-export": "error",
			"unicorn/no-abusive-eslint-disable": "error",
			"unicorn/explicit-length-check": "error",
			"unicorn/consistent-empty-array-spread": "error",
			"unicorn/text-encoding-identifier-case": "error",
			"unicorn/prefer-import-meta-properties": "error",
			"unicorn/prefer-prototype-methods": "error",
			"unicorn/prefer-reflect-apply": "error",
			"unicorn/no-console-spaces": "error",
			"unicorn/no-instanceof-array": "error",
			"unicorn/relative-url-style": "error",
			"promise/prefer-await-to-then": "error",
			"promise/param-names": "error",
			"promise/no-return-wrap": "error",
			"promise/no-nesting": "error",
			"promise/no-promise-in-callback": "error",
			"promise/no-callback-in-promise": "error",
			"promise/valid-params": "error",
			"promise/no-new-statics": "error",
			"promise/no-multiple-resolved": "error",
			"promise/catch-or-return": "error",
			"promise/always-return": "error",
			"promise/no-return-in-finally": "error",
			"promise/spec-only": "error",
			"node/no-exports-assign": "error",
			"node/no-new-require": "error",
			"jsdoc/require-param-description": "error",
			"jsdoc/require-returns-description": "error",
			"jsdoc/require-param-name": "error",
			"jsdoc/require-property": "error",
			"jsdoc/require-property-description": "error",
			"jsdoc/require-property-name": "error",
			"jsdoc/require-property-type": "error",
			"jsdoc/require-yields": "error",
			"jsdoc/check-access": "error",
			"jsdoc/empty-tags": "error",
			"jsdoc/implements-on-classes": "error",
			"jsdoc/no-defaults": "error",
			"jsdoc/check-property-names": "error",
			"vitest/prefer-describe-function-title": "error",
			"vitest/prefer-to-be": "error",
			"vitest/prefer-to-have-length": "error",
			"vitest/prefer-to-be-object": "error",
			"vitest/prefer-strict-equal": "error",
			"vitest/prefer-equality-matcher": "error",
			"vitest/prefer-comparison-matcher": "error",
			"vitest/prefer-called-with": "error",
			"vitest/prefer-hooks-in-order": "error",
			"vitest/prefer-hooks-on-top": "error",
			"vitest/prefer-mock-promise-shorthand": "error",
			"vitest/no-alias-methods": "error",
			"vitest/no-commented-out-tests": "error",
			"vitest/no-duplicate-hooks": "error",
			"vitest/no-identical-title": "error",
			"vitest/no-interpolation-in-snapshots": "error",
			"vitest/no-large-snapshots": "error",
			"vitest/no-mocks-import": "error",
			"vitest/no-restricted-matchers": "error",
			"vitest/no-standalone-expect": "error",
			"vitest/no-test-prefixes": "error",
			"vitest/no-test-return-statement": "error",
			"vitest/consistent-test-it": ["error", { fn: "test" }],
			"vitest/consistent-vitest-vi": "error",
			"vitest/expect-expect": "error",
			"vitest/max-nested-describe": "error",
			"vitest/require-to-throw-message": "error",
			"vitest/require-top-level-describe": "error",
			"vitest/valid-describe-callback": "error",
			"vitest/valid-expect": "error",
			"vitest/valid-expect-in-promise": "error",
			"vitest/no-focused-tests": "error",
			"import/consistent-type-specifier-style": ["error", "prefer-inline"],
			"import/first": "error",
			"import/newline-after-import": "error",
			"import/no-absolute-path": "error",
			"import/no-amd": "error",
			"import/no-commonjs": "error",
			"import/no-dynamic-require": "error",
			"import/no-empty-named-blocks": "error",
			"import/no-mutable-exports": "error",
			"import/no-named-default": "error",
			"import/no-self-import": "error",
			"import/no-webpack-loader-syntax": "error",
			"import/no-anonymous-default-export": "error",
		},
		overrides: [
			{
				files: ["src/_internals/test/**"],
				rules: {
					"typescript/consistent-type-definitions": "off",
					"vitest/no-disabled-tests": "off",
					"vitest/valid-title": "off",
					"vitest/warn-todo": "off",
				},
			},
			{
				files: ["src/index.ts", "src/index.test.ts"],
				rules: {
					"typescript/no-deprecated": "off",
				},
			},
			{
				files: ["**/*.test.ts", "src/_internals/test/**"],
				rules: {
					"@typescript-eslint/no-explicit-any": "off",
					"@typescript-eslint/no-unsafe-type-assertion": "off",
					"typescript/no-unsafe-argument": "off",
					"typescript/no-unsafe-assignment": "off",
					"typescript/no-unsafe-call": "off",
					"typescript/no-unsafe-member-access": "off",
					"typescript/no-unsafe-return": "off",
					"vitest/no-conditional-in-test": "off",
					"unicorn/new-for-builtins": "off",
					"eslint/no-new-wrappers": "off",
					"vitest/no-conditional-expect": "off",
					"eslint/max-lines-per-function": "off",
					"typescript/explicit-function-return-type": "off",
					"typescript/explicit-module-boundary-types": "off",
					"jsdoc/require-param": "off",
					"jsdoc/require-returns": "off",
				},
			},
			{
				env: {
					node: true,
				},
				files: ["scripts/**/*.ts", "vite.config.ts"],
				rules: {
					"eslint/no-console": "off",
					"import/no-default-export": "off",
				},
			},
		],
	},
	test: {
		exclude: ["**/node_modules/**", "**/dist/**", "**/.stryker-tmp/**", "**/reports/**"],
		benchmark: {
			include: ["src/**/*.test.ts"],
			exclude: ["**/node_modules/**", "**/dist/**", "**/.stryker-tmp/**", "**/reports/**"],
		},
		browser: {
			provider: webdriverio(),
			connectTimeout: 120_000,
			instances: [
				/**
				 * Edge ships without a setuid sandbox helper on the ubuntu-latest runner image, so it
				 * aborts at startup unless the SUID sandbox is disabled. Chrome and Firefox are
				 * unaffected.
				 */
				{
					browser: "edge",
					provider: webdriverio({ capabilities: { "ms:edgeOptions": { args: ["--no-sandbox"] } } }),
				},
				{ browser: "chrome" },
				{ browser: "safari" },
				{ browser: "firefox" },
			],
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/*.test.ts",
				"src/_internals/test/**",
				"src/**/constants.ts",
				"src/_internals/constants/**",
				"src/index.ts",
			],
			thresholds: {
				statements: 100,
				branches: 100,
				functions: 100,
				lines: 100,
			},
		},
	},
	pack: [
		{
			...sharedPack,
			entry: { "brazilian-utils": resolve(rootDir, "src/index.ts") },
			format: ["es", "umd"],
			globalName: "BrazilianUtils",
			plugins: [minifyUmdChunk(), emitCjsDtsTwin()],
		},
		{
			...sharedPack,
			sourcemap: false,
			entry: utilEntries,
			format: ["es", "cjs"],
		},
	],
});
