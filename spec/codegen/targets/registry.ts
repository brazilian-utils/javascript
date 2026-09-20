/** The language targets the specs can be emitted to, by id. */
import { type Plan } from "../plan.ts";
import { emit as emitGo } from "./go.ts";
import { emit as emitJava } from "./java.ts";
import { emit as emitPython } from "./python.ts";
import { emit as emitRuby } from "./ruby.ts";
import { emit as emitRust } from "./rust.ts";
import { emit as emitTypeScript } from "./typescript.ts";

/** Maps a path relative to the target's output directory to the file's contents. */
export type Emitter = (plan: Plan) => Record<string, string>;

export const emitters: Record<string, Emitter> = {
	typescript: emitTypeScript,
	python: emitPython,
	go: emitGo,
	ruby: emitRuby,
	rust: emitRust,
	java: emitJava,
};
