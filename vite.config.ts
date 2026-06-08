import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dts from "vite-plugin-dts";
import { defineConfig } from "vite-plus";
import { webdriverio } from "vite-plus/test/browser-webdriverio";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	fmt: {
		ignorePatterns: ["dist", "coverage", "docs"],
		singleQuote: false,
		sortImports: true,
		useTabs: true,
	},
	lint: {
		categories: {
			correctness: "error",
			suspicious: "error",
		},
		ignorePatterns: ["dist", "coverage", "docs"],
		rules: {
			"unicorn/no-array-reverse": "off",
			"unicorn/no-array-sort": "off",
		},
		overrides: [
			{
				files: ["**/*.test.ts", "**/*.spec.ts"],
				plugins: ["oxc", "typescript", "unicorn", "vitest"],
				rules: {
					"@typescript-eslint/no-explicit-any": "off",
				},
			},
			{
				env: {
					node: true,
				},
				files: ["scripts/**/*.ts", "vite.config.ts"],
			},
		],
	},
	test: {
		browser: {
			provider: webdriverio(),
			instances: [
				{ browser: "edge" },
				{ browser: "chrome" },
				{ browser: "safari" },
				{ browser: "firefox" },
			],
		},
	},
	plugins: [
		dts({
			insertTypesEntry: true,
			rollupTypes: true,
		}),
	],
	build: {
		lib: {
			entry: resolve(rootDir, "src/index.ts"),
			name: "BrazilianUtils",
			fileName: "brazilian-utils",
		},
		outDir: "dist",
		sourcemap: true,
		rollupOptions: {
			output: {
				preserveModules: false,
				exports: "named",
			},
			treeshake: {
				moduleSideEffects: false,
				propertyReadSideEffects: false,
			},
		},
	},
});
