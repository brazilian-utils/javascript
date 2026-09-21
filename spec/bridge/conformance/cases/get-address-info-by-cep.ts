/**
 * What `getAddressInfoByCep` is replayed with, and the mock the other targets talk to.
 *
 * One table drives both sides. Recording stubs `fetch`, exactly as the JavaScript suite does;
 * replaying serves the same scenarios over real HTTP, so the generated Go, Rust, Ruby, Java,
 * C# and Python each run through their own client against something a real client can talk to.
 *
 * A scenario is keyed by the CEP, so no target needs to be told which one it is in: the CEP in
 * the URL is the whole protocol.
 */
import { createServer } from "node:http";

import { type Recorder } from "../cases.ts";

/** What one provider answers in one scenario. `fail` is a transport failure, not an answer. */
type Answer = { status: number; body: unknown } | { fail: true };

type Scenario = { viacep: Answer; widenet: Answer; brasilapi: Answer };

const address = (cep: string): Record<string, unknown> => ({
	bairro: "Bela Vista",
	cep,
	localidade: "São Paulo",
	logradouro: "Avenida Paulista",
	uf: "SP",
});

const widenetAddress = (cep: string): Record<string, unknown> => ({
	address: "Avenida Paulista",
	city: "São Paulo",
	code: cep,
	district: "Bela Vista",
	ok: true,
	state: "SP",
	status: 200,
});

const brasilApiAddress = (cep: string): Record<string, unknown> => ({
	cep,
	city: "São Paulo",
	neighborhood: "Bela Vista",
	state: "SP",
	street: "Avenida Paulista",
});

const NOT_FOUND_BODY = { errors: [{ message: "CEP não encontrado" }] };

/**
 * The scenarios, by CEP. Every provider that succeeds in a scenario answers the same address,
 * so which one wins the race cannot change the expected result.
 */
const SCENARIOS: Record<string, Scenario> = {
	// Every provider answers.
	"01310100": {
		viacep: { status: 200, body: address("01310-100") },
		widenet: { status: 200, body: widenetAddress("01310-100") },
		brasilapi: { status: 200, body: brasilApiAddress("01310100") },
	},
	// Every provider reports a miss, each in its own way.
	"00000000": {
		viacep: { status: 200, body: { erro: true } },
		widenet: { status: 200, body: { ok: false, status: 404 } },
		brasilapi: { status: 200, body: NOT_FOUND_BODY },
	},
	// Every provider answers an HTTP error.
	"00000001": {
		viacep: { status: 500, body: {} },
		widenet: { status: 503, body: {} },
		brasilapi: { status: 500, body: {} },
	},
	// Nothing reaches any server.
	"00000002": { viacep: { fail: true }, widenet: { fail: true }, brasilapi: { fail: true } },
	// Only BrasilAPI answers, and it is the one the caller gets.
	"00000003": {
		viacep: { fail: true },
		widenet: { status: 503, body: {} },
		brasilapi: { status: 200, body: brasilApiAddress("00000003") },
	},
	// BrasilAPI reports the miss with a status, the others are simply down: not found wins.
	"00000004": {
		viacep: { status: 500, body: {} },
		widenet: { status: 503, body: {} },
		brasilapi: { status: 404, body: NOT_FOUND_BODY },
	},
	// A body that is not an object at all.
	"00000005": {
		viacep: { status: 200, body: "oops" },
		widenet: { status: 200, body: 42 },
		brasilapi: { status: 200, body: null },
	},
	// The optional fields are missing.
	"00000006": {
		viacep: { status: 200, body: { cep: "00000006" } },
		widenet: { status: 200, body: { code: "00000006", ok: true, status: 200 } },
		brasilapi: { status: 200, body: { cep: "00000006" } },
	},
	// ViaCEP answers fields that are not strings.
	"00000007": {
		viacep: { status: 200, body: { ...address("00000007"), localidade: null, uf: 12 } },
		widenet: { status: 503, body: {} },
		brasilapi: { status: 500, body: {} },
	},
	// The CEP comes back masked and has to be stripped.
	"00000008": {
		viacep: { status: 200, body: address("00000-008") },
		widenet: { status: 200, body: widenetAddress("00000-008") },
		brasilapi: { status: 200, body: brasilApiAddress("00000-008") },
	},
	// An empty CEP in the body is a miss, whatever else the body holds.
	"00000009": {
		viacep: { status: 200, body: { ...address(""), cep: "" } },
		widenet: { status: 200, body: { ...widenetAddress(""), code: "" } },
		brasilapi: { status: 200, body: { ...brasilApiAddress(""), cep: "" } },
	},
	// Widenet's own flags disagree with its body.
	"00000010": {
		viacep: { status: 500, body: {} },
		widenet: { status: 200, body: { code: "00000010", ok: false, status: 200 } },
		brasilapi: { status: 500, body: {} },
	},
	"00000011": {
		viacep: { status: 500, body: {} },
		widenet: { status: 200, body: { code: "00000011", ok: true, status: 404 } },
		brasilapi: { status: 500, body: {} },
	},
	// A miss reported alongside a CEP is still a miss.
	"00000012": {
		viacep: { status: 200, body: { cep: "00000-012", erro: true } },
		widenet: { status: 503, body: {} },
		brasilapi: { status: 200, body: { ...brasilApiAddress("00000012"), ...NOT_FOUND_BODY } },
	},
	// One provider misses and the other is down: the miss is what the caller hears about.
	"00000013": {
		viacep: { status: 200, body: { erro: true } },
		widenet: { fail: true },
		brasilapi: { fail: true },
	},
};

/** The provider lists worth trying against every scenario. */
const EVERY_PROVIDER: (string[] | undefined)[] = [
	undefined,
	["viacep"],
	["widenet"],
	["brasilapi"],
	["viacep", "brasilapi"],
	["viacep", "widenet", "brasilapi"],
];

/** The answer a provider gives for a CEP, or a 404 when the scenario does not know it. */
const answerFor = (provider: keyof Scenario, cep: string): Answer => {
	const scenario = SCENARIOS[cep];

	if (scenario === undefined) return { status: 404, body: NOT_FOUND_BODY };

	return scenario[provider];
};

/** Which provider a URL belongs to. */
const providerOf = (path: string): keyof Scenario | undefined => {
	if (path.includes("viacep.com.br")) return "viacep";
	if (path.includes("widenet.com.br")) return "widenet";
	if (path.includes("brasilapi.com.br")) return "brasilapi";

	return undefined;
};

/** The CEP a URL asks about. */
const cepOf = (path: string): string => path.replaceAll(/\D/g, "").slice(-8);

/** The answer for a URL, whichever side is asking. */
const answerForUrl = (url: string): Answer => {
	const provider = providerOf(url);

	return provider === undefined ? { status: 404, body: {} } : answerFor(provider, cepOf(url));
};

export const recorder: Recorder = {
	module: "get-address-info-by-cep",

	inputs: () => {
		const found: unknown[][] = [];

		for (const cep of Object.keys(SCENARIOS))
			for (const providers of EVERY_PROVIDER)
				found.push(providers === undefined ? [cep] : [cep, { providers }]);

		// The inputs that never reach a provider.
		for (const cep of ["12345", "123456789", "", "1310100", "abc", "0131010a"]) found.push([cep]);

		// A mask is stripped, and a number is padded; both land on the first scenario.
		found.push(
			["01310-100"],
			["01.310-100"],
			[1_310_100],
			[1_310_100, { providers: ["brasilapi"] }],
		);

		// Provider lists that name nothing usable.
		for (const providers of [[], ["invalid"], ["constructor", "toString"], ["VIACEP"]])
			found.push(["01310100", { providers }]);

		// An unknown name among known ones is dropped rather than fatal.
		found.push(["01310100", { providers: ["viacep", "invalid", "brasilapi"] }]);

		// What an untyped JavaScript caller can still pass where a list of names is declared.
		for (const providers of [null, "viacep", 5, {}, true]) found.push(["01310100", { providers }]);

		return found;
	},

	call: async (shipped, fn, args) => {
		const realFetch = globalThis.fetch;

		globalThis.fetch = ((input: unknown): Promise<unknown> => {
			const answer = answerForUrl(String(input));

			if ("fail" in answer) {
				// The shipped `fetchWithRetry` retries a transient transport failure, so the stub
				// reports one the same way the mock server does, by closing the socket.
				const error = new Error("fetch failed");

				(error as { cause?: unknown }).cause = { code: "ECONNRESET" };

				return Promise.reject(error);
			}

			return Promise.resolve({
				ok: answer.status >= 200 && answer.status < 300,
				status: answer.status,
				json: () => Promise.resolve(answer.body),
			});
		}) as typeof fetch;

		try {
			const answered = shipped[fn](...args);

			return await answered;
		} finally {
			globalThis.fetch = realFetch;
		}
	},

	serve: async (port) => {
		const server = createServer((request, response) => {
			const answer = answerForUrl(request.url ?? "");

			if ("fail" in answer) {
				request.socket.destroy();

				return;
			}

			response.writeHead(answer.status, { "content-type": "application/json; charset=utf-8" });
			response.end(JSON.stringify(answer.body));
		});

		await new Promise<void>((resolve) => {
			server.listen(port, "127.0.0.1", resolve);
		});

		return () => {
			server.close();
		};
	},
};
