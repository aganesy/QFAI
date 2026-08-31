# R02 — completion-reviewer

**Result: REVISE**

- Reviewer: `completion-reviewer`
- Stage: `/qfai-implement` (spec-0017, CHG-007 run), round 5
- **Reviewed revision: `90a33ee5`.** `git status --porcelain` was empty at start and at every
  measurement. The request named `bc36f08c`; HEAD moved to `90a33ee5` during the review and the only
  delta is the addition of this pack's `review_request.md` (`git diff --stat bc36f08c HEAD` = 1 file,
  63 insertions). Every artifact under review is byte-identical between the two, so all measurements
  hold at either. Discrepancy disclosed by the orchestrator; not a finding.
- Mutations applied: **none.** Scratch files under `tmp/r02/` only.
- Scope: Completion Contract, per-item evidence contract, Drift Protocol, `catalog/test-layers.md`
  alignment, the round-4 findings B1-B8, and the five additional questions in the request.

## Verdict summary

Ten blocking findings. The decisive one is **BL-1**: B7 is not discharged. `TDD-0012` still claims a
file-scoped RED it was not part of, and the rework's own commit message explicitly dismissed the
reasoning that finds it. Six of the ten are rework-introduced or rework-adjacent; four are standing
contract gaps in the evidence record that no round has closed.

Substantial credit is due: **B4, B5 and B6 are fully discharged and I verified them mechanically**,
the cross-spec detection is complete, the drift-protocol cell discipline is clean, and `TDD-0065` is
sound including its arithmetic. Details under *Verified clean*.

## Blocking findings

### BL-1 — B7 is not discharged: `TDD-0012` claims a RED it was not part of

- **Artifact**: `.qfai/specs/spec-0017/tdd/test-list.md:50` — the `TDD-0012` `Evidence` cell.
- **Clause**: 12-point gate item 3
  (`qfai-implement/SKILL.md#item-completion-checklist-12-point-gate`); the exclusive-alternative rule
  in `references/red-not-observable.md` (exactly one form is present, never both and never neither).
- **Severity**: Blocking. **Traces to**: `defect:correctness` +
  `SKILL.md#item-completion-checklist-12-point-gate` item 3.

**How established** — three independent measurements; no rerun of the seam required.

1. Describe / `it` census at change 8's revision:
   `git show 2a3ef61c:packages/qfai/tests/scripts/ownWorkflowTopology.test.ts` gives **19 top-level
   `describe`s and 19 `it()`s** — exactly one `it` per describe. At the change-8 base `9aced5bb` the
   same file held **12 / 12**, and change 7's recorded GREEN was `12 passed (12)`.
2. The recorded change-8 RED is `Tests 6 failed | 13 passed (19)`. So `13 passed` = the 12
   pre-existing rows plus **exactly one** of the seven new rows (`TDD-0006` through `TDD-0012`). Six
   failures cannot redden seven single-`it` describes.
3. Which one: `git show 9aced5bb:.github/workflows/ci.yml` shows the `lint` job and the `build` job
   (`REQUIRED_CONTEXT_JOB`) carrying **neither an `if` nor a `needs`**. The change-8 seam adds only
   the `detect` job (its two outputs, the checkout, and a step whose quoted heredoc contains one
   comment and no code), so those two jobs are unchanged from `9aced5bb`. The four assertions of
   `TDD-0012` are exactly: `lint["if"]` is undefined, `needsOf(lint)` excludes `detect`,
   `build["if"]` is undefined, `needsOf(build)` equals the empty array — **all four hold against the
   seam.** The other six fail: `TDD-0006` and `TDD-0007` on the derived-condition claims, and
   `TDD-0008` / `0009` / `0010` / `0011` because a comment-only heredoc writes no `full=` line to
   `GITHUB_OUTPUT`, so `result.full` is `null` and each `toBe(false)` / `toBe(true)` fails. That is
   6 failures and 1 pass — the recorded numbers, exactly.

**The reasoning the rework rejected is valid in the direction that matters.** Commit `e4a7295c`
says: *change 8 has seven rows and reported six failures, so one row apparently passed. That test is
invalid — a row is a `describe` and may hold several `it()`s.* That refutes only the converse (six
failures need not mean six rows failed). Six failing test cases belong to **at most six** describes,
so with seven rows at least one had zero failures — and in this file at that revision no describe
held more than one `it()`, so the bound is exact rather than suggestive. The stated sound test (*the
evidence says the row passed while the cell quotes a failing RED*) cannot find `TDD-0012`, because
change 8's block records only the aggregate and no per-row attribution — unlike changes 3 and 4,
which each name the row that passed (*`TDD-0031` passed at RED, structurally*).

`TDD-0012` is the same class the rework did identify for `TDD-0055` / `0056` and `TDD-0078` through
`0082`: a pure accepting / invariant claim over pre-existing shape.

**Rework**

1. Give `TDD-0012` the falsifiability form: `Satisfied-by` (the pre-existing `lint` and `build` jobs,
   which already carried no condition and, for `build`, an empty `needs`), `Falsifiability command`,
   `Falsifiability result` (oracles `R3` / `R4` / `R5` already exist and redden it), and
   `RED failure mode falsifiability`. Remove the `RED 6 failed / 13 passed (19)` claim.
2. Add per-row RED attribution to change 8's block, in the form changes 3 and 4 already use.
3. Adopt the pigeonhole bound as a standing check: for every block, failures must be at least the
   number of rows claiming a numeric RED. I applied it to all 17 blocks and **change 8 is the only
   violation** — see *Verified clean* item 4.

### BL-2 — no implement-stage review pack exists for spec-0017 rounds 1-4

- **Artifact**: `.qfai/review/`. The only spec-0017 **implement** pack is
  `review-20260820140000000/`, and it holds `review_request.md` alone.
  `review-20260805082718000/` is the `/qfai-sdd`-stage pack.
- **Clause**: `SKILL.md#review-artifact-layout-must` — reviewer verdicts must be written to a review
  pack, not left in conversation; each review round creates a new pack.
- **How established**: `grep -l spec-0017 .qfai/review/review-*/review_request.md` returns two packs,
  the earlier one `Stage: /qfai-sdd`. A `find` for `attempt-*` directories under `.qfai/review` is
  empty, so this is not the forbidden nested layout either. No `R0*.md` under `.qfai/review/**` cites
  `0cd866e9` or any of B1-B8; the string `0cd866e9` occurs in exactly one file, this round's
  `review_request.md`.
- **Consequence for this audit**: I audited the rework against the *review request's summary* of
  B1-B8, not the round-4 verdicts. That summary is itself imprecise in three places I could check
  (13 falsifiability rows, actually 20; `QFAI-ATDD-112` population 9, actually 8; all 12 CRs, but
  `CR-20260811-0001` has no `Approved actions` section), which is what makes the missing packs
  material rather than procedural.
- **Severity**: Blocking. **Traces to**: `SKILL.md#review-artifact-layout-must`.

### BL-3 — six CR-blocked rows sit at `todo` with the blocker in `DR-ID`, the one column the ledger reference forbids for it

- **Artifact**: ledger rows `TDD-0016` (:54), `TDD-0030` (:68), `TDD-0032` through `TDD-0035`
  (:70-73).
- **Clause**: `references/execution-ledger.md#status-lifecycle` — *`todo` -> `blocked` (the row cannot
  be started: an upstream defect, **an unresolved Change Request**, or an unfinished row in another
  spec). Name the blocker in `Blocked-By`*; `#obligation-columns` — *`DR-ID` is **not** widened to
  carry it: that column is what distinguishes a parked `exception` from a row that never started, and
  overloading it would merge the two states the `blocked` status exists to separate*;
  `#blocked-rows` — *`blocked` is **not** selectable. Phase Red picks the first `todo` row and skips
  `blocked` ones, so the loop head stops re-issuing rows that cannot proceed.*
- **How established**: read the six cells and the reference; confirmed each CR's reciprocal
  `Blocked set`. The `bc36f08c` message reasons **only** from the drift-protocol carve-out — *Both
  cells are inside the drift protocol's unconditional carve-out, `DR-ID` and `Evidence` ... Status
  stays `todo` for all eight* — and never engages the `blocked` status or the `DR-ID` prohibition. The
  evidence record mentions neither: grep for `Blocked-By` and for a `blocked` status over
  `.qfai/evidence/implement-spec-0017.md` returns zero. So the reasoning exists only in a commit
  message, and it addresses the wrong rule.
- **The consequence is operational, not cosmetic**: at `todo`, Phase Red step 1 selects `TDD-0016`
  first on the next run and re-derives a blocker somebody already established — the precise failure
  `#blocked-rows` exists to stop.
- **The remedy is available**: the `TDDLIST_BLOCKED_MISSING_REF` remediation text
  (`packages/qfai/src/core/validators/tddList.ts:815`) is *Add it and name the blocker*, and
  `Blocked-By` carries no obligation identity, so it is not one of the columns (`TC-Refs`, `Layer`,
  `US-Refs`, `CON-API-Refs`) the drift protocol reserves upstream.
- **`TDD-0069` and `TDD-0070` are a different case** and are **not** part of this finding: their
  blocker (three consecutive green `ci-pass` runs that do not exist yet) matches none of the three
  value shapes `Blocked-By` accepts. Raised as advisory A1.
- **Severity**: Blocking. **Traces to**:
  `references/execution-ledger.md#obligation-columns-optional-required-by-layer`,
  `#status-lifecycle`, `#blocked-rows`.

### BL-4 — the `CR-20260820-0007` `Blocked set` omits the five `refactor` rows that read the disputed artifact

- **Artifact**:
  `.qfai/decisions/CR-20260820-0007-implement-rows-assert-over-a-decision-record-implement-may-not-write.md:14`
  — `Blocked set: spec-0017 TDD-0032, TDD-0033, TDD-0034, TDD-0035`.
- **Clause**: `drift-protocol.md#when-drift-is-detected` step 1 — *A dependent item is one whose
  `TC-Refs` / `US-Refs` / `CON-API-Refs` names an obligation the CR would change, **or whose
  implementation reads the artifact under dispute**; when the dependency is arguable, it is
  dependent*; step 2 — *This is what makes the halt checkable: a reviewer can ask whether an item
  that kept moving is on the list, and **an item not on the list is not blocked by this CR**.*
- **How established**: the CR's own section *Why it happened* tabulates `TDD-0074`, `TDD-0075`,
  `TDD-0052`, `TDD-0066` and `TDD-0067` as rows that assert over the **content** of `DR-0017-0007` /
  `0008` / `0009`, pinned as the literals `RETIREMENT_DR`, `SHIPPED_ORDER_DR` and `PARALLELISM_DR`.
  Its own Approved-actions step 2 says that under option 2 *every one of them stops being satisfiable
  and none may stay at `refactor`*. All five are at `refactor` today and none is on the blocked set,
  so as written they may proceed to `done` against records whose authority is under dispute.
- **Severity**: Blocking. **Traces to**: `drift-protocol.md#when-drift-is-detected` steps 1-2.

### BL-5 — the `CR-20260820-0006` rerun plan enumerates 13 rows for a population of 20, and its cross-check would fail on a compliant tree

- **Artifact**:
  `.qfai/decisions/CR-20260820-0006-falsifiability-satisfied-by-has-no-value-for-a-regression-guard.md`
  — `:14` (all thirteen rows), `:30` (eleven of this spec's thirteen), `:33-45` (an 11-row table),
  `:119-120` (a 13-row not-reset enumeration), `:125-126` (confirm thirteen cells).
- **How established**: parsed the ledger table and counted cells containing `Satisfied-by:` —
  **20**, of which **20 of 20** name a pre-existing artifact rather than a `TDD-NNNN`. Absent from
  every list in the CR: `TDD-0055`, `TDD-0056`, `TDD-0078`, `TDD-0079`, `TDD-0080`, `TDD-0081`,
  `TDD-0082` — the seven trios added by `e4a7295c`, which landed **after** `8b0bcffe` wrote the rerun
  plans. This is therefore rework-introduced staleness, and it is what item 5 of the request asks for.
- **Consequence**: step 2's stated purpose — *Enumerated for the avoidance of doubt, so a later sweep
  cannot claim these rows were in scope* — no longer holds, and its rejection branch (*the eleven rows
  whose `Satisfied-by` names an artifact must have that cell rewritten*) would silently miss seven
  rows. Step 3's cross-check asserts a count that is now wrong, so it fails on a **compliant** tree.
- **Severity**: Blocking. **Traces to**: `drift-protocol.md#when-drift-is-detected` steps 2 and 5.

### BL-6 — no CR names a rerun mode; eight name `/qfai-sdd` without one

- **Clause**: `drift-protocol.md#when-drift-is-detected` step 4 — *Mode: the CR's approved actions
  field MUST name one, `confirm-only` or `re-derive`. Without a named mode neither the author nor the
  approver can state what the rerun executes or what it costs, and rerun the owner skill is the whole
  plan.*
- **How established**: extracted every `## Approved actions` body across all 14 CRs in the
  `CR-2026081[8]*` and `CR-20260820*` series and searched for `confirm-only` or `re-derive` —
  **0 matches**. Eight open step 1 with *`/qfai-sdd` rerun scope: ...* and name no mode:
  `CR-20260818-0007`, `CR-20260820-0001`, `-0002`, `-0003`, `-0004`, `-0005`, `-0006`, `-0007`.
- **Severity**: Blocking (an explicit MUST, universally unmet). **Traces to**:
  `drift-protocol.md#when-drift-is-detected` step 4.

### BL-7 — four of the seven mandatory evidence sections are absent

- **Artifact**: `.qfai/evidence/implement-spec-0017.md`.
- **Clause**: `SKILL.md` section `Evidence (MANDATORY)`, Required sections.
- **How established**: case-insensitive grep for each required section name over the whole file —
  `Objective` 0 as a section (one unrelated prose hit at `:685`), `Items processed` 0,
  `Test results` 0, `Commands executed` 0. `Exception items` is legitimately absent: no row is at
  `exception`. `## Cross-spec obligations` is present.
- **Why it is not merely formal**: `Items processed (TDD-ID, TC-Refs, final status)` is what lets a
  reader read the 74 / 8 split without parsing the ledger, and `Commands executed` is what makes a
  2,960-line record reproducible.
- **Severity**: Blocking. **Traces to**: `SKILL.md#evidence-mandatory`.

### BL-8 — the one newly implemented row's evidence block carries no `Revision` and no `TC-ref`

- **Artifact**: `.qfai/evidence/implement-spec-0017.md:2815-2960`, the section
  *The worker-value comparison the rule asks for (TDD-0065)*.
- **Clause**: per-item evidence contract, phase-authored fields — `TC-ref` (reference to the test
  cases) and `Revision` (the state the observation was made against; one per round block), read by
  gate item 10 via `references/evidence-revision.md`.
- **How established**: the block's 8,502 characters contain neither the string `TC-0017-0065` nor
  `Base revision`. Sixteen of the seventeen per-change blocks carry a `Base revision` (`:327`,
  `:425`, `:500`, `:666`, `:829`, `:1037`, `:1225`, `:1400`, `:1509`, `:1782`, `:1905`, `:2136`,
  `:2262`, `:2406`, `:2526`, `:2654`); this one does not. The string `Revision` appears 0 times in
  the whole file.
- **Severity**: Blocking (rework-introduced, on the single row this round implemented).
  **Traces to**: `SKILL.md#per-item-evidence-contract-fresh-evidence-required`,
  `references/evidence-revision.md`.

### BL-9 — the `## Cross-spec obligations` entry omits `TDD-ID`

- **Artifact**: `.qfai/evidence/implement-spec-0017.md:45-91`.
- **Clause**: `references/cross-spec-ownership.md#the-evidence-entry` field 1 — *`TDD-ID`, the row in
  **this** spec whose work forced the change*; restated in the `SKILL.md` Required sections.
- **How established**: extracted every `TDD-*`, `TC-*` and `spec-*` id in lines 45-91 —
  `TC-0003-0038` / `0039` / `0040`, `TDD-0038` / `0039` / `0040`, `TDD-0050`, `spec-0003`,
  `spec-0017`. **No spec-0017 `TDD-NNNN`.** The section identifies the forcing work by commit
  (`dd894914`) instead, so an auditor of spec-0003 cannot map the change to an obligation in this
  spec's ledger — the field's whole purpose.
- `Resolution` is also absent, but it is verdict-shaped and cannot exist before this review returns.
  Recorded as a **sequencing note**, not part of this finding.
- **Severity**: Blocking (the `TDD-ID` half). **Traces to**:
  `references/cross-spec-ownership.md#the-evidence-entry`.

### BL-10 — a code block labelled as command output is a hand-made paraphrase

- **Artifact**: `.qfai/evidence/implement-spec-0017.md:132-142` — *Current, from
  `node scripts/check-workflow-hygiene.mjs`:* followed by a fenced block showing right-aligned counts
  5 / 1 / 1 and a `total 7` line.
- **How established**: I ran `node scripts/check-workflow-hygiene.mjs` read-only (`git status
  --porcelain` empty before and after, exit 0). The real output prints the three scope headings and
  then **each rule on its own line with its description**; it prints **no counts** and **no
  `total 7` line**. The substantive claim is exactly right — 5 + 1 + 1 = 7 rules across three scopes,
  which I confirmed — but the block is not the output it is presented as.
- **Clause**: `SKILL.md#evidence-hard-rules` (command **and** verbatim result required), and this
  record's own repeatedly stated discipline of measuring rather than asserting.
- **Severity**: Blocking-Medium. In a record whose other blocks a reviewer cannot cheaply rerun, one
  block labelled as output that is not output is the finding that devalues the rest.
- **Traces to**: `SKILL.md#evidence-hard-rules`.

## Medium findings

### M-1 — `Class: ambiguity` is not a legal drift class; and one `defect` CR carries four options

`drift-protocol.md#drift-classes` admits exactly two values, and the template's inline comment says
`intent | defect`. Six CRs use `ambiguity`: `CR-20260818-0007`, `CR-20260820-0001`, `-0002`, `-0003`,
`-0005`, `-0006`. Separately, `CR-20260820-0007` is `Class: defect` and presents **four** options,
against *options (at least 3) and recommendation — **intent drift only**; for defect drift record the
single correct fix instead*. `CR-20260817-0002` carries `Status: resolved`, outside the enum
`open | approved | rejected | superseded`, which makes it *unresolved* by the
`#spec-completion-conditions` test itself (spec-0006 scope, so it does not gate spec-0017).
Not rework-introduced. **Severity**: Medium. **Traces to**: `drift-protocol.md#drift-classes`,
`skills/qfai-sdd/templates/change-request.md`.

### M-2 — `CR-20260820-0006` names `/qfai-sdd` as owner of a package source file, contradicting its own siblings

Its step 1 reads *`/qfai-sdd` rerun scope: edit `references/red-not-observable.md` under
`packages/qfai/assets/init/**`*. The **same target class** is handled correctly by three siblings:
`CR-20260818-0004` (*Owner is the packaged asset, **not** a spec-authoring skill*), `-0005` (*Owner is
the packaged skill text*), `-0006` (*Edit the packaged copy under `packages/qfai/assets/init/**`*).
The `drift-protocol.md#when-drift-is-detected` step 4 invocation table covers only `spec-*/**`,
`_policies/**` and `.qfai/contracts/**`; `packages/qfai/assets/**` is in none of them, so no
`/qfai-sdd` invocation exists for it.

This answers the B8 question about owner naming directly: **six CRs get it right and say why it is not
`/qfai-sdd`; `CR-20260820-0006` is the one that gets it wrong.**
**Severity**: Medium. **Traces to**: `drift-protocol.md#when-drift-is-detected` step 4.

### M-3 — systemic per-item evidence field gaps

- `Refactor verify` appears **once** in the whole file (`:418`, change 2). 73 of 74 rows have no
  `Refactor verify command` / `Refactor verify result` pair, which the contract requires once per
  item. Several blocks carry a suite run that functionally serves this, so the gap is the labelled
  field rather than the verification itself.
- **20 of 74** `refactor` rows have their `TC-Refs` value cited **nowhere** in the evidence file:
  `TDD-0006`, `0012`, `0014`, `0015`, `0019`, `0021`, `0022`, `0024`, `0027`, `0028`, `0029`, `0038`,
  `0039`, `0040`, `0061`, `0068`, `0071`, `0072`, `0074`, `0075`.
- **0** occurrences of a `Round N:` prefix, which `references/round-evidence.md#single-round-items`
  requires even for a single-round item (*satisfies the contract with `Round 1: ...`*).

**Severity**: Medium. **Traces to**:
`SKILL.md#per-item-evidence-contract-fresh-evidence-required`, `references/round-evidence.md`.

### M-4 — 69 of 74 rows share a per-change block instead of having a `### TDD-NNNN` section

The `SKILL.md` Evidence section requires **one `### TDD-NNNN` section per item**, and gate item 10
requires the anchor to resolve *to a fresh **per-item** entry*. Only `TDD-0001` through `TDD-0005`
have headings; the other 69 are covered by 64 block-level `<a id="tdd-NNNN">` anchors, several
bundling seven rows onto one line. The anchors resolve (see *Verified clean* item 1) but they point at
a shared block, not a per-item entry. **This shared-block shape is the mechanism that made BL-1
possible**: change 8's block records one aggregate RED for seven rows and no per-row attribution.
**Severity**: Medium. **Traces to**: `SKILL.md#evidence-mandatory`,
`SKILL.md#item-completion-checklist-12-point-gate` item 10.

### M-5 — thirteen blocks still say step 2 blocks the checkpoint, with no pointer to the correction that retracts it

The corrections sit at `:98-121` and `:123-147`. A grep for *corrections section* returns **one** hit,
at `:2959`, inside the `TDD-0065` block. The texts the corrections are about are at `:491`, `:651`,
`:821`, `:1028`, `:1215`, `:1502`, `:1774`, `:1897`, `:2052`, `:2256`, `:2400`, `:2519`, `:2648`, and
the corrected heading (*Exactly five is now reproducible from the output*) is at `:2277`. A reader
arriving at any of those via a ledger anchor never learns the statement was retracted. The pattern for
fixing this already exists in the file at `:2959`; it was not applied backwards.
**Severity**: Medium. **Traces to**: `SKILL.md#evidence-hard-rules`.

## Answers to the five questions asked

### 1. The falsifiability rows and their trio, and whether they belong at `refactor`

All rows carrying a trio carry a **complete** one — `Satisfied-by`, `Falsifiability command`,
`Falsifiability result`, plus a `GREEN command` / `GREEN result` pair — and **none** also quotes a
numeric RED failure count, so the `red-not-observable.md` exclusivity rule holds on every one.

Two corrections to the premise: there are **20** such rows, not 13 (`e4a7295c` took it from 13 to
20), and **20 of 20** name a pre-existing artifact rather than a `TDD-NNNN`, not 11 of 13.

**The deviation is acceptable while the CR is open, and `refactor` is the right status.** Three
reasons, in order of weight. The drift protocol halt stops `done`, not `refactor`
(`#when-drift-is-detected` step 1: what it does stop is `done`). The two-way classification in
`red-not-observable.md` genuinely routes a correct test that passes over already-correct production
state to `exception` by elimination, which would be the one certainly-wrong outcome, and the CR says
so correctly. And writing a `TDD-NNNN` that does not satisfy the obligation would be a false record,
worse than a disclosed deviation. What is **not** acceptable is BL-5.

### 2. `TDD-0065`

**A `Status` of `refactor` is right.** RED is an admissible assertion against a seam (the artifact
must name the largest project and its test count: expected null not to be null) on an artifact reduced
to a heading and a placeholder — not a load error. GREEN is `8 passed (8)`, which I reproduced with
`vitest run tests/assets/actionPinBumpOwner.test.ts`: 8 tests passed, tree clean. The six oracle
rounds cover five distinct claims with `U6` as a control that reddens nothing, and the `U3` misfire is
recorded rather than hidden.

**The arithmetic is independently correct**, and one check is decisive: 1.13 / 132.94 = 0.0085
(0.85%), 2.68 / 132.94 = 0.02016 (2.02%), the spread is 135.62 minus 132.94 = 2.68s, about 2% of
133s, and the `U5` recorded value `0.15894388445915447` is exactly 21.13 / 132.94. The oracle number
reproduces from the table, which is a consistency check no rerun could give me.
`DECLARED_START = 10` in `packages/qfai/vitest.knobs.ts` matches the artifact value `adopted: 10`,
so claim 3 is real.

**The row is not passing on noise, and the reason is structural rather than a judgement call.** The
accepting condition it needs is at most 10%; it clears that by an order of magnitude. More
importantly the noise cannot reach either branch of `EX-0017-0049`: if run-to-run variance flipped
the 4-versus-10 order, the **first** accepting branch would apply, the one that says the adopted
setting is the fastest measured, and that branch needs no written reason at all. So no branch of the
rule is at risk from one-run-per-setting. Recording the limitation rather than smoothing it is the
right treatment.

Advisory, not blocking: `U5` mutates to 15.89%, so the 10% boundary of claim 5 is never probed. A
146.5s mutation would probe it.

Blocking gap on this row: **BL-8**.

### 3. The eight `todo` rows and their blocker attributions

**Every attribution is accurate**, and for the six CR-blocked rows it is reciprocal with the CR
`Blocked set` — checked in both directions: `TDD-0016` with `CR-20260818-0007`, `TDD-0030` with
`CR-20260820-0001`, and `TDD-0032` / `0033` / `0034` / `0035` with `CR-20260820-0007`. `TDD-0069` and
`TDD-0070` correctly say *no CR* and give a structural reason that holds: `EX-0017-0053` needs three
green `ci-pass` runs and the workflow changes are unmerged, and `EX-0017-0054` needs post-merge
default-branch history.

**Yes, writing `DR-ID` and `Evidence` is inside the unconditional carve-out** — that half of the
`bc36f08c` reasoning is right. But the carve-out is not the only rule in play, and
`references/execution-ledger.md` forbids exactly this use of `DR-ID`: **BL-3**.

### 4. Drift protocol

**Cell discipline is clean.** A cell-by-cell diff of the ledger between `0cd866e9` and `bc36f08c`:
82 rows in, 82 out, none added or removed, and the only columns touched are `Status` (**`TDD-0065`
only**, `todo` to `refactor`), `DR-ID` (six rows, a dash to a CR id) and `Evidence` (36 rows).
`TC-Refs`, `Layer`, `Test file` and `Selector` are byte-identical for all 82 rows. Nothing else moved
status.

**The earlier `Selector` change to `TC-0017-0063` in `01c9f6ff` was legitimate at the time.**
`git cat-file -e 01c9f6ff~1:packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts` fails: the
named test file did not exist, so `selectorResolves` could not be true and the cell was inside the
conditional carve-out. The `CR-20260820-0002` account of this, including that the cell is now
**outside** the carve-out because the selector resolves, is correct.

**The one upstream write is real, and it is the one the run self-reported.** During the implement run
(`f8ad8360~1..HEAD`) exactly two files under `.qfai/specs/spec-0017/` were written:
`tdd/test-list.md`, and **`07_Decisions.md`**. Attributed: `9aced5bb` added `DR-0017-0005` and
`DR-0017-0007`; `955eb2f1` added `DR-0017-0004`, `DR-0017-0008` and `DR-0017-0009`. That is **five**
DR entries across two commits, where `CR-20260820-0007` says three — a factual gap in the
self-report, folded into the B2 assessment below.

**`QFAI-DRIFT-001` did not fire, and the reason matters.** `07_Decisions.md` is in
`PROTECTED_SPEC_FILES` (`packages/qfai/src/core/validators/upstreamSsotGuard.ts:50-59`) and the file
changed on this branch, yet `.qfai/report/validate.log` contains zero `QFAI-DRIFT-001` and only two
errors, `QFAI-ATDD-111` and `QFAI-ATDD-112`. The cause is the documented permissiveness of
`readApprovedCrText`: it concatenates every **approved** CR body and substring-matches the path.
`CR-20260805-0001` (`Status: approved`, a `/qfai-sdd`-stage CR from 2026-08-05) contains the literal
`.qfai/specs/spec-0017/07_Decisions.md`. So an approval that predates the implement run, and
authorised the SDD refresh rather than this write, silences the detector. **The self-report is the
only reason this drift is visible at all** — which counts in the run favour, and is a standing risk
for the branch. Raised as advisory A2.

### 5. The two corrections placed near the top

**The treatment is right, and it has a named warrant** rather than resting on judgement:
`SKILL.md#evidence-hard-rules` to `shared-skill-operating-baseline.md#nondeterministic-gates` — when
a gate was run more than once, report **every run in order**. Editing a per-change block in place
would destroy the earlier run and leave a record that cannot show when the situation changed. The
stated rationale, that a per-change block records what was measured at that revision, is the correct
reading of that rule.

Two problems, neither about the choice: **M-5** (a reader arriving at a corrected block via a ledger
anchor gets no pointer, 13 times over) and **BL-10** (one of the two corrections presents a paraphrase
as command output).

## Verified clean

1. **B5 fully discharged.** All 74 `refactor` rows name an anchor into `implement-spec-0017.md`; all
   74 resolve (69 explicit HTML id anchors plus 5 `### TDD-000N` heading slugs); **0 unresolved,
   0 ambiguous, 0 duplicated explicit anchors**, no anchor named by two rows, no row naming an anchor
   other than its own, no orphan anchor. The 8 `todo` rows correctly name none.
2. **B4 discharged exactly, and the residual claim is verified.**
   `tests/integration/qfai-traceability.md` holds **74** `QFAI:SPEC-0017:TC-*` lines, exactly the 74
   `refactor` rows; **0** for `todo` rows; no annotation for a TC outside the ledger. The residual
   `QFAI-ATDD-112` population for spec-0017 is `TC-0017-0016`, `0030`, `0032`, `0033`, `0034`, `0035`,
   `0069`, `0070` — **exactly the 8 `todo` rows**, an exact set match in both directions. The claim
   that the residual equals exactly the un-implemented rows **holds**. The number is 8, not 9, and the
   record statement at `:1008` that the nine are exactly the nine rows still `todo` is stale by one,
   because `a910c91c` implemented `TDD-0065` after that paragraph was written. The invariant survived;
   only the count moved. **Low** — worth a one-line note in the corrections section.
3. **Cross-spec detection is complete.** I enumerated every file changed in the run range
   (`f8ad8360~1..HEAD`) and intersected it with the `Test file` column of **all 17** ledgers. Exactly
   two hits: `shippedWorkflowDetection.test.ts` (declared) and
   `spec0006WorkflowsIntegrity.declined.test.ts`, whose only edit in range is `1da38e12` — a
   **spec-0006 rework commit**, not this run. No helper that the spec-0003 `done` tests import was
   touched under spec-0017 either. And the claim that no `expect` was added, removed or altered is
   **true**: I read the whole `dd894914` diff of that file — a memo, a `COMMIT_IDENTITY` constant, a
   `degradedCases()` getter, and three `git config` calls rewritten into `-c` flags. The spec-0003
   `TC-0003-0038` / `0039` / `0040` assertions are unchanged and the file is green.
4. **The pigeonhole bound was applied to all 17 blocks; change 8 is the only violation.** Counted
   describes and test cases at each block revision and compared against each recorded RED. Consistent
   everywhere else, several exactly: `8bd05615` (6 new rows, 4 failed, exactly 2 rows carry a trio,
   `TDD-0055` and `0056`); `e1e00209` (4 new, 2 failed, exactly 2 carry a trio); `955eb2f1` (5 new,
   3 failed, exactly 2 carry a trio); `0cd866e9` (7 new, 2 failed, exactly 5 carry a trio);
   `d8e58fe0` (`TDD-0061` holds 3 test cases, so 4 failures over 2 rows with `TDD-0068` the single
   pass); `4e29a2a4` and `4a4c0954` (all new rows reddened). Changes 3 and 4 record per-row
   attribution in prose and name the row that passed.
5. **B1 sufficient, placement right, one wrong cross-reference.** The disclosure gives both
   revisions, the verbatim before and after selector, the carve-out warrant (verified independently),
   the fact that the cell is now outside it, and that `06_Test-Cases.md` is untouched since the seed.
   Confirmed: `git log main..HEAD -- .qfai/specs/spec-0017/06_Test-Cases.md` shows only `a23220de`,
   and the TC still reads *The deleted project name no longer resolves*. It sits **before**
   `## Options`, which is the right place — nobody reads them as open. But its opening sentence says
   *the options above are presented as a choice* when the options are below it. **Low**: change
   *above* to *below*.
6. **The B2 framing is right, and leaving the four rows `todo` is the correct call**, not
   work-avoidance. Their acceptance criteria require the write (`BR-0017-0030` binds `AC-0017-0014`,
   the criterion `TC-0017-0032` belongs to); `SKILL.md` forbids it; and having recognised the
   violation, continuing would compound it. The CR observation that the spec routes a row to
   `/qfai-implement` whose acceptance criterion is a decision-record write is the stronger half of its
   own case, and it is correct. Two accuracy defects: three should be **five** DR entries (see
   answer 4), and the CR has no `## Reproduction`, `## Context` or `## Proposed change` section though
   `Class: defect` makes the first REQUIRED. Blocking gap is **BL-4**.
7. **B6 discharged, including the vacuity fix.** `TDD-0008` now has three rounds (`S1`, `S2`,
   `S3-control`), each planted alone and reverted with a byte comparison, and the cell retracts `R7`
   with the reason that `R7` belongs to `TDD-0009`. The `S2` repair is genuinely discriminating:
   `ownWorkflowTopology.test.ts:1109-1122` splits the `run` block into lines, strips comment lines,
   filters to `git diff` lines, asserts none lacks `--no-renames`, and carries a premise guard that at
   least one diff command exists. The vacuous whole-string form is gone.
8. **Nothing the rework touched is broken.** Read-only runs at `90a33ee5`, tree clean before and
   after each: `ownWorkflowTopology` (27) plus `workflowHygiene` (30) plus `sliceSurfaceAlignment`
   (3) plus `vitestWorkspaceKnobs` (5) = **65 passed (65)**; `actionPinBumpOwner` (8) plus
   `layerCiLaneMapping` (7) = **15 passed (15)**; `node scripts/check-workflow-hygiene.mjs` PASS,
   exit 0.
9. **Layer and `test-layers.md` alignment.** `tests/assets/*.test.ts` runs in the `e2e` runner project
   while its rows declare `Layer = Integration`, and `TDD-0080` declares `Unit` for the same file.
   `Layer` is upstream and not writable here, and `CR-20260818-0004` is open precisely on where L1
   lives, so this is **routed, not unrouted**. No finding.

## Sequencing notes (not findings)

- This pack has no `summary.json` and no `R01` or `R03`. Both are expected: `summary.json` is written
  once the verdicts of the round land, and the other two reviewers are running concurrently.
- `Resolution` in `## Cross-spec obligations` cannot be filled before this verdict exists.
- Gate-completed evidence fields (`Spec review`, `Code quality review`, checkpoint verification) are
  absent from every block, which is the expected state at review time per
  `SKILL.md#per-item-evidence-contract-fresh-evidence-required`.

## Required gates and residual risks

- **At least eight in-scope CRs are at `Status: open`** — `CR-20260818-0001`, `-0004`, `-0006`,
  `-0007`, and `CR-20260820-0001` through `-0007`. `SKILL.md#spec-completion-conditions` bars
  completion while any in-scope CR is unresolved, independently of every finding above.
- **`QFAI-PROFILE-001`**: the recorded run is `--profile tdd`, a partial profile, and the log itself
  says a PASS there is not full-scan coverage. The full profile is owed before completion.
- **Item-12 step 4** remains the checkpoint blocker (`CR-20260818-0006`); step 2 is discharged per the
  correction at `:98`.
- **`QFAI-DRIFT-001` cannot be relied on for `07_Decisions.md` on this branch** — see answer 4.
- `.qfai/report/validate.log` at HEAD reports `info=4 warning=358 error=2`; the most recent claim in
  the record is `warning=359`. Off by one; not a finding.

## Advisory / Change Request proposals

`Traces to: none` for all three. **Do not implement as production code or pin as a test assertion**
(`drift-protocol.md#reviewer-originated-obligations`); route to the owner phase.

- **A1** — `Blocked-By` accepts a CR id, a contract path with line, or a cross-spec row. None
  expresses *waiting on CI history that does not exist yet*, which is the real state of `TDD-0069` and
  `TDD-0070`. Propose a fourth value shape, or a `blocked` warrant for unavailable observational data.
- **A2** — the approved-CR substring match in `QFAI-DRIFT-001` lets any approved CR that happens to
  mention a path silence a later, undisclosed edit to it, across stages and months. Propose scoping the
  match to CRs whose blocked set or `Impact` names the writing stage. This is a `packages/qfai/src`
  defect that spec-0017 did not introduce and must not be fixed under it.
- **A3** — `red-not-observable.md` needs the third classification `CR-20260820-0006` asks for. The
  evidence for it is now stronger than the CR states: **20 of 20** rows on that path in this spec are
  regression guards over pre-existing state, so it is not the minority case the two-way split assumes.

## Rework list (ordered)

1. **BL-1** — give `TDD-0012` the falsifiability form; add per-row RED attribution to the change 8
   block; re-run the pigeonhole check over every block.
2. **BL-4** — add `TDD-0052`, `TDD-0066`, `TDD-0067`, `TDD-0074` and `TDD-0075` to the
   `CR-20260820-0007` `Blocked set`, and correct three to five DR entries, naming `DR-0017-0004` and
   `DR-0017-0005`.
3. **BL-5** — update `CR-20260820-0006` from 13 to 20 rows throughout: the table, the not-reset
   enumeration, and the cross-check count in step 3.
4. **BL-6** — name `confirm-only` or `re-derive` in all eight `/qfai-sdd` rerun plans.
5. **BL-3** — file a CR for the `Blocked-By` column if adding it is judged upstream, or add the column
   and move the six rows to a `blocked` status. Either way, record the reasoning in the **evidence
   file**, not only in a commit message, and stop carrying the blocker in `DR-ID`.
6. **BL-7** — add `Objective`, `Items processed`, `Test results summary` and `Commands executed`.
7. **BL-8** — add a `Revision` and the `TC-0017-0065` reference to the `TDD-0065` block.
8. **BL-9** — add the forcing spec-0017 `TDD-ID` to `## Cross-spec obligations`.
9. **BL-10** — replace the hygiene-lane block at `:132-142` with the actual output of the command, or
   relabel it as a summary.
10. **BL-2** — write the round-5 verdicts to this pack, and record that rounds 1-4 have no pack.
11. **M-2**, **M-5**, **M-1**, **M-3**, **M-4**, and the two Low items (the stale nine in B4, and the
    *options above* in B1).

## Measurement integrity — the working tree became dirty mid-review

Recorded because it bears on what every verdict in this pack is a verdict about, mine included.

`git status --porcelain` was **empty** when this review started and stayed empty through every
measurement I took. It is **not empty now**. HEAD is unchanged at `90a33ee5`; five tracked files
carry uncommitted edits:

```text
 M .github/workflows/ci.yml                                    mtime 15:02:54
 M packages/qfai/tests/scripts/workflowHygiene.test.ts          mtime 15:02:54
 M packages/qfai/tests/scripts/ownWorkflowTopology.test.ts      mtime 15:03:16
 M packages/qfai/tests/assets/layerCiLaneMapping.test.ts        mtime 15:04:34
 M packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts     mtime 15:07:10
```

These are not test residue. They are deliberate source edits — the classifier executable rule
reworked to fire only inside a documentation directory, the `stepsOfJob` helper deleted, and the
`--no-renames` claim area changed. Rework appears to have started while the review round was still
in flight.

Consequences, stated so nobody has to reconstruct them:

- **Every finding in this pack is a finding about `90a33ee5` with a clean tree.** My last
  measurement was the asset-test run at 15:00:14; the first mutation is at 15:02:54. So nothing I
  measured is contaminated.
- **`Verified clean` items 7 and 8 are the ones most exposed.** Item 7 verified the `--no-renames`
  repair at `ownWorkflowTopology.test.ts:1109-1122`, and item 8 recorded 65 passing tests across the
  four `scripts` files. Both were taken before 15:02:54 and neither is a claim about the current
  working tree.
- **`R01_implementation-reviewer.md` (15:00) and `R03_qa-gatekeeper.md` (15:05) bracket the
  mutations.** The qa-gatekeeper window overlaps edits from 15:02:54 onward, so if that verdict rests
  on suite runs it should state which side of 15:02:54 they fell on.
- This pack directory is matched by `.gitignore:61` (`.qfai/review/*`), so writing this file cannot
  change any gate result or produce a false red for a concurrent reviewer. I applied no other write.
- I did not read `R01` or `R03`; this verdict is independent of them.

**Rework instruction**: before the next round, either commit or discard those five files so the round
has a nameable revision. Gate item 10 requires the item's four sub-agent observations to name the
**same** revision (`references/evidence-revision.md`), and three reviewers measuring across a moving
uncommitted tree cannot satisfy it.
