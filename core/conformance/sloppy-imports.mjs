/**
 * Lets Node import the published package's own sources, which use extensionless specifiers
 * (the repository builds with a bundler). The conformance harness compares the engine against
 * that source, so it has to load it exactly as written.
 */
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
			const parent = context.parentURL === undefined ? process.cwd() : dirname(fileURLToPath(context.parentURL));
			for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
				const full = resolvePath(parent, candidate);
				if (existsSync(full)) return { url: pathToFileURL(full).href, shortCircuit: true };
			}
		}
		return nextResolve(specifier, context);
	},
});
