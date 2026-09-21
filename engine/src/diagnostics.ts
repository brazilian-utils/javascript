/**
 * Span-aware diagnostics shared by every compiler stage.
 *
 * A diagnostic always names a stable code (`E_...`), so tests assert on the code rather than on
 * the message text, and carries a span so the CLI can print the offending source line.
 */

export type Span = {
	readonly file: string;
	readonly start: number;
	readonly end: number;
};

export const NO_SPAN: Span = { file: "<engine>", start: 0, end: 0 };

export type Severity = "error" | "warning";

export type Diagnostic = {
	readonly severity: Severity;
	readonly code: string;
	readonly message: string;
	readonly span: Span;
	/** What the author should write instead, when the compiler can tell. */
	readonly suggestion?: string;
};

/** A compilation failure carrying every diagnostic collected before the stage gave up. */
export class CompileError extends Error {
	readonly diagnostics: readonly Diagnostic[];

	constructor(diagnostics: readonly Diagnostic[]) {
		super(diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n"));
		this.name = "CompileError";
		this.diagnostics = diagnostics;
	}
}

export function error(
	code: string,
	message: string,
	span: Span,
	suggestion?: string,
): Diagnostic {
	return { severity: "error", code, message, span, suggestion };
}

/** Collects diagnostics for one compilation and fails the stage on demand. */
export class Diagnostics {
	private readonly items: Diagnostic[] = [];

	add(diagnostic: Diagnostic): void {
		this.items.push(diagnostic);
	}

	error(code: string, message: string, span: Span, suggestion?: string): void {
		this.add(error(code, message, span, suggestion));
	}

	get all(): readonly Diagnostic[] {
		return this.items;
	}

	get hasErrors(): boolean {
		return this.items.some((item) => item.severity === "error");
	}

	throwIfErrors(): void {
		if (this.hasErrors) throw new CompileError([...this.items]);
	}
}

/** Renders a diagnostic with its source line and a caret, for the CLI. */
export function renderDiagnostic(diagnostic: Diagnostic, source?: string): string {
	const head = `${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`;
	if (source === undefined) return `${head}\n  at ${diagnostic.span.file}`;

	const before = source.slice(0, diagnostic.span.start);
	const line = before.split("\n").length;
	const column = diagnostic.span.start - (before.lastIndexOf("\n") + 1);
	const text = source.split("\n")[line - 1] ?? "";
	const caret = `${" ".repeat(column)}${"^".repeat(Math.max(1, Math.min(diagnostic.span.end - diagnostic.span.start, text.length - column)))}`;
	const suggestion = diagnostic.suggestion === undefined ? "" : `\n  help: ${diagnostic.suggestion}`;

	return `${head}\n  at ${diagnostic.span.file}:${line}:${column + 1}\n  ${text}\n  ${caret}${suggestion}`;
}
