---
title: "Playground"
description: "Try any Brazilian Utils function in the browser: pick a function, edit its arguments and see the result, running the latest published release."
keywords: ["playground", "try it", "demo", "CPF validator online", "CNPJ validator online", "REPL"]
---

Pick a function, edit its arguments and run it. The playground imports the latest release from a CDN, the same code `npm install` gives you, so nothing here is a mock. Arguments are read as JSON, one entry per argument: `["123.456.789-09"]` calls the function with one string, `["Q0SLFMBD7VX439", { "version": 2 }]` with a string and an options object. Press Ctrl+Enter (Cmd+Enter on macOS) in the arguments box to run again.

<div id="try-it" class="playground"></div>

The [utilities reference](utilities.md) documents what each function accepts and returns.
