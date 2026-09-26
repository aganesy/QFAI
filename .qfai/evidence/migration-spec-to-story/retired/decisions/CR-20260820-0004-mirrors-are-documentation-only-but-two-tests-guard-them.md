# Change Request

- ID: `CR-20260820-0004`
- Title: `BR-0017-0010 puts the agent-integration mirrors in the documentation-only set, and two test files guard those mirrors from lanes that set skips`
- Raised by: `/qfai-implement orchestrator, spec-0017 change 8; the exclusion set was derived by
measuring which repository paths the test suite reads, and this is the one member the
measurement contradicts`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `A` — the mirror guards move into the lint lane
- Applied at: `2026-08-23T00:00:00Z` — lint:mirror-surface added and wired into ci:lint; census re-measured at five guards across three slices
- Completed at: `2026-08-31T00:00:00Z` — the five guards did not cover every test whose subject
  is a root mirror tree, and a later round read that gap as grounds to implement option B
  instead: the four members were removed from the documentation-only set. That reversed an
  approved decision on the strength of a measurement the decision had already accounted for.
  The members are restored, and option A is finished rather than substituted — the lane now also
  runs `tests/codex/agents.test.ts`, `tests/core/prFixMonitor.test.ts` and
  `tests/core/prMergePlan.test.ts`, which are the test files that resolve the repository root and
  then enter a mirror directory. Eight guards, 144 tests.
- Superseded by: `-`
- Blocked set: `none — change 8 implements BR-0017-0010 as written; what is open is whether the guard moves or the member does`

## The rule

`BR-0017-0010`: "The documentation-only exclusion set MUST be enumerated, MUST exclude the assistant
catalog tree because changes there alter validate output, and **MUST include the agent-integration
mirrors**."

Change 8 implements that. A pull request touching only `.claude/`, `.codex/`, `.agents/` or
`.instruction/` classifies as documentation-only, which skips `check-types`, `check-types-future`,
`test` and `scanner-coverage`.

## What the measurement found

The rest of the exclusion set was derived by asking, for each candidate path, whether any test file
reads it — because classifying a path as documentation skips the lane that would catch a break there.
That is why the set is small: `packages/qfai/docs/**`, `LICENSE` and `REVIEW.md` are the only
non-mirror members, and every other candidate has at least one reader.

The mirrors have readers too, and they are readers of the ROOT copies rather than the shipped ones:

```text
packages/qfai/tests/codex/agents.test.ts        reads  REPO_ROOT/.codex
packages/qfai/tests/core/prFixMonitor.test.ts   reads  repoRoot/.claude
packages/qfai/tests/core/prFixMonitor.test.ts   reads  repoRoot/.agents
```

`tests/codex/**` runs in the `integration` slice and `tests/core/**` in the `core` slice. Both are
inside the `test` job, and `test` is one of the four jobs a documentation-only classification skips.

So the shape this produces is: a pull request that edits only an agent mirror skips exactly the two
test files whose subject is agent mirrors. That is not a small residual — it is the case most likely to
break them.

## Why this is filed rather than fixed

Dropping the mirrors from the set on my own authority would override an explicit `MUST`. Keeping them
without recording the hazard would ship a selection rule that is unsafe in the one direction its own
enumeration was measured to avoid. So change 8 implements the rule as written and this carries the
measurement.

## Options

**A — move the mirror guards into the lint lane (recommended).** The lint lane is structurally exempt
from selection (`BR-0017-0011`) precisely because it carries the checks a documentation change can
break. The precedent already exists in this repository: `lint:workflow-shape` is a `vitest` invocation
of one integration test file wired into `ci:lint`, and `check-prompt-scanner-pair.mjs` is a lane member
whose subject is a pair of files. Adding the two mirror-guarding files the same way keeps the saving
AND the guard, and it makes the guard run on the pull requests most likely to need it.

**B — remove the mirrors from the documentation-only set.** Safe, and it costs the main saving this
rule exists to buy: mirror edits are high-churn and low-risk, which is why the rule names them.

**C — accept the gap.** Records that a mirror-only pull request is unguarded. Cheapest today, and the
failure mode is a broken mirror merging green, which is exactly the class `spec-0017` exists to close.

## A caveat on the measurement's precision

The two files above were found by looking for a repository-root resolution followed by a mirror
directory name. A grep for the bare directory names matches many more files, but most of those are
reading the SHIPPED copies under `packages/qfai/assets/init/`, which a mirror-only change does not
touch. The two named here are the ones that survive that distinction; the search was structural rather
than exhaustive, so treat the list as a floor, not a census.

## Related

- `BR-0017-0010`, `BR-0017-0011`, `AC-0017-0005`, `EX-0017-0010`, `TC-0017-0010`
- `spec-0017` `TDD-0010`, `.github/workflows/ci.yml` (the `detect` job's classifier)
- `packages/qfai/tests/codex/agents.test.ts`, `packages/qfai/tests/core/prFixMonitor.test.ts`

## Census re-measured, and half the gap closed without a decision

**Added 2026-08-20, after implementation-review finding M4.** The caveat above understates the
population, and the correct number changes how the options read. Measured with `git ls-files`:

```text
test files that read something under .agents/           10
runner projects they span                                5   (assets, cli, core, e2e, integration)
executable files tracked under .agents/                   2
  .agents/skills/pr-fix/scripts/run-pr-fix.ps1
  .agents/skills/pr-merge/scripts/run-pr-merge.ps1
executable files under .claude/, .codex/, .instruction/   0
```

The two `.ps1` files are read by `packages/qfai/tests/core/prFixMonitor.test.ts` and
`packages/qfai/tests/core/prMergePlan.test.ts`. The guard files named in the section above are part
of the ten, not all of it — `agentsRulesSurface.test.ts`, `skillLinkSurface.test.ts` and
`reviewerVerdictVocabulary.test.ts` belong in the count too.

So `.agents/` is not a mirror tree with some documentation in it. It is **the master tree**, it holds
executable automation, and a change to either script selected the narrow lane set and skipped the
`test` job entirely — including the two files whose subject is that script.

### The half that needed no decision

`BR-0017-0010` admits the agent-integration **mirrors** to the documentation-only set. A PowerShell
script is not a mirror. So the classifier now excludes executables by suffix wherever they sit:

```text
.agents/skills/pr-fix/scripts/run-pr-fix.ps1
  -> full=true, reason="executable, not documentation whatever directory it sits in: ..."
```

That reads the rule more closely rather than deviating from it — nothing in the rule calls automation
prose — and it is asserted by `TC-0017-0010` with three oracle rounds: removing the carve-out reddens
both halves of the claim, keeping the check while dropping the reason reddens the reason half alone,
and a comment-only control round reddens nothing.

### What is still open, and it is narrower now

The remaining question is only about **prose**: a pull request that edits nothing but Markdown under
`.agents/`, `.claude/`, `.codex/` or `.instruction/` still skips the lanes holding the mirror-parity
guards. That is the case where the saving is real and the risk is a broken mirror merging green, so
it is still a decision between options A, B and C above — but it no longer covers the automation, and
the "at least five files" figure in that discussion should be read as the ten measured here.

### The census was still incomplete: twenty files that are neither prose nor executable

**Added 2026-08-20, after round 5.** The re-measured census above closed the executable half and
then framed what remains as "only prose" and "nothing but Markdown". `implementation-reviewer`
found that false, and the tree agrees:

```text
tracked files under the four mirror trees that are neither .md nor an executable suffix:
  .codex/     31   including 20 .toml  (19 x agents/*.toml plus config.toml)
  .claude/    11   symlinked skill directories
  .agents/     8   symlinked skill directories
  .instruction/ 0
```

The twenty `.toml` files are agent definitions, and they are GUARDED:
`packages/qfai/tests/codex/agents.test.ts` reads the repository-root `.codex` tree and asserts
file-count equality against `agent-catalog.yml` plus name and description equality against the
canonical frontmatter; `packages/qfai/tests/assets/reviewerVerdictVocabulary.test.ts` reads one
directly. Measured against the extracted classifier:

```text
.codex/agents/completion-reviewer.toml  ->  full=false, documentation-only
```

So a pull request that edits one `description` in an agent TOML diverges it from the canonical
frontmatter, classifies documentation-only, skips the `test` job, never runs the guard, and
`ci-pass` reads a skipped lane as passing. That is not a prose risk — it is a data mirror falling
out of sync with its source, which is the same failure class the executable half had.

No further code change is proposed here: option A already covers these files once the census names
them, because moving the mirror guards into the lint lane makes them run whatever the classifier
decided. What changes is that the choice between A, B and C is now being made against a complete
census rather than one that omitted twenty guarded files.

## Impact

- Specs: `spec-0017 — BR-0017-0010`
- Plans: `10_Plan.md, change 8 (change detection and lane selection)`
- Tests: `the mirror-guarding files this CR names; TDD-0010 and TDD-0011 assert set membership`
- Contracts: `none`
- Schema: `none`

## Decision needed from user

Take option A — move the mirror guards into the lint lane, which `BR-0017-0011` exempts from
selection, keeping both the saving and the guard — or option B, removing the mirrors from the
documentation-only set at the cost of the saving, or option C, accepting the gap?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: decide whether the guard moves or the member does, and record it in
   `BR-0017-0010`. Under option A the follow-on work is a lane wiring change in the root
   `package.json`, following the existing `lint:workflow-shape` precedent. Mode: **`re-derive`**
   if the approved option moves the rule's membership; **`confirm-only`** if the approved option
   is A, because A leaves `BR-0017-0010` as written and the work is a lane-wiring change in the
   root `package.json` — which is not a spec artifact and so is not a skill rerun at all.
2. Downstream ledger sweep: **no rows are reset.** Change 8 implements `BR-0017-0010` as written.
   Named so a later sweep cannot widen:
   - conditional reset under option B: `TDD-0010`, `TDD-0011` — the two rows asserting over which
     paths are members. The remaining detection rows assert selection mechanics, not membership.
3. Cross-check after applying: **re-measure the census in this CR rather than carrying it forward.**
   Its caveat section understates the population — it is at least five files across three slices,
   including `agentsRulesSurface.test.ts`, `skillLinkSurface.test.ts` and
   `reviewerVerdictVocabulary.test.ts` — and `.agents/` is the master tree holding executable
   automation, not documentation. Whoever applies this CR counts again first.

## Resolution

<!--
Filled in when Status leaves `open`. Record the re-measured census and the wiring or rule change.
-->
