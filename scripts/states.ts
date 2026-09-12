#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { fetchWithRetry } from "../src/_internals/fetch-with-retry/fetch-with-retry.ts";

const scriptsDir = import.meta.dirname;

type State = {
	id: number;
	sigla: string;
	nome: string;
	regiao: {
		id: number;
		sigla: string;
		nome: string;
	};
};

const isState = (value: unknown): value is State =>
	typeof value === "object" &&
	value !== null &&
	"id" in value &&
	typeof value.id === "number" &&
	"sigla" in value &&
	typeof value.sigla === "string" &&
	"nome" in value &&
	typeof value.nome === "string" &&
	"regiao" in value &&
	typeof value.regiao === "object" &&
	value.regiao !== null &&
	"sigla" in value.regiao &&
	typeof value.regiao.sigla === "string" &&
	"nome" in value.regiao &&
	typeof value.regiao.nome === "string";

const union = (values: string[]): string =>
	values.map((value) => `| ${JSON.stringify(value)}`).join(" ");

const main = async (): Promise<void> => {
	const response = await fetchWithRetry(
		"https://servicodados.ibge.gov.br/api/v1/localidades/estados",
	);

	if (!response.ok) {
		throw new Error(`IBGE states request failed with status ${response.status}`);
	}

	const json: unknown = await response.json();

	if (!Array.isArray(json) || json.length === 0 || !json.every((entry) => isState(entry))) {
		throw new Error(
			"IBGE states payload is not an array of states with id, sigla, nome and regiao",
		);
	}

	const states = json
		.sort((stateA, stateB) => stateA.nome.localeCompare(stateB.nome, "pt-BR"))
		.map((state) => ({
			code: state.sigla,
			name: state.nome,
			regionCode: state.regiao.sigla,
			regionName: state.regiao.nome,
			ibgeCode: state.id,
		}));

	await writeFile(
		resolve(scriptsDir, "..", "./src/_internals/constants/states.ts"),
		`/** The two letter code of each Brazilian state, as published by the IBGE. */
export type StateCode = ${union(states.map((state) => state.code))};

/** The name of each Brazilian state, as published by the IBGE. */
export type StateName = ${union(states.map((state) => state.name))};

/** One Brazilian state, as returned by \`getStates\`, \`getStateByIbgeCode\` and the other state utils. */
export type State = {
	/** The two letter code of the state, e.g. \`"SP"\`. */
	readonly code: StateCode;
	/** The full name of the state, e.g. \`"São Paulo"\`. */
	readonly name: StateName;
	/** The code of the region the state belongs to, e.g. \`"SE"\`. */
	readonly regionCode: "N" | "NE" | "CO" | "SE" | "S";
	/** The full name of the region the state belongs to, e.g. \`"Sudeste"\`. */
	readonly regionName: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";
	/** The 2 digit IBGE code of the Federative Unit ("cUF"), e.g. \`35\`. */
	readonly ibgeCode: number;
};

/**
 * Brazilian states published by the IBGE, sorted by name with \`localeCompare\` in the "pt-BR"
 * locale. \`ibgeCode\` is the 2-digit IBGE code of the Federative Unit ("cUF"), the same code
 * found in the first field of every DF-e access key (chave de acesso).
 *
 * @see https://servicodados.ibge.gov.br/api/docs/localidades
 */
export const DATA: readonly State[] = ${JSON.stringify(states)};`,
	);
};

await main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
