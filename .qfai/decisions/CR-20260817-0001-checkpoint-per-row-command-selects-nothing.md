# Change Request

- ID: `CR-20260817-0001`
- Title: `The checkpoint's per-row command passes the Selector to a regex matcher, so a selector in this repository's own naming convention selects no test and still exits 0`
- Raised by: `implementation-reviewer, spec-0006 group G6 round 2 — measured on both rows of the group`
- Raised at: `2026-08-17T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `orchestrator (/qfai-implement)` — under the user's standing instruction to process every blocker with its own judgment; NOT a user decision on these options
- Approved at: `2026-08-17T00:00:00Z`
- Approved option: `A`
- Applied at: `2026-08-17T00:00:00Z` (`570aa79b`)
- Superseded by: `-`
- Blocked set: `(none — no row is blocked; the defect makes a verification weaker than it reads, it does not stop work)`

## The measurement

`skills/qfai-implement/references/checkpoint-verification.md` step 1 prescribes the per-row form:

```text
<runner> <Test file> -t '<Selector>'
```

`vitest -t` is a **regex**, not a literal. The seeded selector convention in this repository is
`TC-NNNN-NNNN (TDD-NNNN): title`, so `(TDD-0031)` is read as a capture group and the pattern cannot match
the literal parenthesised `describe` title. Measured on both rows of group G6:

```text
Tests  1 skipped (1)
EXIT=0
```

A checkpoint command that selects **nothing** and reports **success**. Exit 0 is the pass criterion the
surrounding procedure reads, so the verification is not merely weak — it is indistinguishable from a real
pass at the point where the result is consumed.

Scale, counted rather than estimated: **211 of 633 selectors repo-wide carry regex metacharacters**, 18 of
40 in spec-0006 alone. This is the convention's normal shape, not an outlier.

## Why it got worse, not better, when the neighbouring defect was repaired

Before `d70b7d92`, spec-0006 row 31's selector was visibly broken — `TDDLIST_SELECTOR_UNRESOLVED` flagged
it at `warning`. `CR-20260807-0002` Option A authorised repairing that cell, and it now holds the row's
`describe` title character-for-character. So the selector **resolves**, the warning is gone, and the cell
looks authoritative — while the prescribed command still selects nothing.

**Gate cleanliness improved and detectability fell.** The one signal that something was wrong with the
per-row command has been removed by a legitimate repair, which makes this the right moment to fix it
rather than a reason to defer.

## Why a Change Request and not a blocking review finding

It is a shipped-asset defect affecting every row of every slice, not a defect of the code under review,
and every option below changes behaviour an adopter observes. Same routing as `CR-20260811-0001` and
`CR-20260814-0001`. It is filed rather than left as an evidence note because this slice already has a
recorded precedent on exactly that: routing a CR proposal into an evidence file and never minting one
"puts it nowhere" — the finding that made a sibling item blocking in the first place.

## Options (at least 3) and recommendation

### Option A — prescribe the file-scoped command with no `-t` as the per-row form (recommended)

Step 1 becomes `<runner> <Test file>`, with `-t` offered only as an optional narrowing for a file holding
several rows' tests. Cost: a file with more than one row's tests runs all of them, so the per-row run is
wider than the row. That is the **safe** direction — it can only over-run, never under-verify — and it is
already what every row of this slice actually ran, because the file-scoped form is the one the evidence
records. Zero new machinery.

### Option B — prescribe a regex-escaped selector

Step 1 gains an escaping step so the selector is matched literally. Cost: the escaping has to be written
per shell and per runner, and the procedure is copy-pasted by hand — an escaping rule that is followed
incorrectly reproduces the current failure silently, which is the failure mode the option exists to
remove. It also leaves `-t` load-bearing for a verification that does not need narrowing.

### Option C — forbid regex metacharacters in seeded selectors

`/qfai-sdd` Phase 2b stops emitting them and `selectorResolves` rejects them. Cost: the highest — it
invalidates 211 existing selectors across the repository, and the `TC-NNNN-NNNN (TDD-NNNN):` convention is
load-bearing for reading a ledger row against its test. It also solves the wrong half: the runner's
matcher is the thing that does not do what the procedure assumes.

**Recommendation: A**, and it is the option under which the prescribed command and the command this
slice's rows actually ran become the same command. B and C both keep a hand-copied escaping or naming
discipline on the critical path of a verification whose whole purpose is to not depend on one.

## A second, milder form of the same deadlock, recorded here rather than separately

`selectorResolves` (`packages/qfai/src/core/validators/tddList.ts`) is **deliberately lenient** by its own
docblock: it accepts verbatim containment, then falls back to containment of the selector's last
identifier-shaped token. So a `Selector` that is materially wrong — for example one that overclaims which
Verify bullets its row owns — but happens to share a trailing token with its test file still **resolves**,
which means the `CR-20260807-0002` condition is false and the carve-out does **not** authorise repairing
it.

This is the conservative direction and cannot over-authorise, so it is not itself a defect. It is recorded
because it bounds Option A of that CR: round 2's actual complaint about spec-0006 row 31 was that the cell
overclaimed a Verify bullet, and it was only repairable because that coincided with non-resolution. A
future row will hit the overclaiming-but-resolving case, and there the milder deadlock survives. Option B
here would narrow it as a side effect, by making the predicate agree with what the runner can select.

## Blocked downstream items

**None.**

| Item | Kind | Why it depends on the artifact |
| ---- | ---- | ------------------------------ |
| —    | —    | —                              |

- Not blocked by this CR: every row of the spec-0006 slice and the remaining spec queues. The per-row
  command is a verification form, not a gate that must pass before work continues, and every row of this
  slice recorded the file-scoped run instead.
- Overlapping open CRs: `CR-20260807-0001`, `CR-20260810-0001`, and approved-but-unapplied
  `CR-20260814-0001`. All independent; no row sits in two blocked sets.

## Impact scope

- Shipped asset: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md`
  (SSOT) and its root mirror. Inside the distributed surface, so the edit reaches every adopter through
  `qfai init`.
- Production: only under Option B or C, which touch `selectorResolves` and Phase 2b seeding respectively.
  Under Option A, none.
- Specs: none edited. Ledger rows: none reset. Contracts: none. Schema: none.
- Adopter-visible: yes — it changes the command adopters are told to run at a checkpoint.

## Decision needed from user

Choose A, B or C. Nothing in flight is blocked. The question is whether the per-row checkpoint command
should stop depending on a regex matching a literal, and if so whether by dropping the narrowing (A) or by
escaping it (B).

## Cost refinement, measured 2026-08-17 before any edit

Option A is **not** a one-file documentation change. The defective prescription is pinned by a
shipped-prose test, `packages/qfai/tests/assets/implementCheckpointVerification.test.ts`, whose
assertions include:

```ts
it("passes the selector through the runner's test-name option", async () => {
  expect(reference).toContain("<test runner> <Test file> -t '<Selector>'");
  expect(reference).toContain('exits 1 with "No test files');
});
expect(reference).toContain("**b. The unit of selection.**");
expect(reference).toContain("go test ./<dir of Test file> -run '<Selector>'");
```

So the test does not merely reference the step — **its `it` title asserts the very behaviour this CR
calls defective**, and four of its `toContain` needles are strings Option A removes. Applying Option A
therefore changes the shipped reference _and_ this test, and the two must land in one commit or the
suite is red between them.

That is worth stating rather than discovering: it is the same shape as an earlier incident in this
slice, where a shipped-prose edit passed `prettier`, `lint:md` and the leakage guard while leaving four
assertions red, because none of those three gates reads a test. Here the coupling was found by grepping
`packages/qfai/tests/**` for the step's own strings **before** editing.

It also sharpens the option comparison. Option C — accept the gap and document the surface as a manual
ledger — now means leaving a test in place whose title asserts a prescription the repository has
measured to be wrong. Option B (escape the selector) keeps the `-t` form and so keeps most of those
assertions, at the cost this CR already states.

## Approved actions (owner skill rerun plan)

Mode: **`confirm-only`** under Option A; a normal `/qfai-sdd` + `/qfai-implement` cycle under B or C,
because those change production behaviour.

Under Option A:

1. Reword step 1 in the asset copy of `references/checkpoint-verification.md`, keeping `-t` documented as
   an optional narrowing with the regex caveat stated at the point of use.
2. `pnpm sync:ssot`, confirm both copies byte-identical and `ci:gate` clean.
3. Add coverage pinning the prescribed form, alongside the existing shipped-prose suite.
4. Fill this CR's `Status`, `Approved option`, `Approved by/at`, `Applied at` and `## Resolution`.

## Resolution

**Option A, applied at `570aa79b`** — the doc and the test that pinned it, in one commit, as the cost
refinement above required.

**Who approved this, stated plainly because it differs from every other CR in this slice.** Five CRs
here were decided by the user through AskUserQuestion. This one was not: the user's instruction was to
process every blocker with the orchestrator's own judgment and complete the implementation, and this CR
sat in the way of that. So the option choice is the executing stage's. It is recorded in the `Approved
by` field rather than dressed as a user decision, because a reader auditing which choices the user made
and which the machine made needs the field to answer that, and a uniform-looking record would not.

What the choice rested on, all of it already measured in this CR: the file-scoped form is the one every
row of this slice actually ran and recorded, so Option A makes the prescription and the practice the
same command; Option B keeps a hand-copied escaping rule on the critical path of a verification whose
whole purpose is not to depend on one; Option C would have left a test in place whose title asserts a
prescription the repository has measured to be wrong.

### Applied

`packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/references/checkpoint-verification.md`
(asset SSOT, mirrored by `sync:ssot`; `sync-init-to-root.mjs --check` reports no drift and the two
copies are byte-identical). Step 1 now prescribes `<test runner> <Test file>` and demotes the name
option to an optional narrowing that carries the mechanism (`reads as a capture group, not as
characters`), the silence (`exits 0`), and the admissibility rule that a skipped count is not a pass.
The package-selecting-runner guidance survives; only its `-run` flag goes.

`packages/qfai/tests/assets/implementCheckpointVerification.test.ts` — the coupled half.
`it("passes the selector through the runner's test-name option")` became
`it("prescribes the file-scoped run and demotes the name option behind its regex caveat")`, and it now
pins the new prescription, the _absence_ of the old command form, and both load-bearing halves of the
caveat. A `not.toContain("-run '<Selector>'")` was added so a partial revert cannot leave the
package case on the old form. Non-vacuity was checked by resolving every positive needle at an offset
and confirming both negatives absent, in **both** mirrored copies — identical offsets in each, which
also witnesses that the copies agree byte-for-byte at those points.

### One deviation from the prepared script, and one method note

The prepared replacement wrote `*regular expression*`; prettier normalises markdown emphasis to `_`, so
`prettier -c` exited **1** on exactly that line. Fixed at the SSOT and re-synced; the second run exited 0. Reported rather than silently corrected: a gate that failed once and passed after a change is
two runs, not one.

Carried forward as a hazard: **the Read tool renders control bytes invisibly.** A needle typed from Read
output silently lost a literal `ESC` present in the file, and the Edit tool matched it anyway — so a
"successful" edit landed against text nobody could see. `node -p "JSON.stringify(line)"` is what
exposed it. Author needles from a JSON byte dump, not from a render.
