#!/usr/bin/env node
import { fstatSync } from "node:fs";
import process from "node:process";

import packageJson from "../../../package.json" with { type: "json" };
import * as api from "../../index";
import { runBin } from "../run-bin/run-bin";

await runBin({
	api,
	version: packageJson.version,
	process,
	isStdinPiped: () => {
		const stats = fstatSync(process.stdin.fd);

		return stats.isFIFO() || stats.isFile();
	},
});
