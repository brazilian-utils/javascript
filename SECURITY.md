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

## Response timeline

This project is maintained by volunteers in their spare time, so these are targets, not a
contract; they are what we aim for on every report, and we will tell you when we cannot meet one.

| Step                                                        | Target                                  |
| ----------------------------------------------------------- | --------------------------------------- |
| Acknowledgement of your report                              | within 7 days                           |
| Assessment (confirmed or not, severity, what we plan to do) | within 14 days                          |
| Fix or mitigation published                                 | within 90 days of confirming the report |

Confirmed issues that are critical (for example, a vulnerability that any consumer hits with the
default usage of a utility) are worked on before anything else and are released as soon as a fix
is ready, without waiting for other changes. If a fix needs more than 90 days, we agree a new date
with you instead of letting the report go quiet.

If you get no acknowledgement within 14 days, the report probably got lost: send it again through
the other channel above (e-mail if you used GitHub, or the other way around).

## Disclosure

We follow coordinated disclosure: please keep the report private until a fix is available, and we
keep you informed along the way.

1. A confirmed vulnerability is fixed on `main` and released in the latest `2.x` version through
   the regular [release flow](CONTRIBUTING.md#releasing).
2. On release, we publish a [GitHub Security Advisory](https://github.com/brazilian-utils/javascript/security/advisories)
   for the repository, which assigns a CVE through GitHub's CNA, so it reaches Dependabot,
   `npm audit`, OSV and the other scanners consumers already use.
3. The advisory and the release notes describe the affected versions, the fixed version and any
   workaround, and credit you as the reporter unless you prefer to remain anonymous.

Vulnerabilities reported publicly by mistake are handled the same way, just without the embargo.

## Verifying a release

Every version is published from the release workflow in this repository with
[npm provenance](https://docs.npmjs.com/generating-provenance-statements) (Sigstore), and no
maintainer publishes from a personal machine. To check that the copy you installed is the one the
workflow built:

```bash
npm audit signatures
```

It verifies the registry signature and the provenance attestation of every installed package.
The attestation, with the commit and the workflow run that built the version, is also shown on the
["Provenance" panel of the version on npmjs.com](https://www.npmjs.com/package/@brazilian-utils/brazilian-utils?activeTab=versions).
A CycloneDX SBOM of each version is kept as the `sbom-<tag>` artifact of its release run under
[Actions → Release](https://github.com/brazilian-utils/javascript/actions/workflows/release.yml).
