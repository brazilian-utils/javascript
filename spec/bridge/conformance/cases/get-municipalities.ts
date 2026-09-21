/**
 * What `getMunicipalities` is replayed with: every state, and the keys that are not one.
 *
 * The whole list comes back per key rather than a sample, so one municipality out of order in
 * one of the seven targets fails the check. That is the point of this utility being here: the
 * order is pt-BR collation, and no two targets ship the same collator.
 */
import { type Recorder } from "../cases.ts";

/**
 * The keys to ask for. Omitting the state code is the only way to ask for the combined list;
 * every other value, an unknown state and an inherited `Object` property name included, has an
 * answer of its own.
 */
const KEYS = [
	"AC",
	"AL",
	"AP",
	"AM",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MT",
	"MS",
	"MG",
	"PA",
	"PB",
	"PR",
	"PE",
	"PI",
	"RJ",
	"RN",
	"RS",
	"RO",
	"RR",
	"SC",
	"SP",
	"SE",
	"TO",
	"ZZ",
	"sp",
	"",
	"toString",
	"constructor",
	"hasOwnProperty",
];

export const recorder: Recorder = {
	module: "get-municipalities",
	inputs: () => [[], ...KEYS.map((key) => [key])],
};
