# 0005 — `race` answers the first `Option`, not the first success

## Context

The plan specifies `race` as "the first task to succeed, and when all fail an aggregated domain
error whose components are ordered by task index". Aggregation assumes a task can fail, which in
this language means raising a domain error — and the subset has no `catch`, so a racing author
could not have handled the aggregate anyway.

## Decision

Every task answers an `Option`. The race answers the first task that answers `some`, or `none`
when none does. The caller decides what `none` means, and raises its own domain error with its own
message.

## Consequences

- `getAddressInfoByCep` raises `GetAddressInfoByCepNotFoundError` itself, which is exactly what
  the published package does.
- No aggregate error type is needed, and the component ordering question disappears.
- The determinism rule is unchanged: under the reference model the winner is the smallest virtual
  completion time, ties broken by task index.
