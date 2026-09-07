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

An allowlist is the one place a Japanese line appears on purpose. It records
what is still untranslated so a check can hold that count, which makes the text
there data rather than writing. Listing a line is not permission to add
another: the lists may only shrink.

## Not in scope

Two things this rule does not decide.

- **The language an assistant replies in.** That follows the user's working
  language and is settled by `.qfai/assistant/constitution/communication.md`.
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

Two surfaces are checked today. Both work the same way: an unlisted Japanese
line fails, and a line that has been translated is struck from the list rather
than left as a slot something else can take.

| Surface                                           | Pinned by                                                                | Held against                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Operator-facing strings in `packages/qfai/src/**` | `packages/qfai/assets/init/.qfai/assistant/catalog/cli-ux-guidelines.md` | `packages/qfai/tests/unit/cliMessageLanguage.test.ts` and its allowlist |
| `CHANGELOG.md`                                    | this rule                                                                | `packages/qfai/tests/unit/changelogLanguage.test.ts` and its allowlist  |

The changelog check is keyed by release section, so `## [Unreleased]` — where
every entry is written before it ships — is held at zero rather than
allowlisted. Released sections carry the backlog.

Comments, other documents, tests and workflow files have no check, so on those
surfaces the rule is held by review.

## Existing content

Japanese predates this rule across much of the tree, including four of the rule
masters in this directory. That is a backlog, not permission. Content you add
or change is English whatever surrounds it.

The English wording of several rules already exists: the copies under
`packages/qfai/assets/init/root/.agents/rules/`, which `qfai init` ships, carry
no Japanese at all.

## Related

- Writing standard, once the language is settled: `documentation-clarity.md`
- Operator-facing message language:
  `packages/qfai/assets/init/.qfai/assistant/catalog/cli-ux-guidelines.md`
