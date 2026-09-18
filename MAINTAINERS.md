# Maintainers

This file lists who maintains Brazilian Utils, what each role can do and how someone gets there.
Everything here applies to the `brazilian-utils/javascript` repository and to the
`@brazilian-utils/brazilian-utils` package on npm.

## Current maintainers

| Maintainer                                 | GitHub                                         | Since |
| ------------------------------------------ | ---------------------------------------------- | ----- |
| Hyan Mandian (project lead, npm publisher) | [@hyanmandian](https://github.com/hyanmandian) | 2018  |

Maintainers are the only accounts with write access to the repository and are the
[code owners](.github/CODEOWNERS) of every path. The list above is the single source of truth;
`.github/CODEOWNERS` and the repository collaborators on GitHub mirror it.

## Roles

**Contributor**: anyone who opens an issue, a discussion or a pull request from a fork. No standing
access is needed; the CI runs the pull request with a read-only token. Contributors are credited
in the README through all-contributors (see [Recognition](CONTRIBUTING.md#recognition)).

**Maintainer**: reviews and merges pull requests, triages issues and security reports, merges the
release pull request and approves the staged version on npm with 2FA, keeps the datasets and the
toolchain updated, and speaks for the project in discussions. Maintainers have the `Admin` role on
the repository, are members of the `brazilian-utils` GitHub organization (which requires two-factor
authentication for every member) and are publishers of the package on npm (two-factor
authentication required, publishing only through the repository's trusted publisher).

**Automation**: GitHub Actions (build, tests, publish), Dependabot and release-please act with
short-lived tokens scoped to each job (`permissions:` in every workflow); none of them can merge a
pull request or publish a version without a maintainer's action.

## Becoming a maintainer

Write access is granted by the current maintainers, after review, to contributors with a sustained
record of merged contributions (code, docs, datasets or tooling) and a track record of good
judgment in reviews and discussions, typically over several months. The steps are:

1. An existing maintainer proposes the contributor, and the current maintainers agree.
2. The contributor enables two-factor authentication on GitHub and on npm.
3. They receive the lowest access that lets them do the work (`Write` on the repository first;
   `Admin` and the npm publisher role only when they take on releases), are added to this file and
   to `.github/CODEOWNERS`, and are announced in a discussion.

Maintainers who become inactive for a year or so, or who ask to step down, move to an
**emeritus** list here and have their access removed; they are welcome back at any time through
the same steps. Access is also reviewed whenever the GitHub organization or the npm package
settings change.

## Contact

Use the channels in [SUPPORT.md](SUPPORT.md) for questions and [SECURITY.md](SECURITY.md) for
vulnerabilities; e-mail (support@brazilian-utils.com.br) reaches the maintainers directly.
