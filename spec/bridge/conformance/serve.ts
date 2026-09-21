/**
 * Serves whatever the generated code talks to while the drivers run.
 *
 * A utility that reaches the network declares a `serve` in its recorder, and this starts every
 * one of them on the port the runtime's `BRUTILS_BRIDGE_HTTP_ORIGIN` hook points at. A tree
 * with no such utility serves nothing and exits, which is what `run-all.sh` expects.
 *
 * Usage: `node spec/bridge/conformance/serve.ts <port>`
 */
import { loadRecorders } from "./cases.ts";

const port = Number(process.argv[2] ?? 18_080);
const loaded = await loadRecorders();
const recorders = loaded.filter((recorder) => recorder.serve !== undefined);

if (recorders.length === 0) {
	console.log("no utility reaches the network: nothing to serve");
} else {
	for (const recorder of recorders) {
		await recorder.serve?.(port);

		console.log(`${recorder.module} answering on http://127.0.0.1:${port}`);
	}
}
