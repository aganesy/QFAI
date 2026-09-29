# Repository Language

This repository is written in English.

## Scope

Everything tracked here, and everything written about it:

- Markdown — root documents, `CHANGELOG.md`, `.agents/rules/`,
  `packages/qfai/docs/`, `.qfai/`
- Source — identifiers, string literals, comments and JSDoc
- Tests, fixtures and scripts
- Workflow files and the comments inside them
- Commit messages, and the title and body of every pull request and issue

No Japanese text appears anywhere in the repository. Where a matcher or a
fixture has to hold a Japanese sample to do its job, the sample is written as
\uXXXX escapes and a nearby English comment says what it is.

## Not in scope

Two things this rule does not decide.

- **The language an assistant replies in.** That follows the user's working
  language and is settled by `.qfai/assistant/rule/communication.md`.
- **What an adopter writes in their own repository.** `qfai init` output is a
  starting point. A project picks the language of its own specs, contracts and
  discussion packs.

The line is between text this repository stores and ships, which is English,
and text a user writes or receives, which is theirs.

## Why

So that one search finds everything.

A finding code, the validator message it prints, the changelog entry that
explains it and the test that pins it are one chain. When links in that chain
are in different languages, following it means searching twice, and the second
search is the one people skip. The cost falls on whoever arrives last and knows
least.

## Enforcement

Two surfaces are checked. Both are held at zero Japanese lines, and no
allowlist exists: a Japanese line fails wherever it appears.

| Surface                                           | Pinned by                            | Held against                                          |
| ------------------------------------------------- | ------------------------------------ | ----------------------------------------------------- |
| Operator-facing strings in `packages/qfai/src/**` | this rule, § Operator-facing strings | `packages/qfai/tests/unit/cliMessageLanguage.test.ts` |
| `CHANGELOG.md`, every section                     | this rule                            | `packages/qfai/tests/unit/changelogLanguage.test.ts`  |

Comments, other documents, tests and workflow files have no check, so on those
surfaces the rule is held by review.

## Operator-facing strings

Every string the qfai CLI prints to an operator is English. This governs what
qfai prints, not the language an assistant replies in.

| Surface                                                       | Covered                                    |
| ------------------------------------------------------------- | ------------------------------------------ |
| `qfai --help`, including `usage()`                            | Yes                                        |
| `error()`, `warn()`, `info()`, direct stdout/stderr           | Yes                                        |
| `qfai doctor` check `title`, `message`, `details.nextActions` | Yes                                        |
| `Issue.message`, including new findings                       | Yes                                        |
| Source comments and JSDoc                                     | No: they reach implementers, not operators |
| An adopter's own specs, contracts and discussion packs        | No: they follow the project's language     |

One language lets a log search, an alert rule or a runbook match a message
without a branch per language. A finding message is held to it wherever it is
built: the validators, `config.ts`, `waivers.ts` and `report.ts` alike.

## Related

- Writing standard, once the language is settled: `documentation-clarity.md`
- The `--format text` grammar those messages are printed in:
  BR-0014-0092 to BR-0014-0095 in
  `.qfai/spec/03_contract/cli/cli-0014-qfai-validate.md`
