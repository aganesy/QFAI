# Change Request

- ID: `CR-20260817-0002`
- Title: `Blob citations in per-row evidence cannot be kept current when rows share files, so the review loop does not terminate`
- Raised by: `/qfai-implement orchestrator, after fixing all 17 findings of one review round and measuring 43 in the next`
- Raised at: `2026-08-17T00:00:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`
- Blocked set: `spec-0006 TDD-0029, TDD-0030, TDD-0032, TDD-0033, TDD-0038, TDD-0039`

## The measurement

Round 1 of the spec-0006 review closure returned **17** blocking findings across six rows, every one a
record defect and not one a code defect. All 17 were fixed. Round 2, on the same six rows, returned
**43**.

The count did not grow because the rows got worse. It grew for three reasons, and they are separable:

| Kind                              | Count | What it is                                                                                                                                                                           |
| --------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First-audit                       |    29 | `TDD-0033` and `TDD-0038` had never been substantively reviewed — initial measurements, not regressions. `TDD-0038` carries **no `Revision` field anywhere** while five siblings do. |
| Caused by the round-1 repairs     |     9 | The corrections themselves were defective, in the class they corrected.                                                                                                              |
| Structurally unfixable by editing |     5 | Oracle-proof needles that no longer exist in the source at all.                                                                                                                      |

The nine are the finding. Three of them, measured:

- A currency note written in round 1 said production `workflowsIntegrity.ts` was `bad123d7` at HEAD
  "moved by three later commits". Measured: `git log --oneline c181c0e5..HEAD` on that path returns
  **six**. A derived count, written by hand, was wrong.
- Another note flagged two of the three blobs its `Revision` field anchors and **silently left the
  third**, which had also moved.
- The `### TDD-0039` section authored at `3a9250bf` was staled by `05b35ba4` — **the very next commit** —
  three claims over. Measured: `spec0006WorkflowsIntegrity.unresolvedPackaged.test.ts` is `d30fe881` at
  `3a9250bf` and `f362a1bd` at `05b35ba4`. That commit was a two-word comment fix in a _sibling's_ stale
  count.

## Why it does not terminate, stated as a mechanism rather than a complaint

Six rows of this slice share **three** test files and **two** production modules:

```text
drift.test.ts              TDD-0029, TDD-0030
repairText.test.ts         TDD-0032
provenanceGate.test.ts     TDD-0033, TDD-0038
unresolvedPackaged.test.ts TDD-0039
core/doctor.ts             all six read it
core/doctor/workflowsIntegrity.ts   all six read it
```

The per-item evidence contract requires a `Revision` per round block, and this slice's practice — not the
contract's requirement — added **blob citations** alongside: test-file blobs, production blobs, mutation
base and mutant blobs.

A blob is **derived state**. `git rev-parse <rev>:<path>` determines it from the revision. Writing it
down duplicates information the revision already fixes, and a duplicate can diverge from its source.

In a shared-file slice it _must_ diverge. Any commit touching a shared file changes that blob for **every
row that cites it**, including rows the commit has nothing to do with. So:

- a row's own landing commit re-stales its siblings' citations;
- a repair to one row's record re-stales the others';
- and a repair to a _comment_ re-stales sections written one commit earlier.

Round 1's repair landed in eight commits. Each invalidated citations written by the one before. That is
not a lapse in care — it is the arithmetic of the practice.

## What this is not

Not a claim that the findings are wrong. All 43 are precise and reproducible; the reviewers measured
things the orchestrator had asserted. Not a claim that record accuracy is too expensive: the 29
first-audit findings are real gaps that needed finding, and `TDD-0038` having no `Revision` at all is
exactly the kind of thing this rigour exists to catch.

The claim is narrower: **the blob-citation practice generates defects faster than they can be repaired,
and it generates them mechanically.**

## Options (at least 3) and recommendation

### Option A — record the revision, derive the blob (recommended)

Per-row evidence records `Revision: <sha>` and stops enumerating blobs in prose. Where a specific blob
matters — a mutation's base, say — it is written **with the revision that determines it**
(`base = <rev>:<path>`), so the citation cannot diverge: it is a pointer, not a copy.

Cost: an auditor reproducing a mutation runs one `git rev-parse` instead of reading a hex string. That is
the entire cost, and it buys the elimination of a whole defect class. Mutant blobs — which never enter the
object database and are joinable only as base + needle — keep their literal hashes, because there is no
revision that determines them; the standing brief's rule on recording mutations by needle text is
unchanged.

### Option B — keep blob citations, but generate them mechanically

A script regenerates every blob citation in the evidence file at the row's `done` commit, so they cannot
drift by hand. Cost: a new tool to write and maintain, and it must parse prose to find the citations —
which is the fragile part. It also does not remove the churn; it automates keeping up with it.

### Option C — freeze-then-record: land a shared-file group's rows in one commit

Accept the citations, and require that all rows sharing a file reach `done` in the **same commit** as the
anchors that describe them, since any later commit re-stales them. Cost: it forbids incremental closure of
a shared-file group — six rows must land together or not at all — and it does nothing for the next slice
that touches those files.

**Recommendation: A**, with C as the landing discipline for the work already in flight regardless of which
option is chosen. B automates the symptom. A removes the cause, and it does so by deleting written
information rather than adding machinery, which is the direction that reduces surface area.

## Blocked downstream items

All six rows. They cannot all be simultaneously current under the present practice unless they close in
one commit, which is Option C.

| Item               | Kind | Why it depends on the artifact                                                     |
| ------------------ | ---- | ---------------------------------------------------------------------------------- |
| spec-0006 TDD-0029 | row  | its citations re-stale whenever a sibling touches `drift.test.ts`                  |
| spec-0006 TDD-0030 | row  | shares `drift.test.ts` with TDD-0029                                               |
| spec-0006 TDD-0032 | row  | its file moved three times under sibling work discharging a cross-row precondition |
| spec-0006 TDD-0033 | row  | shares `provenanceGate.test.ts` with TDD-0038                                      |
| spec-0006 TDD-0038 | row  | shares `provenanceGate.test.ts` with TDD-0033                                      |
| spec-0006 TDD-0039 | row  | its section was staled by the next commit after it was written                     |

## Impact scope

- Shipped asset under Option A: the per-item evidence contract in
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md` and
  `references/evidence-revision.md`, plus their root mirrors. Inside the distributed surface.
- Production: none under A or C. Option B adds a tool.
- Specs: none. Ledger rows: none reset — this changes how a row is _recorded_, not what it obliges.
- Adopter-visible: yes under A — it changes what the evidence contract asks adopters to write.

## Decision needed from user

Choose A, B or C, and say whether the six in-flight rows should land under C (one commit) regardless.
Nothing about the rows' correctness is in question: production is unchanged, every row is green at HEAD,
and both reviewers have said in two rounds that the test code needs no change.

## Approved actions (owner skill rerun plan)

Mode: **`confirm-only`** for the decision. Under Option A the contract edit is a `/qfai-sdd`-adjacent
shipped-asset change; the in-flight record repair is `/qfai-implement`'s.

1. Under A: amend the per-item evidence contract to record revisions and derive blobs, mirror it, and add
   coverage pinning the new wording.
2. Repair the six rows' records once, atomically, writing every anchor in the commit that closes them.
3. Re-derive the five structurally-broken oracle needles against the current source, naming for each
   whether the mutation is still site-local — `2e0016e7` extracted `WORKFLOWS_INTEGRITY_TITLE`, so two of
   them now move three emission sites at once and are no longer the mutation they were.
4. Fill this CR's `Status`, `Approved option`, `Approved by/at`, `Applied at` and `## Resolution`.

## Resolution

Pending.
