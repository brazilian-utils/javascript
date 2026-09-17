# Security Policy

## Supported Versions

Only the latest major version of `@brazilian-utils/brazilian-utils` receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| < 2.0   | :x:                |

If you are on an unsupported version, please upgrade to the latest `2.x` release before reporting
an issue, as it may already be fixed.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull
requests.**

### Preferred: GitHub Private Vulnerability Reporting

The preferred way to report a vulnerability is through GitHub's private reporting feature:

1. Go to the [Security tab](https://github.com/brazilian-utils/javascript/security) of this
   repository.
2. Click **"Report a vulnerability"**.
3. Fill in as much detail as you can (see below).

This creates a private conversation with maintainers and lets us coordinate a fix and disclosure
without exposing the issue publicly before a patch is available.

### Alternative: Email

If you are unable to use GitHub's private reporting for any reason, you can email
**support@brazilian-utils.com.br** instead.

### What to include

To help us triage and fix the issue quickly, please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce it (a minimal code sample using
  `@brazilian-utils/brazilian-utils` is ideal).
- The affected version(s).
- Any suggested fix or mitigation, if you have one.

## What's in scope

This policy covers the `@brazilian-utils/brazilian-utils` npm package and the source code in this
repository, including:

- Any code path that could lead to unexpected/unsafe behavior when using the library's exported
  utilities (e.g. ReDoS in a validator/formatter, prototype pollution, unsafe use of dynamic code).
- Build/release tooling in this repository (`scripts/`, CI workflows) if it could compromise the
  integrity of the published package.

Out of scope: vulnerabilities in third-party dependencies of _your_ project, or issues that only
affect the documentation site (`docs/`) content itself rather than the published package (still
report doc-content issues, but via a regular issue).

This library ships with **zero runtime dependencies**, which limits the supply-chain
attack surface, but does not eliminate the need for review. Still report anything you find.

## Response Expectations

This project is maintained by volunteers in their spare time. We will look at security reports
as soon as we can and treat them as a priority, but we cannot commit to response times. If a fix
is published we will credit you in the release notes unless you prefer to remain anonymous.
