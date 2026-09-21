/**
 * The CEP scenarios, the expectations recorded from the package this repository ships, and the
 * mock server the other six targets are pointed at.
 *
 * One table drives both sides: `node conformance/cep.ts record` replays the scenarios against
 * the shipped package with `fetch` mocked, exactly as the JavaScript suite does, and
 * `node conformance/cep.ts serve <port>` answers the same scenarios over real HTTP so the
 * generated Go, Rust, Ruby, Java, C# and Python run against something a real client can talk to.
 *
 * A scenario is keyed by the CEP, so no target needs to be told which one it is in: the CEP in
 * the URL is the whole protocol.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { build } from "esbuild";

const bridge = resolve(import.meta.dirname, "..");
const root = resolve(bridge, "../..");

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
export const SCENARIOS: Record<string, Scenario> = {
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

/** The provider sets a case can ask for. `-` is "the caller named none". */
type Providers = string;

type Case = { cep: string; kind: "string" | "number"; providers: Providers };

const EVERY_PROVIDER = [
	"-",
	"viacep",
	"widenet",
	"brasilapi",
	"viacep|brasilapi",
	"viacep|widenet|brasilapi",
];

const cases: Case[] = [];

for (const cep of Object.keys(SCENARIOS)) {
	for (const providers of EVERY_PROVIDER) cases.push({ cep, kind: "string", providers });
}

// The inputs that never reach a provider.
for (const cep of ["12345", "123456789", "", "1310100", "abc", "0131010a"])
	cases.push({ cep, kind: "string", providers: "-" });

// A mask is stripped, and a number is padded; both land on the first scenario.
cases.push(
	{ cep: "01310-100", kind: "string", providers: "-" },
	{ cep: "01.310-100", kind: "string", providers: "-" },
	{ cep: "1310100", kind: "number", providers: "-" },
	{ cep: "1310100", kind: "number", providers: "brasilapi" },
);

// Provider lists that name nothing usable.
for (const providers of ["[]", "invalid", "constructor|toString", "VIACEP"])
	cases.push({ cep: "01310100", kind: "string", providers });

// An unknown name among known ones is dropped rather than fatal.
cases.push({ cep: "01310100", kind: "string", providers: "viacep|invalid|brasilapi" });

/** The values a `providers` option can take that are not a list at all. */
export const NOT_A_LIST: Record<string, unknown> = {
	"!null": null,
	"!string": "viacep",
	"!number": 5,
	"!object": {},
	"!bool": true,
};

for (const providers of Object.keys(NOT_A_LIST))
	cases.push({ cep: "01310100", kind: "string", providers });

/** Reads a `providers` cell back into the value the call takes. */
const optionsOf = (providers: Providers): Record<string, unknown> | undefined => {
	if (providers === "-") return undefined;
	if (providers === "[]") return { providers: [] };
	if (providers.startsWith("!")) return { providers: NOT_A_LIST[providers] };

	return { providers: providers.split("|") };
};

/** The answer a provider gives for a CEP, or a 404 when the scenario does not know it. */
export const answerFor = (provider: keyof Scenario, cep: string): Answer => {
	const scenario = SCENARIOS[cep];

	if (scenario === undefined) return { status: 404, body: NOT_FOUND_BODY };

	return scenario[provider];
};

/** Which provider a mock server path belongs to. */
export const providerOf = (path: string): keyof Scenario | undefined => {
	if (path.includes("viacep.com.br")) return "viacep";
	if (path.includes("widenet.com.br")) return "widenet";
	if (path.includes("brasilapi.com.br")) return "brasilapi";

	return undefined;
};

/** The CEP a mock server path asks about. */
export const cepOf = (path: string): string => {
	const digits = path.replaceAll(/\D/g, "");

	return digits.slice(-8);
};

const serve = (port: number): void => {
	const server = createServer((request, response) => {
		const path = request.url ?? "";
		const provider = providerOf(path);
		const answer =
			provider === undefined ? { status: 404, body: {} } : answerFor(provider, cepOf(path));

		if ("fail" in answer) {
			request.socket.destroy();

			return;
		}

		response.writeHead(answer.status, { "content-type": "application/json; charset=utf-8" });
		response.end(JSON.stringify(answer.body));
	});

	server.listen(port, "127.0.0.1", () => {
		console.log(`cep mock server on http://127.0.0.1:${port}`);
	});
};

const record = async (): Promise<void> => {
	const outDir = mkdtempSync(join(tmpdir(), "brutils-cep-"));
	const bundlePath = join(outDir, "shipped.mjs");

	await build({
		entryPoints: [resolve(root, "src/index.ts")],
		bundle: true,
		format: "esm",
		platform: "neutral",
		outfile: bundlePath,
		logLevel: "error",
	});

	const shipped = (await import(bundlePath)) as {
		getAddressInfoByCep: (
			cep: string | number,
			options?: Record<string, unknown>,
		) => Promise<Record<string, string>>;
	};

	rmSync(outDir, { recursive: true, force: true });

	const realFetch = globalThis.fetch;

	globalThis.fetch = ((input: unknown): Promise<unknown> => {
		const url = String(input);
		const provider = providerOf(url);
		const answer =
			provider === undefined ? { status: 404, body: {} } : answerFor(provider, cepOf(url));

		if ("fail" in answer) {
			// The shipped `fetchWithRetry` retries on a transient transport failure, so the mock
			// reports one the same way the mock server does by closing the socket.
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

	const lines = ["cep\tkind\tproviders\toutcome\tdetail"];

	for (const entry of cases) {
		const input = entry.kind === "number" ? Number(entry.cep) : entry.cep;
		let outcome = "ok";
		let detail = "";

		try {
			const found = await shipped.getAddressInfoByCep(input, optionsOf(entry.providers));

			detail = [
				found["cep"],
				found["state"],
				found["city"],
				found["neighborhood"],
				found["street"],
			].join("|");
		} catch (error) {
			outcome = "error";
			detail = `${(error as Error).name}|${(error as Error).message}`;
		}

		lines.push([entry.cep, entry.kind, entry.providers, outcome, detail].join("\t"));
	}

	globalThis.fetch = realFetch;

	writeFileSync(resolve(bridge, "conformance/cep.expected.tsv"), `${lines.join("\n")}\n`);

	console.log(`${cases.length} CEP cases recorded from the shipped package`);
};

const [command, argument] = process.argv.slice(2);

if (command === "serve") serve(Number(argument));
else await record();
