# Coverage Depth Matrix — spec-0017

Scope: the nine `US-0017-*` this stage covers from `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts`.
The 82 `TC-0017-*` are `L1`/`L3` and belong to `tdd/test-list.md` under `/qfai-implement`; this matrix
does not restate them.

Committed, because it is a governance record: one justification per `❌`.

## What "the E2E surface" is for this spec

`spec-0017` has two halves — QFAI's own CI, and the same scaffold in the templates QFAI ships. The
own half is asserted directly against `.github/workflows/**` by the integration slices. The half a
user story is about is the adopter's, and it has one end-to-end surface: run `qfai init` into an
empty project and read what arrives. Every cell below is scored against **that** surface, not against
this repository's own workflows, which is why several rows carry `❌` for work the own tree has and
the shipped tree does not.

## The matrix

| US ID        | Normal path | Error path | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ----------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| US-0017-0001 | ✅          | ⚠️         | ❌              | ⚠️             | ❌                | ❌            | ✅              | ⚠️     |
| US-0017-0002 | ✅          | ✅         | ⚠️              | ✅             | ❌                | ⚠️            | ✅              | ✅     |
| US-0017-0003 | ✅          | ✅         | ⚠️              | ⚠️             | ❌                | ❌            | ⚠️              | ⚠️     |
| US-0017-0004 | ❌          | ❌         | ❌              | ❌             | ❌                | ❌            | ✅              | ❌     |
| US-0017-0005 | ⚠️          | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| US-0017-0006 | ❌          | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| US-0017-0007 | ❌          | ❌         | ❌              | ❌             | ❌                | ❌            | ❌              | ❌     |
| US-0017-0008 | ⚠️          | ❌         | ❌              | ❌             | ❌                | ❌            | ⚠️              | ❌     |
| US-0017-0009 | ✅          | ✅         | ⚠️              | ⚠️             | ❌                | ❌            | ✅              | ✅     |

Totals: **✅ 3 / ⚠️ 2 / ❌ 4** by `Status`.

## Justifications, one per ❌ status row

### US-0017-0004 — measurement-gated build reuse and artifact-upload hygiene: ❌

Measured in the shipped tree: **0 `upload-artifact` steps and 0 bundler builds**. There is nothing to
reuse and nothing to upload, so the obligation has no surface an adopter could receive. The row is
not skipped: the E2E test asserts the invariant that survives the gap — no shipped lane runs its own
build — and the oracle confirms it reddens when one does (`E4`).

Closing it is `TDD-0032` … `TDD-0035`, all four `blocked` on `CR-20260820-0007`, because their own
acceptance criteria require numbers written into `07_Decisions.md` which `/qfai-implement` may not
patch. So this cell is `❌` for a reason recorded upstream of this stage, not for want of a test.

### US-0017-0005 — layer-separated lanes without a new check name: ❌

The shipped orchestrator separates layers into **five separate jobs** (`unit`, `component`,
`integration`, `api`, `e2e`); the own tree uses matrix legs of one job. Both satisfy "one workflow
file", which is what the E2E test asserts and what the oracle covers. Neither the spec nor this stage
establishes which shape an adopter should receive — five jobs give five check names, which is exactly
what the story's title guards against for the own tree, and an adopter has no pre-existing check-name
set to preserve.

That is a genuine open question and it belongs to whoever owns the shipped orchestrator's shape
(`spec-0003`), not to this matrix. Recorded rather than resolved.

### US-0017-0006 — a workflow-hygiene lint lane that pull requests actually run: ❌

The shipped orchestrator does not invoke `check-workflow-hygiene` at all — measured, zero
occurrences. The lane exists and runs in the own tree's `ci:lint`; it was never wired into the
adopter's set.

The E2E test asserts the precondition instead: the shipped orchestrator triggers on `pull_request`,
so a lane added there would run rather than sitting in an aggregate nobody invokes — the failure
`BR-0017-0041` names. Asserting the absence was rejected deliberately: a test pinning "no hygiene
lane is invoked" fails the day someone correctly adds one.

### US-0017-0007 — runner parallelism derived from QFAI's own workload: ❌

No knob file ships. `vitest.knobs.ts` exists in `packages/qfai/` and is not part of the init asset
tree, so an adopter receives no declared worker or file-parallelism setting. `TDD-0060`, `TDD-0061`
and `TDD-0068` are `refactor` against the own tree only.

`Oracle strength` is `❌` here rather than `⚠️`: the E2E test can only assert that the adopter
receives a configuration file the runner reads, and that assertion would hold for a project with no
knobs in it at all. It is a precondition, not evidence of the story.

### US-0017-0008 — retire the duplicate validate workflow without weakening the required check: ❌

`qfai-validate.yml` still ships. The own tree retired its duplicate and folded the full-profile run
into `build`; the adopter's set still carries both workflows.

The E2E test asserts the half that must hold either way — the validate work is reachable from a
shipped workflow — because the failure this story guards against is a workflow retired while the
check depending on it keeps its name and loses its content.

## Rows scored ⚠️ rather than ❌, and why

- **US-0017-0001** ⚠️: the detection job and the needs-map verdict both ship and both are asserted,
  with oracles (`E1`, `E3`). `State transitions` and `Combinatorial` are `❌` because the E2E surface
  reads a file — it cannot exercise a documentation-only change producing a narrow lane set, which
  needs a real run. That is what PR #794 now provides and what no test consumes.
- **US-0017-0003** ⚠️: the absence of a Node literal is asserted and is exactly what an adopter can
  check. "File-derived" — the positive half — is not established: nothing here proves the version
  comes from a file rather than from a default.

## What this matrix does not claim

No cell is scored from this repository's own workflows. Four of the nine stories are satisfied in the
shipped tree and five are not, and that split is the finding: **the "and ship it to adopters" half of
this spec is roughly half done.** It was not visible until `qfai init` was run and the result read,
which is what this stage did.
