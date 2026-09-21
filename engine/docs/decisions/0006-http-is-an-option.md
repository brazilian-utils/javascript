# 0006 — A failed request is absence, not an exception

## Context

`http.request` was specified to fail with `HttpError` on a transport error or a timeout. Retry
policy is supposed to be written in source — but retrying means recovering from that failure, and
the subset has no `catch`, on purpose: exceptions are for domain errors that propagate, and bugs
are proven impossible instead of caught.

## Options

**Keep the failure and add `catch` for declared error types.** Adds the one construct the subset
exists to avoid, and makes every backend's error plumbing harder (Go would need to translate a
recovered error back into a value).

**Answer an `Option`.** A transport error or a timeout is absence. A 4xx or 5xx status stays an
ordinary value, because it *is* an answer.

## Decision

`http.request(request): Option<HttpResponse>`, with the effect `Http` and no `Fail`.

## Consequences

- Retry is an ordinary counted loop over attempts, and the 250 ms delay between them is
  `clock.sleep`, which the reference model advances virtually.
- A target's capability interface answers an optional response: `Promise<HttpResponse | undefined>`
  in TypeScript, `Optional[HttpResponse]` in Python, `*HttpResponse` in Go.
- Nothing in the core needs `try`/`catch`, so nothing in the generated code has it either.
