/**
 * The standard library's public surface.
 *
 * These functions are checked against their declared signature and are always available to a
 * portable lowering, whether or not any project source names them. Everything else under
 * `stdlib/` is an internal helper, specialized per call site like any other library code.
 *
 * The list is target-agnostic on purpose: nothing before the backends may branch on a target, so
 * the compiler keeps the whole surface rather than asking which lowerings a target selected.
 */
export const STDLIB_SURFACE: readonly string[] = [
	"std/strings::compareScalars",
	"std/strings::asciiUpperAll",
	"std/strings::asciiLowerAll",
	"std/date::ymdToDays",
	"std/date::yearFromDays",
	"std/date::monthFromDays",
	"std/date::dayFromDays",
];
