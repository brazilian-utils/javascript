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
A CycloneDX SBOM of each version ships inside the package as `brazilian-utils.cdx.json` (so it
sits in `node_modules/@brazilian-utils/brazilian-utils/` after install) and is also kept as the
`sbom-<tag>` artifact of its release run under
[Actions → Release](https://github.com/brazilian-utils/javascript/actions/workflows/release.yml).

## Secrets and credentials

- No credential lives in the repository, in the package or in the documentation site. Publishing
  to npm uses Trusted Publishing (OIDC), so there is no npm token to store or rotate.
- The only secrets the project holds are the Codecov upload token and the Stryker dashboard key,
  kept as GitHub Actions encrypted secrets, readable by the workflows alone and only by the jobs
  that need them. Maintainers with the `Admin` role are the only people who can set or replace
  them; nobody can read them back.
- A secret is rotated when a maintainer leaves, when a workflow that used it is removed, when the
  provider announces an exposure and whenever a leak is suspected, in that case before anything
  else is investigated.
- Nothing in the project reads a `.env` file, and `.gitignore` excludes them. GitHub's push
  protection rejects known credential formats at push time and TruffleHog scans the commits of
  every pull request and the whole history weekly; a finding is treated as a leak, so the
  credential is rotated first and the history is rewritten only afterwards, if ever.

## Dependency and static-analysis policy

- The published package has zero runtime dependencies, and a pull request that adds one is not
  merged (see [CONTRIBUTING.md](CONTRIBUTING.md#zero-runtime-dependencies)).
- No development dependency with a known vulnerability of high or critical severity may be merged
  or released: `audit-ci --high` and OSV-Scanner run on every pull request and block it, and the
  weekly Security run catches advisories published in between. Lower severities are fixed in the
  next regular Dependabot update, and before the next release when a fixed version exists.
- An advisory is allow-listed only when it cannot reach the published package or the release
  pipeline (a development-only dependency in a code path the toolchain never exercises), and the
  allow list in `.github/workflows/check.yml` names each advisory by ID so the exception is
  reviewable; it is removed as soon as a fixed version is available.
- Static analysis has no accepted threshold of open findings: every ESLint, TypeScript, knip, jscpd,
  actionlint and zizmor finding blocks the merge, and the OpenSSF Scorecard findings uploaded to
  the Security tab are worked in the next change to the affected file. The only suppressions are the
  documented Stryker equivalent-mutant comment and the `audit-ci` allow list above.

## Threat model

The library is a set of pure functions with no runtime dependencies, so the surface is small; this
is what it consists of and what protects each part.

**Assets**: the integrity of the package consumers install; the correctness of the validators (a
wrong "valid" lets bad data into a consumer's system); the availability of the consumer's process
(a utility must not hang or blow up on adversarial input); and the CEP or address a consumer sends
to a third-party API through the two lookup utilities.

**Actors and entry points**: end users of consumer applications, whose strings reach the utilities
as arguments; the CEP API providers, whose HTTP responses reach `getAddressInfoByCep` and
`getCepInfoByAddress`; contributors, through pull requests from forks; maintainers, with write
access and release approval; and the automation (GitHub Actions, Dependabot, release-please, the
npm registry).

| Threat                                                                        | Mitigation                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Adversarial input makes a utility throw, hang or read a polluted prototype    | Every utility has property-based tests that feed it arbitrary values, prototype-chain keys as state codes included, and assert it never throws; the suites are mutation-tested; there is no `eval`, `new Function` or dynamic code, and lookups read own properties only.                                    |
| A malicious or vulnerable dependency reaches consumers                        | Zero runtime dependencies; development dependencies are pinned by the lockfile and checked by `audit-ci`, OSV-Scanner and Dependabot under the policy above.                                                                                                                                                 |
| A fork's pull request runs code with access to secrets or write tokens        | Workflows use `pull_request` only, a read-only `GITHUB_TOKEN`, `persist-credentials: false` and no secrets for fork builds; GitHub requires a maintainer's approval before running workflows for outside contributors.                                                                                       |
| The build or release pipeline is tampered with to publish a modified package  | Every action is pinned to a commit SHA and linted by actionlint and zizmor; jobs run with the least permissions; the package is staged on npm through OIDC Trusted Publishing with provenance and becomes installable only after a maintainer approves it with 2FA; releases are immutable and ship an SBOM. |
| A maintainer account is compromised                                           | Two-factor authentication on the GitHub organization and on npm, no long-lived tokens, single-purpose secrets rotated under the policy above, and a release that still needs the staged-version approval.                                                                                                    |
| A CEP API returns malformed or hostile data, or is unavailable                | Responses are validated before use and treated as untrusted; only the CEP or address being looked up is sent, over HTTPS; retries are bounded and the utilities return `null` instead of throwing.                                                                                                           |
| A dataset or check-digit rule goes stale and a validator gives a wrong answer | Datasets are regenerated from their official sources by the `Update datasets` workflow through reviewable pull requests, every rule cites its official source in a `@see` tag, and the tests pin official examples.                                                                                          |

Vulnerability reports that reveal a threat missing from this table are welcome; the table is
updated with the fix.
