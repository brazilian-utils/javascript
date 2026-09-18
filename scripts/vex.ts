#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

type Statement = {
	vulnerability: { name: string };
	status: string;
	justification?: string;
	products: { "@id": string; subcomponents?: { "@id": string }[] }[];
};

const isStatement = (value: unknown): value is Statement =>
	typeof value === "object" &&
	value !== null &&
	"vulnerability" in value &&
	typeof value.vulnerability === "object" &&
	value.vulnerability !== null &&
	"name" in value.vulnerability &&
	typeof value.vulnerability.name === "string" &&
	"status" in value &&
	typeof value.status === "string" &&
	"products" in value &&
	Array.isArray(value.products);

/**
 * Reads the advisories `openvex.json` accounts for, checking that every statement is a complete
 * `not_affected` one: a status other than `not_affected` would need a fix, not a suppression, and
 * OpenVEX requires a justification for `not_affected`.
 * @returns {Set<string>} The advisory IDs (GHSA-...) with a statement.
 */
function readVexAdvisories(): Set<string> {
	const document: unknown = JSON.parse(readFileSync(join(ROOT, "openvex.json"), "utf8"));
	if (typeof document !== "object" || document === null || !("statements" in document)) {
		throw new Error("openvex.json has no statements");
	}
	const statements = Array.isArray(document.statements) ? document.statements : [];
	const advisories = new Set<string>();
	for (const statement of statements) {
		if (!isStatement(statement)) throw new Error("openvex.json has a malformed statement");
		const { name } = statement.vulnerability;
		if (statement.status !== "not_affected" || statement.justification === undefined) {
			throw new Error(
				`${name}: only not_affected statements with a justification are suppressions`,
			);
		}
		if (!statement.products.some((product) => (product.subcomponents?.length ?? 0) > 0)) {
			throw new Error(`${name}: the statement names no subcomponent (the vulnerable dependency)`);
		}
		advisories.add(name);
	}
	return advisories;
}

/**
 * Reads the advisory IDs OSV-Scanner ignores (`[[IgnoredVulns]]` entries of osv-scanner.toml).
 * @returns {Set<string>} The ignored advisory IDs.
 */
function readOsvScannerIgnores(): Set<string> {
	const toml = readFileSync(join(ROOT, "osv-scanner.toml"), "utf8");
	return new Set(Array.from(toml.matchAll(/^id = "([^"]+)"/gm), (match) => match[1] ?? ""));
}

/**
 * Reads the advisory IDs the Check workflow passes to `audit-ci --allowlist`.
 * @returns {Set<string>} The allow-listed advisory IDs.
 */
function readAuditCiAllowlist(): Set<string> {
	const workflow = readFileSync(join(ROOT, ".github", "workflows", "check.yml"), "utf8");
	const match = /--allowlist((?:\s+GHSA-[\w-]+)+)/.exec(workflow);
	return new Set(match?.[1]?.trim().split(/\s+/) ?? []);
}

/**
 * Lists the IDs present in one set and missing from the other.
 * @param {Set<string>} expected - The IDs that should be present.
 * @param {Set<string>} actual - The IDs that are present.
 * @returns {string[]} The IDs of `expected` that `actual` lacks.
 */
function missingFrom(expected: Set<string>, actual: Set<string>): string[] {
	return [...expected].filter((id) => !actual.has(id));
}

const vex = readVexAdvisories();
const sources = {
	"osv-scanner.toml": readOsvScannerIgnores(),
	".github/workflows/check.yml (audit-ci --allowlist)": readAuditCiAllowlist(),
};

let failed = false;
for (const [source, ids] of Object.entries(sources)) {
	for (const id of missingFrom(ids, vex)) {
		console.error(
			`${id} is suppressed in ${source} but has no not_affected statement in openvex.json`,
		);
		failed = true;
	}
	for (const id of missingFrom(vex, ids)) {
		console.error(`${id} has a statement in openvex.json but is not suppressed in ${source}`);
		failed = true;
	}
}

if (failed) process.exit(1);
console.log(
	`openvex.json accounts for ${vex.size} suppressed advisories, in sync with every suppression list`,
);
