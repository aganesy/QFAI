# Documentation Clarity

The writing standard for every AI coding agent in this repository. It covers
pull requests, issues, source-code comments and Markdown files.

Write for a reader who knows neither the background of the change nor the
habits of this team. Keep only what that reader can follow.

## Scope

| Surface                     | When it applies               |
| --------------------------- | ----------------------------- |
| Pull request title and body | On create and on update       |
| Issue title and body        | On create and on update       |
| Comments in source code     | Within the diff of the change |
| Markdown files              | Within the diff of the change |

Leave everything outside the diff alone. Reformatting unrelated files is a
separate change.

## 1. No local identifiers

Never write these into source code or Markdown files:

- issue and pull-request numbers (`#123`, `GH-123`)
- ticket, review or thread identifiers
- names and abbreviations that only this project or team understands

When a reader needs the background, write the background itself in ordinary
words instead of pointing at a number.

Pull request and issue bodies are outside this clause. Numbers and links belong
there, and in commit messages and the changelog.

## 2. No account of how the work went

What happened while the change was being designed or written stays out of the
result:

- "started as X, changed to Y"
- "adjusted after review"
- "temporary until Z lands"

State the current behaviour and the reason it is that way. The history is
already in the git log and the pull request; do not write it twice.

## 3. Cut

- Delete anything self-evident.
- Merge repeated statements into one.
- Shorten wordy phrasing.

The test: if deleting a sentence leaves the reader no worse off, delete it.

## 4. Plain language

- Use ordinary vocabulary. Avoid coined terms and in-group phrasing.
- One claim per sentence. Keep sentences short.
- Break lines so no line is hard to scan.

## 5. Make it readable at a glance

- Parallel items become a bullet list.
- Three or more paired values become a table.
- Ordered steps become a numbered list.

## 6. Re-read what you wrote

Read every line you changed and check two things:

1. Is any phrasing still hard to follow?
2. Does any sentence read as a literal translation?

An agent that reasons in one language and writes in another leaves translation
artefacts behind. This happens in every language pair. Rewrite the sentence
the way someone writing natively in that language would put it.

## Automatic reminder

`.claude/settings.json` carries hooks that re-state this standard at the two
moments it is easiest to forget:

| Moment                                                           | Hook        |
| ---------------------------------------------------------------- | ----------- |
| Posting a pull request, issue or review through the GitHub tools | PreToolUse  |
| Writing or editing a Markdown file                               | PostToolUse |

Each hook runs `node` directly and prints one fixed message. No shell, no file
reads, no network. Delete the entries from `.claude/settings.json` to turn the
reminder off; the rule still applies.

The `gh` command line is out of scope. A shell-argument condition also matches
compound commands that have nothing to do with GitHub, which would put the
reminder in front of unrelated work. The standard reaches the agent through
`CLAUDE.md` and `AGENTS.md` either way.

## Scope of this file

This is the master copy shared by every AI coding agent working in this
repository. Tool-specific instruction files reference it instead of restating
it, so edit this file when the rule changes.
