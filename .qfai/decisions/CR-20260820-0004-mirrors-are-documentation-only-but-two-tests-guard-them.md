# Change Request

- ID: `CR-20260820-0004`
- Title: `BR-0017-0010 puts the agent-integration mirrors in the documentation-only set, and two test files guard those mirrors from lanes that set skips`
- Raised by: `/qfai-implement orchestrator, spec-0017 change 8; the exclusion set was derived by measuring which repository paths the test suite reads, and this is the one member the measurement contradicts`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
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
