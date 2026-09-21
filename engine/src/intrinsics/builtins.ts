/**
 * Record and error types the engine itself defines, available to every project without being
 * declared in source. They are the contract of the capability intrinsics.
 */

import type { SemType } from "../types.ts";
import { tInt, tList, tRecord, tString } from "../types.ts";

export type RecordDef = {
	readonly name: string;
	readonly fields: readonly { readonly name: string; readonly type: SemType; readonly optional: boolean }[];
	readonly doc: string;
};

function field(name: string, type: SemType, optional = false) {
	return { name, type, optional };
}

export const BUILTIN_RECORDS: readonly RecordDef[] = [
	{
		name: "HttpHeader",
		doc: "One request or response header. Headers are an ordered list, never a map, so every target preserves order and duplicates.",
		fields: [field("name", tString("ascii")), field("value", tString())],
	},
	{
		name: "HttpRequest",
		doc: "A request handed to the Http capability. The host adds no retries and no hidden headers.",
		fields: [
			field("method", tString("ascii", 3, 7)),
			field("url", tString()),
			field("headers", tList(tRecord("HttpHeader"))),
			field("body", tString()),
			field("timeoutMillis", tInt(0n, 600_000n)),
		],
	},
	{
		name: "HttpResponse",
		doc: "A response from the Http capability. A status of 400 or more is a value, not a failure.",
		fields: [
			field("status", tInt(0n, 599n)),
			field("headers", tList(tRecord("HttpHeader"))),
			field("body", tString()),
		],
	},
];

/** Domain errors the engine raises itself. Projects may catch them only by declaring them. */
export const BUILTIN_ERRORS: readonly string[] = ["HttpError"];

export function builtinRecord(name: string): RecordDef | undefined {
	return BUILTIN_RECORDS.find((record) => record.name === name);
}
