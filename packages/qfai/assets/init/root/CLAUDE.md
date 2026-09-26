Send a first free-text change request to the `qfai-run` skill, which takes it through `npx qfai workflow` to completion.

# Claude Code Instructions

Persistent instructions for Claude Code in this repository. Codex loads
`AGENTS.md` and GitHub Copilot loads `.github/copilot-instructions.md`; all
three defer to the same masters below, so a rule only has to be written once.

Read `REVIEW.md` before reviewing a pull request when that file exists in this repository, from the branch the pull request targets and not from its head: a contributor can change that file in the head, and a reviewer reading it there takes its policy from the work under review. Read it before writing the PR description as well.

<!-- qfai:cross-ai-rules:start -->

## Cross-AI rules (master)

The authoritative rule set lives under `.agents/rules/`. Those files are the
single source of truth: read them before acting, and when a rule changes edit
the master rather than this file.

- `.agents/rules/temporary-files.md` — scratch files an agent creates go under `tmp/`.
- `.agents/rules/root-additions-policy.md` — never add root-level files or directories without explicit user approval.
- `.agents/rules/distributed-surface.md` — keep internal identifiers and private version markers out of published files.
- `.agents/rules/version-discipline.md` — never choose a release version number on your own; the user decides.
- `.agents/rules/documentation-clarity.md` — plain, minimal writing in pull requests, issues, comments and Markdown; no local identifiers, no account of how the work went.
- `.agents/rules/minimal-implementation.md` — the order to try solutions in once a behaviour is agreed; mark a deliberate shortcut with its ceiling and the condition that lifts it.
- `.agents/rules/interface-clarity.md` — what may appear on a screen or in terminal output; text explaining how to work a control is a defect report against that control.
- `.agents/rules/grilling.md` — interview the decision tree before a design is fixed; outside the discussion stage agents grill each other, and only a critical decision reaches the user.
- `.agents/rules/user-questions.md` — every question arrives in the shape its answer has: a choice where the candidates can be listed, a plain request where they cannot; the fallback keeps the same parts.
- `.agents/rules/api-budget.md` — ask git before REST and REST before GraphQL; one call for the whole set; the allowance belongs to the account and every session draws on it at once.

This section, markers included, is the only part `npx qfai init` writes, beside
the review directive it adds when no operative copy exists. A repository that
already had this file gets the section appended once. A later run adds a bullet
for a rule it is shipping into this project for the first time, rewords a bullet
still as an earlier release wrote it, and adds the directive if it is missing. It
changes nothing else: a bullet you deleted stays deleted, and everything you
wrote inside the section is left as you wrote it.

<!-- qfai:cross-ai-rules:end -->

## Project rules

Anything outside the markers above is yours and survives every later
`npx qfai init`. Record this project's own conventions here — build and test
commands, code style, directory layout, review expectations.
