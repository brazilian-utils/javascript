/**
 * The engine's public API. A host (the CLI, a test, another build tool) hands it a project and
 * gets the annotated Core plus whatever targets were asked for.
 */

import { Diagnostics } from "./diagnostics.ts";
import { checkProgram } from "./core/check.ts";
import type { CheckMetrics } from "./core/check.ts";
import type { CProgram } from "./core/ir.ts";
import { threadCapabilities } from "./analysis/capabilities.ts";
import { optimize } from "./optimize/optimize.ts";
import { link } from "./link/link.ts";
import { loadModules } from "./project.ts";
import type { ProjectConfig } from "./project.ts";
import type { HModule } from "./hir/ast.ts";

export type CompileOptions = {
	/** Skip the optimizer, so the Core dump matches the source one to one. */
	readonly noOptimize?: boolean;
};

export type Compilation = {
	readonly modules: readonly HModule[];
	readonly program: CProgram;
	readonly metrics: CheckMetrics;
	readonly diagnostics: Diagnostics;
};

/** Parses, checks and analyses a project, stopping before any target is generated. */
export function compileProject(
	sourceRoot: string,
	options: CompileOptions = {},
): Compilation {
	const diagnostics = new Diagnostics();
	const modules = loadModules(sourceRoot, diagnostics);
	diagnostics.throwIfErrors();
	const { program, metrics } = checkProgram(modules, diagnostics);
	diagnostics.throwIfErrors();
	const threaded = threadCapabilities(program);
	const optimized = options.noOptimize === true ? threaded : optimize(threaded);
	return { modules, program: link(optimized), metrics, diagnostics };
}

export type { ProjectConfig };
export { loadConfig } from "./project.ts";
export { dumpProgram } from "./core/ir.ts";
export { dumpHir } from "./hir/ast.ts";
export { renderDiagnostic, CompileError } from "./diagnostics.ts";
