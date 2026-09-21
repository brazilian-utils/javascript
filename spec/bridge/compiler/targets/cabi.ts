/**
 * The C ABI surface, emitted alongside the Rust target.
 *
 * This is the piece the binding route needs: one shared core, compiled once per platform, that
 * Python, Ruby, C#, Java and Erlang call with a hand-written binding of their own. The
 * benchmark in `spec/bench` measures that boundary at 1 ns in C#, 27 ns in Python and about
 * 60 ns elsewhere, against a validator body of 47 ns, so the surface is deliberately as narrow
 * as a C caller can ask for: pointers, lengths and integers, nothing owned, nothing allocated.
 *
 * The shapes it covers, which is what the CNPJ utilities need:
 *
 *   bool f(string, options?)   ->  int32 f(const uint8_t *, size_t, <flattened options>)
 *   string f(string, options?) ->  intptr f(const uint8_t *, size_t, <options>, uint8_t *, size_t)
 *
 * An option field becomes one scalar parameter carrying the same "unset" sentinel the emitters
 * already use: -1 for a number, 0 for a flag. A string result is written into a caller owned
 * buffer and its length returned, so the caller frees nothing and the two sides share no
 * allocator. Anything else — a list, a record, a function that raises — is refused rather than
 * guessed at; those need a richer surface than this POC has.
 */
import { type Expr, type FuncDecl, type Module, type Ty } from "../ir.ts";
import { optionReads, snake } from "../kit.ts";

/** One parameter of the C entry point. */
type Slot = { name: string; c: string; rust: string };

/** Whether a type can cross a C boundary as a scalar. */
const isScalar = (ty: Ty): boolean =>
	ty.k === "int" || ty.k === "bool" || ty.k === "string" || ty.k === "scalar" || ty.k === "enum";

/** The C type of a scalar option field. */
const scalarC = (ty: Ty): string => (ty.k === "bool" ? "int32_t" : "int64_t");

/** The Rust type of a scalar option field. */
const scalarRust = (ty: Ty): string => (ty.k === "bool" ? "i32" : "i64");

/**
 * The entry point name a C caller sees: `cnpj_is_valid_cnpj`, module prefixed so two utilities
 * can live in one library without colliding.
 */
const symbol = (module: Module, entry: FuncDecl): string =>
	`${snake(module.name)}_${snake(entry.name)}`;

/**
 * Whether a function can be exposed, and why not when it cannot.
 *
 * @param {FuncDecl} entry - The function.
 * @returns {string} The reason it cannot, or an empty string when it can.
 */
const refuse = (entry: FuncDecl): string => {
	if (entry.throws) return "it can raise, which needs an out parameter for the error";
	if (entry.blocking) return "it waits on the network, which needs a callback or a poll";
	if (entry.ret.k !== "bool" && entry.ret.k !== "string") return `it answers a ${entry.ret.k}`;

	for (const param of entry.params) {
		if (param.ty.k === "named") continue;
		if (!isScalar(param.ty)) return `its \`${param.name}\` parameter is a ${param.ty.k}`;
	}

	return "";
};

/** The C and Rust parameter lists of one entry point, before the string result slots. */
const slots = (entry: FuncDecl): Slot[] => {
	const found: Slot[] = [];

	for (const param of entry.params) {
		if (param.ty.k === "named") continue;

		if (param.ty.k === "int" || param.ty.k === "bool") {
			found.push({ name: snake(param.name), c: scalarC(param.ty), rust: scalarRust(param.ty) });

			continue;
		}

		found.push(
			{ name: `${snake(param.name)}_ptr`, c: "const uint8_t *", rust: "*const u8" },
			{ name: `${snake(param.name)}_len`, c: "size_t", rust: "usize" },
		);
	}

	// Every option field becomes one scalar, carrying the sentinel the body already compares to.
	for (const read of optionReads(entry)) {
		const ty = read.expr.k === "optionField" ? read.expr.ty : ({ k: "int" } as Ty);

		found.push({ name: snake(read.local), c: scalarC(ty), rust: scalarRust(ty) });
	}

	return found;
};

/** How the body rebuilds the options record from the flattened scalars. */
const rebuild = (entry: FuncDecl, module: string): string => {
	const reads = optionReads(entry);

	if (reads.length === 0) return "";

	const record = entry.params.find((param) => param.ty.k === "named");

	if (record?.ty.k !== "named") return "";

	const fields = reads
		.map((read) => {
			const ty = read.expr.k === "optionField" ? read.expr.ty : ({ k: "int" } as Ty);
			const fallback = read.expr.k === "optionField" ? read.expr.fallback : ({ k: "none" } as Expr);
			const unset =
				ty.k === "bool"
					? `${snake(read.local)} == 0`
					: `${snake(read.local)} == ${(fallback as Extract<Expr, { k: "int" }>).value ?? -1}`;
			const value = ty.k === "bool" ? `${snake(read.local)} != 0` : snake(read.local);

			return `\t\t${snake(read.field)}: if ${unset} { None } else { Some(${value}) },`;
		})
		.join("\n");

	return `\tlet options = ${snake(module)}::${record.ty.name} {\n${fields}\n\t\t..Default::default()\n\t};\n`;
};

/** The call into the generated function, with the arguments it expects. */
const invoke = (module: Module, entry: FuncDecl): string => {
	const args = entry.params.map((param) => {
		if (param.ty.k === "named") return "Some(&options)";
		if (param.ty.k === "int" || param.ty.k === "bool") return snake(param.name);

		return `${snake(param.name)}_value`;
	});

	return `${snake(module.name)}::${snake(entry.name)}(${args.join(", ")})`;
};

/** Reads every string parameter out of its pointer and length, refusing invalid UTF-8. */
const decode = (entry: FuncDecl, onBad: string): string =>
	entry.params
		.filter((param) => param.ty.k !== "named" && param.ty.k !== "int" && param.ty.k !== "bool")
		.map(
			(param) =>
				`\tlet ${snake(param.name)}_value = match std::str::from_utf8(unsafe {\n\t\tstd::slice::from_raw_parts(${snake(param.name)}_ptr, ${snake(param.name)}_len)\n\t}) {\n\t\tOk(value) => value,\n\t\tErr(_) => return ${onBad},\n\t};\n`,
		)
		.join("");

/** Renders one entry point. */
const entryPoint = (module: Module, entry: FuncDecl): string => {
	const name = symbol(module, entry);
	const parameters = slots(entry);
	const returnsText = entry.ret.k === "string";
	const rustParams = parameters.map((slot) => `${slot.name}: ${slot.rust}`);

	if (returnsText) rustParams.push("out: *mut u8", "out_len: usize");

	const signature = `#[no_mangle]\npub unsafe extern "C" fn ${name}(${rustParams.join(", ")}) -> ${returnsText ? "isize" : "i32"} {`;
	const body = returnsText
		? `${decode(entry, "-1")}${rebuild(entry, module.name)}\tlet answer = ${invoke(module, entry)};
	let bytes = answer.as_bytes();

	if out.is_null() || out_len < bytes.len() {
		// The caller sizes its own buffer: answering the length lets it try again.
		return bytes.len() as isize;
	}

	unsafe { std::ptr::copy_nonoverlapping(bytes.as_ptr(), out, bytes.len()) };

	bytes.len() as isize
}`
		: `${decode(entry, "0")}${rebuild(entry, module.name)}\ti32::from(${invoke(module, entry)})
}`;

	return `/// ${entry.doc.split("\n")[0]}\n${signature}\n${body}`;
};

/** Renders the C header a binding author reads. */
const header = (module: Module, exposed: FuncDecl[]): string => {
	const declarations = exposed
		.map((entry) => {
			const parameters = slots(entry).map((slot) => `${slot.c} ${slot.name}`);

			if (entry.ret.k === "string") parameters.push("uint8_t *out", "size_t out_len");

			return `/* ${entry.doc.split("\n")[0]} */\n${entry.ret.k === "string" ? "intptr_t" : "int32_t"} ${symbol(module, entry)}(${parameters.join(", ")});`;
		})
		.join("\n\n");

	return `/* Code generated from spec/bridge/source/${module.name}.ts. DO NOT EDIT.
 *
 * The C surface of the shared core. A binding hands in pointers, lengths and integers; it owns
 * every buffer, and the core allocates nothing on its behalf.
 *
 * An option that was not given is passed as its "unset" sentinel: -1 for a number, 0 for a flag.
 * A function that answers text writes into \`out\` and returns the byte length; when the buffer
 * is too small nothing is written and the length needed is returned, so the caller can size it
 * and call again.
 */
#ifndef BRAZILIAN_UTILS_${module.name.toUpperCase()}_H
#define BRAZILIAN_UTILS_${module.name.toUpperCase()}_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

${declarations}

#ifdef __cplusplus
}
#endif

#endif
`;
};

/**
 * Emits the C ABI of one module: a Rust source file and the header that describes it.
 *
 * @param {Module} module - The compiled module.
 * @returns {Record<string, string>} The files, by path, empty when nothing can be exposed.
 */
export const emit = (module: Module): Record<string, string> => {
	const exposed: FuncDecl[] = [];
	const skipped: string[] = [];

	for (const entry of module.functions) {
		if (!entry.exported) continue;

		const reason = refuse(entry);

		if (reason === "") exposed.push(entry);
		else skipped.push(`//   ${entry.name}: ${reason}`);
	}

	if (exposed.length === 0) return {};

	const notes =
		skipped.length === 0
			? ""
			: `//\n// Not exposed, because the shapes below need more than pointers and integers:\n${skipped.join("\n")}\n`;

	return {
		[`src/cabi_${module.name}.rs`]: `// Code generated from spec/bridge/source/${module.name}.ts. DO NOT EDIT.
//
// The C ABI of this module: what a hand-written binding in Python, Ruby, C#, Java or Erlang
// calls. Everything is a pointer, a length or an integer, and nothing crosses that either side
// has to free.
${notes}
use crate::${snake(module.name)};

${exposed.map((entry) => entryPoint(module, entry)).join("\n\n")}
`,
		[`include/${module.name}.h`]: header(module, exposed),
	};
};
