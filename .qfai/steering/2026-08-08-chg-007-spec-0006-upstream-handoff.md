---
id: 2026-08-08-chg-007-spec-0006-upstream-handoff
status: active
kind: handoff
created: 2026-08-08
updated: 2026-08-08
scope: spec-0006
blocking: false
promote-to: null
links:
  - spec-0006
  - spec-0003
  - CR-20260807-0001
  - CR-20260807-0002
---

# CHG-007 spec-0006 — the upstream items this slice found and cannot fix

Written because two reviewers made the same demand twice, in the same words: the routed items and their
reasons live only in `.qfai/evidence/implement-spec-0006.md` and in reviewer prose, both of which are
**gitignored**, so "routed upstream" was unverifiable from version control. This entry is the handle.
Every item below is a measurement made during the slice, not a hypothesis, and none of them is
dischargeable by `/qfai-implement`.

## 1. `qfai-doctor.md` is stale in three ways, in one file

Owner: `/qfai-sdd --contract`. Non-blocking; three items to fix in one pass so `TDD-0037` inherits a
resolved contract instead of adjudicating one from an implementation row.

- **`:10-11` claims `core/doctor.ts` is a "single-file module — there is no `core/doctor/` directory".**
  That directory holds **five** modules: `autoremediate.ts`, `cleanReviewPacks.ts`,
  `skillManifestProbe.ts`, `staleTtl.ts`, `workflowsIntegrity.ts`. The claim predates CHG-007; the
  `workflowsIntegrity.ts` omission dates to TDD-0029.
- **The file's SSOT-module list omits `core/doctor/workflowsIntegrity.ts` and
  `core/doctor/skillManifestProbe.ts`**, even though `workflows.integrity` is the section it documents.
  Re-derive the list against all five modules, not just the two named here.
- **The emission table reads per-name**, so a declined-only tree emitting **one aggregate `ok` with zero
  `installed` names** is reconcilable only under an aggregate reading. Decide which reading is normative.

## 2. BR-0006-0018's newline-normalization clause is unfalsifiable by any test in the repository

Owner: `/qfai-sdd` Phase 2b (row seeding), then `/qfai-atdd`. Non-blocking.

Measured twice, once at row scope and once at closure scope: reducing `normalizeNewlines` to
`return text;` in `src/shared/text.ts` reddens **nothing**, including the full 18-selector closure. The
cause is structural, not an omission — `TC-0006-0028`'s Setup is 「TC-0006-0027 の手編集を戻し」, which
yields **byte-identical** files, and a byte-identical fixture answers identically under a
newline-normalized digest basis and a raw-byte one.

Closing it needs a **new TC with a line-endings-only fixture** (read the installed file,
`.replace(/\r\n/g,"\n").replace(/\n/g,"\r\n")`, write it back, assert no finding). That is additive, so
row-seeding rather than a Change Request. Writing the assertion from the implementation stage would be a
reviewer-originated hard obligation, which the drift protocol forbids — which is why it is here and not
in a test.

## 3. The contracts state a raw-byte digest basis where BR-0006-0018 requires a normalized one

Owner: `/qfai-sdd --contract`. Non-blocking; the code follows the business rule.

`shipped-workflows.md:117-118` keys its state table on `bytes == packaged` / `bytes != packaged`, and
`qfai-doctor.md:108` says "whose **bytes** differ". Neither file contains a `normaliz` / `CRLF` / 改行
token. So the normalized basis is attributable to **BR-0006-0018 alone**, and the contracts state the
opposite — a documented contradiction, not a silence. Recorded in the reader's header at
`src/core/doctor/workflowsIntegrity.ts`.

Related and distinct: `src/shared/provenance.ts` documents a recorded name that is present on disk with
no packaged digest as `modified` ("the conservative direction"), while BR-0006-0018 excludes the `extra`
bucket from drift. The code follows BR-0006-0018 and a named assertion in
`spec0006WorkflowsIntegrity.drift.test.ts` guards that side, so **if this is resolved the other way, that
row's test changes with it** — the difference between a documentation fix and a certified-row reset.

## 4. `TC-0006-0031`'s third Assert clause has no parent AC

Owner: `/qfai-sdd`. Non-blocking; settled as an `equivalent-mutant`, not an open question.

The clause requires the exit code to stay unchanged. `TC-0006-0031`'s `AC-Refs` is `AC-0006-0024` alone,
whose Gherkin has three clauses and **none is about the exit code**. Asserting it in TDD-0033 is a
provable equivalent mutant: the finding is `info`, `shouldFailDoctor` reads `warning + error` only, so
the exit code does not move even under the mutation that removes the provenance gate — and a fresh
`runInit` tree carries unrelated warnings, so `--fail-on warning` exits 1 for reasons the row does not
own. Exit-code invariance runs BR-0006-0019 / BR-0006-0021 → AC-0006-0022 / AC-0006-0025 → TDD-0031 and
TDD-0034 / TDD-0035.

## 5. `AC-0006-0022`'s `qfai validate` silence clause has no TC

Owner: `/qfai-sdd`. Non-blocking; vacuously satisfied.

The clause requires `qfai validate` to emit no finding for this drift. Nothing under
`src/core/validators/**` references `.github/workflows`, so no mutation inside owned code can red it —
the `equivalent-mutant` case. No ledger row was opened for it, deliberately: a row whose oracle cannot
fail is worse than a recorded gap.

## 6. `US-0006-0011` has no `Layer = E2E` row

Owner: `/qfai-sdd` Phase 2b, then `/qfai-atdd`. **This is why spec-0006 cannot close COMPLETE.**

`QFAI-ATDD-111` names it. Creating the row from this stage would mint a new obligation ID with no `TC-*`
parent, and appending the annotation without the test would discharge a hard gate while nothing verifies
the story. Identical in shape and reason to spec-0003's eight `US-0003-0021..0028`.

## 7. Two open Change Requests, both raised by this slice

- **`CR-20260807-0001`** — the checkpoint step-4 pass criterion. `checkpoint-verification.md` makes any
  non-zero exit a FAIL and keeps the item at `refactor`; step 4 exits 1 on two errors no row in this
  slice can discharge. **This is the sole blocker on `done` for TDD-0029, TDD-0030 and TDD-0033**, all
  three of which have every required reviewer reported PASS. The owner correction matters: the reference
  it changes is mirrored from `packages/qfai/assets/init/**`, so Option A is a **package** change, not a
  `/qfai-sdd` rerun.
- **`CR-20260807-0002`** — widen the ledger carve-out from three cells to five, disclosing this slice's
  `Test file` / `Selector` writes, which are compelled by two validators and not authorised by the
  whitelist. Blocks nothing.

## 8. Re-derive G5's tiering before TDD-0038 + TDD-0039 are reviewed as a group

Owner: `delivery-planner`. Non-blocking, but it must happen before that group's review.

By the planner's own criterion — criticality turns on contract and public-JSON surface — TDD-0030
adding a new check to the doctor JSON surface looks like **T2**, the tier its sibling TDD-0029 received
for the same act. No ceremony deficit arose (G2 was a singleton and received T2 ceremony de facto), but
G5 plans TDD-0038 + TDD-0039 as a **grouped T1 pair** and TDD-0039 emits another new severity into the
same surface.

## 9. Carried to TDD-0037's work order

- A declined-only tree currently emits **"installed shipped workflow(s) match the packaged copy"** when
  no installed file exists at all. `TC-0006-0035` requires severity `ok` and does not constrain the
  message, so this is not a defect against a current obligation — but that row must decide whether the
  wording is honest, and it pairs with item 1's third bullet.
- An acceptance criterion for that row's oracle: it must **kill the on-disk-present-count mutant**
  (replace `comparedCount: recordedNames.length` with a count of recorded names present on disk). Today
  that mutant leaves the whole drift file green while emitting **zero** checks on a declined-only tree,
  which `TC-0006-0035` forbids. The window is open from now until G9.
- The `else`-versus-`else if` successor mutant: dropping the **status** test while keeping the count
  leaves the file green. Equivalent today because `skipped_unresolved ⇒ comparedCount = 0`, and
  non-equivalent exactly when a `declined`-derived status breaks that biconditional — which the
  registration site's comment already anticipates. Owned by TDD-0039.
