#!/usr/bin/env node
import { readFileSync } from "node:fs";
import process from "node:process";

import * as library from "../index";
import { SERVER_NAME, TOOLS } from "./constants";
import { serveStdio } from "./serve-stdio/serve-stdio";

const manifest: unknown = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

serveStdio({
	input: process.stdin,
	output: process.stdout,
	log: process.stderr,
	context: {
		serverInfo: {
			name: SERVER_NAME,
			version:
				typeof manifest === "object" && manifest !== null && "version" in manifest
					? String(manifest.version)
					: "unknown",
		},
		tools: TOOLS,
		library,
	},
});
