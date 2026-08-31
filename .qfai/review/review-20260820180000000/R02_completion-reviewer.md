# R02 — completion-reviewer

**Result: REVISE**

- Reviewer: `completion-reviewer`
- Stage: `/qfai-implement` (spec-0017, CHG-007 run), round 6
- **Reviewed revision: `1ba7aecd`.** `git status --porcelain` was empty at start, after every suite
  run, and at finish. HEAD did **not** move: `1ba7aecd` at start and at finish. The revision
  discipline the request promised was kept, and it is the first round of this run where all
  measurements name one committed tree with no caveat.
- Mutations applied: **none.** Scratch under `tmp/r02b/` only. I did **not** run
  `npx qfai validate`: `.qfai/report/validate.log` is a **tracked** file
  (`git ls-files --error-unmatch` succeeds on it), so running it would have dirtied the shared tree
  under two concurrent reviewers. This file's own path is matched by `.gitignore:61`, so writing it
  changes no gate result.
- Scope: Completion Contract, the 12-point gate, the per-item evidence contract, Drift Protocol,
  the fifteen Change Requests, and each of round 5's twenty-two dispositions.

## Verdict summary

**Four blocking findings, five medium, three low.** None of the four is a repeat of a round-5
blocking finding: BL-1's `TDD-0012` half, BL-3, BL-7, BL-8, BL-9 and BL-10 are **fully discharged
and I verified each mechanically**, and the B7 sweep reproduces exactly. The four blockers are
(1) the same staleness class as BL-5, self-inflicted in the same commit that fixed BL-5;
(2) `CR-20260820-0008`'s central argument rests on a misattributed rule and its scope is narrower
than the deviations it exists to cover; (3) `CR-20260820-0007`'s conditional blocked set defeats
the step-1 halt while the CR is open; (4) both review packs are missing the required
`summary.json`.

**One round-5 finding of mine is refuted and I concede it.** "Five DR entries" was wrong. Measured
below: three entries, five ids mentioned. The rework's correction is right, its method was right,
and recording the disagreement in the CR rather than silently changing a number is the correct
treatment.

**Answer to the round's question: no. Not one of the 82 rows may reach `done` at `1ba7aecd`.** The
holders and who can clear them are in *Which gate holds each row*.

## Blocking findings

### B1 — `CR-20260820-0006` says twenty rows; the tree holds twenty-one, and `76ade4dd` created both

- **Artifact**: `.qfai/decisions/CR-20260820-0006-...md:14` (`Blocked set`, "all twenty rows"),
  `:71` (heading "Correction: twenty rows, not thirteen"), `:83-85` (the 12/4/4 class table),
  `:87` ("20 of 20 deviate"), `:163-165` (the not-reset enumeration), `:170` ("confirm **twenty**
  cells").
- **Clause**: `drift-protocol.md#when-drift-is-detected` step 2 — the enumerated set "is what makes
  the halt checkable"; step 5 — the sweep identifies "every `tdd/test-list.md` row the rerun
  invalidated".
- **How established** — parsed the ledger and counted `Evidence` cells containing `Satisfied-by:`:
  **21**, and 21 of 21 name an artifact rather than a `TDD-NNNN`. The extra one is `TDD-0012`. Then
  walked the count per commit:

  ```text
  90a33ee5   TDD-0012 has Satisfied-by = 0    total Satisfied-by rows = 20
  76ade4dd   TDD-0012 has Satisfied-by = 1    total Satisfied-by rows = 21
  1ba7aecd   TDD-0012 has Satisfied-by = 1    total Satisfied-by rows = 21
  ```

  `git log -- CR-20260820-0006...md` shows the "twenty rows" correction was added by **`76ade4dd`**
  — the same commit that gave `TDD-0012` its falsifiability trio. So the commit that repaired BL-5
  (13 -> 20) simultaneously created the 21st member and left the CR at 20.
- **Consequence, stated as the CR states its own purpose**: step 2's not-reset enumeration exists
  "so a later sweep cannot claim these rows were in scope". `TDD-0012` is now a falsifiability-trio
  row that is **not** on that list, so a later sweep can claim exactly that for it — the identical
  consequence BL-5 named. The class table's "20 of 20 deviate" is also short by one, and
  `TDD-0012`'s satisfier ("the pre-existing `ci.yml` at the change-8 base") is a clean class-A
  member with nowhere to sit.
- **Partial mitigation, credited**: step 3 now ends "if it has moved again, re-derive it from the
  ledger rather than from this line". An operator who follows that instruction recovers. The hard
  lists at `:83-85` and `:163-165` do not carry the same hedge.
- **Severity**: Blocking (one-line magnitude, but it is the fourth consecutive round in which a fix
  introduced the defect it was fixing, and this time inside the same commit).
  **Traces to**: `drift-protocol.md#when-drift-is-detected` steps 2 and 5.
- **Rework**: 20 -> 21 at `:14`, `:71`, `:87`, `:170`; add `TDD-0012` to class A at `:83` (making it
  13) and to the not-reset enumeration at `:163-165`.

### B2 — CR-20260820-0008 builds its "genuine conflict" on a rule that governs a different phase, and its scope excludes two of the deviations it exists to cover

You asked me to challenge the argument and to say whether option 2 is simply the answer. **The
conflict as stated is not real, and option 2 is not the interesting answer either** — the premise
that the RED must be file-scoped is false.

- **Artifact**:
  `.qfai/decisions/CR-20260820-0008-per-item-evidence-sections-cannot-hold-a-shared-red-green-cycle.md:35-36`
  — "A RED/GREEN cycle in this spec is **per change, not per row**. The commands are file-scoped,
  because that is what `references/relevant-test-suite.md` asks for". Restated verbatim in commit
  `5dab47ed`.
- **How established** — `references/relevant-test-suite.md:1-4` opens: *What "run the relevant test
  suite" resolves to in **Phase: Refactor step 2**, and where the wide run is actually paid for.*
  It governs the post-refactor regression run. It says nothing about RED observation. What governs
  RED observation says the opposite:
  - `SKILL.md` Phase Red step 4: **Observe each Selector entry's failure separately; one aggregate
    run is not a valid RED observation.**
  - `references/red-admissibility.md` criterion 2: the failure must be raised by an assertion
    *executing inside the row's own Selector*.
  - `drift-protocol.md:109-110` names the per-row form: `<runner> <Test file> -t '<Selector>'`.
- **So the argument inverts**: there is no rule requiring one pair per change, and there **is** a
  rule forbidding the aggregate as a RED observation. Under a per-row RED there is no "one pair
  written seven times" — there are seven distinct commands with seven distinct outputs, and the
  section contract is satisfiable with no conflict at all. The one-pair-per-seven-rows table at
  `:38-44` is therefore a description of a non-compliant practice, not of a contract collision.
- **The "single home" reading is also wrong.** The `SKILL.md` clause reads: *the single home for the
  RED/GREEN commands and output. The ledger's Evidence cell anchors here and holds only the one-word
  outcomes, **because a GFM cell cannot hold a newline or a bare pipe**.* The reason clause fixes
  the contrast: section-versus-ledger-cell, not one-physical-location-per-run. Nothing in it forbids
  the same command text appearing in two sections.
- **Second half — the scope is narrower than the record's actual deviations.** Lines `:61-65` ("What
  is not the problem") assert *Not the per-item FIELD contract … The fields exist per row; only the
  heading does not.* That is false as measured:
  - `Refactor verify command` / `Refactor verify result` — the contract says *Written **once for the
    item as a whole***. `.qfai/evidence/implement-spec-0017.md:3193-3205` records **six** pairs for
    74 rows, keyed by command, with the justification "seventy-four identical pairs would be noise".
  - `Spec review` / `Code quality review` — per-item gate-completed fields. Lines `:3207-3218`
    record **one** global table for 74 rows.

  Approving option 1 (a shared *section*) legalises neither. So the operator would ratify a fix that
  leaves both deviations standing, and the CR's own "what is not the problem" paragraph is what
  would prevent them noticing.
- **Severity**: Blocking. A Change Request is the artifact an operator decides from; a decision
  record whose stated conflict does not exist, and whose disclaimer excludes two live deviations,
  cannot be approved as written. **Traces to**: `SKILL.md#evidence-mandatory`,
  `SKILL.md#per-item-evidence-contract-fresh-evidence-required`,
  `drift-protocol.md#when-drift-is-detected` step 2.
- **Rework** — three edits, and the CR probably survives all three:
  1. Drop the `relevant-test-suite.md` attribution and state the real tension: this run used one
     file-scoped aggregate RED per change, which Phase Red step 4 already forbids. That makes the CR
     stronger, not weaker — it is now about a practice the skill's own text rules out, and the
     honest question becomes whether per-Selector RED observation is affordable for a spec whose 82
     rows share six files.
  2. Reframe option 2 accurately: it is not a stub, because a per-row RED command is a *different*
     command with *different* output. Its real cost is 74 runs, not 74 copies.
  3. Extend the scope to name the shared `Refactor verify` pair and the shared reviewer-verdict
     table, or file those separately. Do not leave `:61-65` asserting the field contract is met per
     row.

### B3 — CR-20260820-0007's "conditional member" cannot express the halt that is in force today

You asked whether "conditional member" is a legitimate reading. **Partly — as a step-5 refinement,
yes; as the `Blocked set` field, no.**

- **Artifact**: `.qfai/decisions/CR-20260820-0007-...md:14` — `spec-0017 TDD-0032, TDD-0033,
  TDD-0034, TDD-0035` unconditionally, then `TDD-0052, TDD-0066, TDD-0067, TDD-0074, TDD-0075`
  **under options 2 and 3 only**. The table at `:143-149` marks all five "unaffected" under option 1.
- **Clause**: `drift-protocol.md#when-drift-is-detected` step 1 — *A dependent item is one whose
  TC-Refs names an obligation the CR would change, or whose implementation reads the artifact under
  dispute; **when the dependency is arguable, it is dependent.** … What it does stop is `done` — a
  dependent item may not be completed against an obligation known to be under revision.*
- **Why the conditional form fails**: the halt is in force **while `Status: open`**, i.e. exactly
  while the option is unknown. A membership predicated on which option is eventually approved cannot
  govern a halt that operates before the approval. Step 1's tie-break settles it: arguable means
  dependent. So today all nine rows are halted from `done`, and the field as written invites the
  opposite reading — a reader who takes the recommended option 1 at face value concludes `TDD-0052`,
  `TDD-0066`, `TDD-0067`, `TDD-0074` and `TDD-0075` may close now.
- **Credit where due**: the five are now named, the reciprocal table exists, and `:151-155`
  articulates the reasoning honestly — "a conditional member is still a member". That sentence is
  right and is the fix's own argument against the field's form.
- **Severity**: Blocking-Medium. **Traces to**: `drift-protocol.md#when-drift-is-detected` step 1.
- **Rework**: one sentence. Name all nine in `Blocked set` unconditionally while `Status: open`, and
  say that the option-conditional table governs the **step-5 sweep**, not the step-1 halt.

### B4 — both review packs are missing summary.json, which the layout marks required

- **Artifact**: `.qfai/review/review-20260820140000000/` holds `review_request.md`, `R01`, `R02`,
  `R03` and **no** `summary.json`. `.qfai/review/review-20260820180000000/` holds
  `review_request.md` only, which is the expected mid-round state.
- **Clause**: `references/review-artifact-layout.md` — the pack tree marks `summary.json` as
  required, and names its minimum shape: `version`, `created_at`, `target.{kind,path}`,
  `routing_profile`, `overall_status`, and `reviewers[]` with `status: PASS|FAIL|NA`. A REVISE
  verdict is written there as `status: "FAIL"`.
- **How established**: `ls` on both directories; `git ls-files` confirms the round-5 pack's four
  files are tracked, so the pack was deliberately committed in the state it is in. Round 5's three
  reports all landed (15:00, 15:05, 15:16) and all three returned REVISE, so that round is closed
  and its summary is owed now.
- **Why it is not merely formal**: the `revision` field of `summary.json` is what makes gate item
  10's same-revision requirement machine-checkable — `references/evidence-revision.md:28-29` names
  it as the third of the three places the revision appears, and the one that is machine-checked
  (`QFAI-REVIEW-009`). Without it, the one thing this run has finally got right — three reviewers on
  one named revision — exists only in prose. And `review-artifact-layout.md` closes with the reason
  the gap survived five rounds: *Neither --profile tdd nor --profile sdd reports QFAI-REVIEW-*.*
  `--profile tdd` is the only profile this run has recorded.
- **Severity**: Blocking. Unlike BL-2, this half **is** repairable by the implementer, today, from
  artifacts that exist. **Traces to**: `SKILL.md#review-artifact-layout-must`,
  `references/review-artifact-layout.md`.
- **Rework**: write `summary.json` for `review-20260820140000000/` with `overall_status: "FAIL"`,
  `revision: "90a33ee5"` and three `reviewers[]` entries at `status: "FAIL"`; write this round's
  once the three reports land. Then run the full profile so `QFAI-REVIEW-*` is observed at least
  once before completion.

## Medium findings

### M1 — the B7 sweep conclusion is right; its stated warrant is not reproducible, and the proviso it names is false for one file

- **Artifact**: `.qfai/evidence/implement-spec-0017.md:1856-1859` — *Every group of rows sharing one
  recorded RED is now checked mechanically … Twelve groups, and none does. The per-file proviso that
  makes the bound exact — one it() per describe — is checked rather than assumed.*
- **The conclusion reproduces.** I rebuilt the groups independently from the ledger: parse every
  `Evidence` cell for `N failed / M passed (T)`, group by `Test file` plus that triple, count the
  rows still claiming the RED. Result: **twelve groups, zero violations.** Ten are *tight* —
  claiming rows equals failures — and two carried slack: `workflowHygiene` 6f/10p(16) with 5
  claiming, and `vitestWorkspaceKnobs` 4f/1p(5) with 2 claiming.
- **But the proviso is false where it matters most.** Counting top-level `describe(` and `it(` in
  `packages/qfai/tests/scripts/workflowHygiene.test.ts` at the four revisions the sweep covers:

  ```text
  dd894914   10 describes  10 it()s     <- proviso holds
  4e29a2a4   15 describes  16 it()s     <- FAILS
  4a4c0954   21 describes  22 it()s     <- FAILS
  8bd05615   27 describes  28 it()s     <- FAILS
  ```

  Three of the twelve groups sit at those three revisions. For them, rows-versus-failures is **not**
  an exact bound, so "none in violation" is not by itself a proof for any of the three. I also saw
  the multi-it() describes in the live run: `TC-0017-0046` and `TC-0017-0059` each hold two.
- **The conclusion survives when re-derived at test-case granularity**, which is what the sweep
  should have recorded. `dd894914 -> 4e29a2a4` adds 5 describes and **6** it()s and 6 failed, so all
  five rows failed. `-> 4a4c0954` adds 6 and **6**, and 6 failed. `-> 8bd05615` adds 6 and **6**,
  and 4 failed, so exactly two new tests passed — and the record disclaims exactly two, `TDD-0055`
  and `TDD-0056`. `vitestWorkspaceKnobs` at `d8e58fe0` is 3 describes / 5 it()s with 4 failures and
  `TDD-0068` recorded as passing at RED: consistent.
- **So the finding is about the record, not the answer.** The sweep is stated as
  rows-versus-failures plus a proviso that is false for the file holding six of the twelve groups,
  and the per-file results are not written down — so a reader cannot check the step whose omission
  let `TDD-0012` survive a round. **Severity**: Medium. **Traces to**:
  `SKILL.md#item-completion-checklist-12-point-gate` item 3, `SKILL.md#evidence-hard-rules`.
- **Rework**: restate the sweep as *new test cases the change added versus failures recorded*, and
  record the per-group table: file, base and landing revision, describes, it()s, failures, rows
  claiming, rows disclaiming. That form is exact whatever the describe shape is, and it is already
  the actual justification for four of the twelve groups.

### M2 — two numeric errors in the newly added Objective, one contradicted by the same file twenty lines later

- **Artifact**: `.qfai/evidence/implement-spec-0017.md:27-28` — "Fourteen are open. Six rows are
  `blocked` on four of them."
- **How established**: parsed `- Status:` from all 23 `.qfai/decisions/CR-*.md` files. **Sixteen are
  open**: `CR-20260811-0001`, `CR-20260818-0001` through `-0007`, and `CR-20260820-0001` through
  `-0008`. Fifteen of those are the 0818+0820 series the record elsewhere treats as this run set, so
  "fourteen" was true until `5dab47ed` filed `CR-20260820-0008` — two commits after `51291b04` wrote
  this line. Separately, the `Blocked-By` column holds exactly **three** distinct CR ids:
  `CR-20260818-0007` (1 row), `CR-20260820-0001` (1 row), `CR-20260820-0007` (4 rows). The record
  own table at `:48-55` lists those three correctly, so the Objective contradicts a table twenty
  lines below it.
- **Why it is worth a finding in a record this careful**: the third numbered promise of that same
  Objective is *Nothing is claimed that was not measured.* Both errors are in the paragraph that
  makes it.
- **Severity**: Medium. **Traces to**: `SKILL.md#evidence-hard-rules`.

### M3 — the item-12 note calls 352 the baseline value while the same file says that total is not a valid baseline

- **Artifacts**: `:3232-3234` — *Clause 3 excess is now zero — the warning count is 352, **the
  baseline value***. Against `:453-456` — ***Consequence to carry**: spec-0017 warning total is
  **not a stable step-4 baseline** while this is open — it moves with the size of
  `ownWorkflowTopology.test.ts` for reasons unrelated to the rows being implemented, so the
  `TDDLIST_STALE_STATUS` count must be quoted separately rather than folded into a total.*
- **And the sentence contradicts itself at `:3231`**, which says clause 1 baseline "none was"
  captured. If no baseline exists, "the baseline value" has no referent. The 352 at `:446` is a
  count-only pre-change measurement with no finding IDs — which is precisely why clause 1 is unmet.
- **Verified**: `.qfai/report/validate.log` (tracked, last regenerated by `5dab47ed`) reports
  `info=4 warning=352 error=2`. The number is right; calling it the baseline is what is wrong.
- **Consequence**: clause 3 is moot anyway, since the substitution is unavailable without clause 1.
  It matters because it is the one place the record asserts a checkpoint clause is satisfied.
- **Severity**: Medium. **Traces to**: `references/checkpoint-verification.md`, the step-4
  substitution, clauses 1 and 3.
- **Rework**: replace with "clause 3 cannot be evaluated: clause 1 baseline was never captured, so
  there is nothing to compare against. The warning count at HEAD is 352, which happens to equal the
  pre-change count at `:446`; that count is not a step-4 baseline, for the reason recorded at `:453`."

### M4 — Class defect with four options, and no Reproduction section in any of the eight defect CRs (unchanged from round 5 M-1; not claimed fixed)

- **How established**: parsed `- Class:` and the heading set of all 23 CRs. Eight are
  `Class: defect`. **Zero** carry a `## Reproduction`, `## Context` or `## Proposed change` heading —
  the three the template (`skills/qfai-sdd/templates/change-request.md`) prescribes and which
  `drift-protocol.md#when-drift-is-detected` step 2 lists as CR contents, with reproduction
  **required for defect drift**. `CR-20260820-0007` additionally carries four options, against
  *options (at least 3) and recommendation — **intent drift only***.
- Most of them carry the *content* under bespoke headings, and several carry a genuine reproduction
  in a fenced block. The gap is that a reader cannot tell which, and `#drift-classes` is explicit:
  *A CR that declares Class defect without a reproduction … must be treated as incomplete.*
- **Severity**: Medium. **Traces to**: `drift-protocol.md#drift-classes`,
  `drift-protocol.md#when-drift-is-detected` step 2, `skills/qfai-sdd/templates/change-request.md`.

### M5 — the ambiguity-to-intent move is legal for all six, but three of the six also satisfy the defect test and the CRs do not say so

You asked whether `intent` is right for each. **Legal for all six, and I am not asking for a
re-classification** — but the reasoning belongs in the CRs, because for three of them the two-class
test returns both answers.

- **Verified the migration**: `git diff 90a33ee5 1ba7aecd -- .qfai/decisions/` shows exactly six
  `- Class: ambiguity` to `- Class: intent` lines, on exactly the six I named in round 5:
  `CR-20260818-0007`, `CR-20260820-0001`, `-0002`, `-0003`, `-0005`, `-0006`. No CR carries
  `ambiguity` now. Each of the six has an Options section with three or more options and a
  recommendation, which is what `intent` obliges and what makes the choice legal.
- **Clearly intent**: `CR-20260818-0007` (a default that is *undefined*, not contradicted) and
  `CR-20260820-0005` (a rule enumerating two outcomes where a third occurred — incomplete, not
  self-contradictory).
- **Both tests pass** for `CR-20260820-0001` (its own section head is "Three statements that cannot
  all hold", which is the defect limb *two artifact excerpts that contradict each other*, while the
  intent precondition is *the upstream artifact **is** internally consistent*), for
  `CR-20260820-0002` and `-0003` (a specified observable that does not exist, and "unreachable" is
  in the defect definition), and for `CR-20260820-0006` (`red-not-observable.md` declares the case
  *is **not** an anomaly and does **not** go to exception*, then routes it to `exception` by
  elimination — an artifact contradicting its own declared behaviour).
- **Why I still accept intent**: `#drift-classes` says the class *does **not** decide whether a
  Change Request is needed: both classes STOP, both raise a CR, both wait for approval, both are
  applied by the owner skill.* The only consequence is which sections are required, and each of the
  six carries **both** the contradicting excerpts and three-plus options — over-provision, not
  under-provision. And the protocol own warning cuts against `defect` here: each has several
  reasonable fixes, and *for defect drift record the single correct fix instead* would force the
  author to pick one and hide the rest.
- **Severity**: Medium (documentation of the choice, not the choice). **Traces to**:
  `drift-protocol.md#drift-classes`. **Rework**: one sentence per CR saying why `intent` was chosen
  over `defect`. `CR-20260818-0007` already has that paragraph and it is the model — but retitle it,
  since `:40` still reads "Why this is an **ambiguity** rather than a defect in the tree".

## Low findings

- **L1** — `CR-20260820-0006:85` labels class C "an earlier change of THIS run" and puts `TDD-0025`
  in it. `DR-0017-0003` was written by `42dd70cb` (*feat(specs): add spec-0017 architecture side*),
  the **SDD-stage** commit — on this branch, but not by this run, whose first commit is `f8ad8360`.
  Verified: `git log -S DR-0017-0003 -- 07_Decisions.md` returns `42dd70cb` alone, and
  `git branch --contains 42dd70cb` names this branch only. Moving it out of class A was right (it
  does not predate the spec); class C own definition does not fit it either. Say "an earlier change
  of this branch, including its SDD stage".
- **L2** — `.qfai/specs/spec-0017/tdd/test-list.md:126` heads the schema table "Required columns, in
  the order used above" and now lists `Blocked-By` among them.
  `references/execution-ledger.md:45-55` documents it under "Obligation columns (optional, required
  by layer)" — required on `blocked` rows, blank otherwise. One word: "Columns, in the order used
  above".
- **L3** — `.qfai/evidence/implement-spec-0017.md:312` transcribes the final line of the lane output
  with a straight ASCII apostrophe; the program emits a typographic right single quote. The block
  declares only the rule descriptions elided, so this is the one remaining undeclared divergence in
  a block that is otherwise byte-faithful.

## Each round-5 finding, verified rather than taken on the word of the disposition table

### Discharged, and how I checked

**BL-1, the `TDD-0012` half — discharged.** The cell at `test-list.md:50` now reads *the file-scoped
RED run was 6 failed / 13 passed (19) and **THIS ROW WAS AMONG THE PASSING*** and carries
`Satisfied-by`, `Falsifiability command`, `Falsifiability result` and the GREEN pair. The
exclusivity rule in `red-not-observable.md` holds: the falsifiability form is present and no
`RED command` / `RED result` claims a failure for this row. Keeping the aggregate numbers while
stating the row passed is better than deleting them, and it matches the form `TDD-0055`, `TDD-0056`
and `TDD-0078` through `TDD-0082` already use. The change-8 block at `:1830-1854` now carries the
per-row attribution, the arithmetic, the `9aced5bb` 12/12 to `2a3ef61c` 19/19 census, and an
explicit retraction of the reasoning `e4a7295c` dismissed.

**BL-3 — fully discharged, and this is the cleanest fix of the round.** Cell-by-cell diff
`90a33ee5` to `1ba7aecd`: 82 rows in, 82 out, none added or removed. Columns that moved: `Status`
(**exactly 6**: `TDD-0016`, `0030`, `0032`-`0035`, all `todo` to `blocked`), `DR-ID` (**the same
6**, CR id to `-`), `Evidence` (**1**: `TDD-0012`). `TC-Refs`, `Layer`, `Test file` and `Selector`
are byte-identical for all 82 rows, so the two conditional cells were not touched at all. The six
are the right six — exactly the CR-blocked set I named — and `DR-ID` returning to `-` is correct,
because `execution-ledger.md:16` reserves a `CR-*` there for *a row reset by an approved Change
Request*, which none of these is. `Blocked-By` values are reciprocal with each CR own blocked set.
The schema table gained `Blocked-By`, and the `Status` enum gained **both** `blocked` and
`review-fix`, matching `execution-ledger.md:176`.

**BL-7 — discharged, and generating `Items processed` is the right call.** All four sections exist:
`Objective` (`:12`), `Items processed` (`:30`), `Test results summary` (`:3175`),
`Commands executed` (`:3236`). On the generated question you asked: the contract asks for
(TDD-ID, TC-Refs, final status) and all three are recoverable — the ranges enumerate the TDD-IDs,
`:42-44` states the TC-Refs bijection, and the grouping gives the status. **Accurate**, verified
both halves: re-deriving the ranges from the ledger yields `refactor 74 = 0001-0015, 0017-0029,
0031, 0036-0068, 0071-0082`, `blocked 6 = 0016, 0030, 0032-0035`, `todo 2 = 0069-0070`,
character-identical to `:38-40`; and the TC-Refs bijection holds for **all 82** rows with zero
mismatches. The "at 76ade4dd" stamp is current — `git diff 76ade4dd HEAD -- tdd/test-list.md` is
empty. A hand-maintained second copy of 82 statuses is the staleness class this run has been bitten
by four times; generating it is the correct response, not a shortcut.

**BL-8 — discharged.** Lines `:3024-3026` now carry `Row: TDD-0065, implementing TC-0017-0065`,
`Base revision: bc36f08c` and `Revision: a910c91c`. Both the `TC-ref` and the `Revision` the
contract names are present, and the block says why two revisions appear.

**BL-9 — discharged, and I re-affirm the resolution at this revision.** The table at `:119-127`
carries all seven fields `cross-spec-ownership.md#the-evidence-entry` fixes, `TDD-ID` included
(`TDD-0006` through `TDD-0012`). On `Resolution: re-reviewed`:
`packages/qfai/tests/integration/shippedWorkflowDetection.test.ts` is **unchanged** between
`90a33ee5` and `1ba7aecd` (`git diff --stat` empty), so round 5 confirmation still describes the
tree. The `Obligation at risk` field states a *structural* weakening — three degraded cases no
longer built independently — rather than an assertion change, which is the honest framing and is
what makes `re-reviewed` rather than a `CR-*` the correct resolution.

**BL-10 — discharged and verified by running the command.**
`node scripts/check-workflow-hygiene.mjs`, exit 0, tree clean before and after. The block at
`:300-313` matches the real output line for line: the PASS line, the three scope headings in order,
the seven rule names in order, and the "Not covered here" tail. The counts are now labelled *The
counts below the fence are mine, derived by reading it*, and the elision is declared. This is a
correction done properly.

**Rerun mode — discharged, and the six that say no mode applies are right.** All fifteen 0818/0820
CRs now name `confirm-only`, `re-derive`, or state that no mode applies. The six whose whole answer
is "no mode applies" — `CR-20260818-0002`, `-0003`, `-0004`, `-0005`, `-0006`, and
`CR-20260820-0008` — each target `packages/qfai/src` or `packages/qfai/assets/init/**`. The step-4
invocation table covers `spec-*/**`, `_policies/**` and `.qfai/contracts/**` only, so no `/qfai-sdd`
invocation exists for them and there is no mode to name. Correct. `CR-20260820-0006:155` goes
further and retracts its own earlier owner attribution — "the owner named here was wrong" — which
was round 5 M-2. Discharged too.

**Items 7/8/11 verdicts — discharged.** Lines `:3207-3223` record all three round-5 verdicts as
REVISE at `Reviewed revision: 90a33ee5`, name the pack, and record the two measurements reviewers
corrected. I checked the sources: `R01` says *Measured at `90a33ee5`*, `R03` says
*Reviewed revision: `90a33ee5`*, and `R02` the same. The revision claim is accurate for all three.

**Item 6, refactor verify — the numbers reproduce at HEAD.** I re-ran all six commands read-only at
`1ba7aecd`: `workflowHygiene` **30 passed (30)**; `ownWorkflowTopology` plus `vitestWorkspaceKnobs`
plus `sliceSurfaceAlignment` **35 passed** (27 + 5 + 3); `actionPinBumpOwner` plus
`layerCiLaneMapping` **15 passed** (8 + 7). Every one of the six recorded figures holds. This
matters because `5dab47ed` edited `workflowHygiene.test.ts` **after** the `76ade4dd` measurement, so
that pair was stale by construction and is nonetheless still true. Tree clean after each run; HEAD
unchanged.

**G1, 4424 versus 4426 — discharged.** Lines `:268-273` keep the 4424 run as taken and date the
4426 re-measurement beside it, with the reason both are kept. That is
`shared-skill-operating-baseline.md#nondeterministic-gates` applied correctly.

**F8 — spot-checked, sound.** `5dab47ed` replaces the rebuilding `declaration()` with an
`isContext` type predicate plus `filter`, so planted trees keep `$comment`, `why` and
`verificationSetNote`. It uses a predicate rather than a bare assertion, per `CLAUDE.md`, and the
commit message discloses that its own first attempt used one and was replaced before committing.

### Your finding against mine: you were right and I was wrong

**"Five DR entries" is refuted.** Measured, exactly as `CR-20260820-0007:159-170` states:

```text
git show 9aced5bb -- 07_Decisions.md | grep "^+### DR-"   ->  DR-0017-0007
git show 955eb2f1 -- 07_Decisions.md | grep "^+### DR-"   ->  DR-0017-0008, DR-0017-0009
added lines of both, all DR ids      ->  0004 x1, 0005 x2, 0007 x1, 0008 x1, 0009 x1
```

And the disambiguating check the CR did not need to make but which settles it:
`git show 42dd70cb:07_Decisions.md | grep "^### DR-"` lists `DR-0017-0001` through `DR-0017-0006`.
So `0004` and `0005` were headings **before** the implement run and appear in the added lines only as
cross-references, at `:27`, `:47` and `:78` of the two diffs. **Three entries were created, five ids
are mentioned. The record is correct and my round-5 count was wrong.** Recording the disagreement in
the CR with the commands, rather than silently amending a number, is the right treatment and I would
keep it there.

### Not repairable — both claims confirmed

**BL-2, rounds 1-4 have no pack. Confirmed.**
`grep -l spec-0017 .qfai/review/*/review_request.md` returns three packs; the earliest,
`review-20260805082718000/`, is the `/qfai-sdd`-stage pack. No `R0*.md` anywhere under
`.qfai/review/**` is an implement-stage report for rounds 1-4. The reports do not exist as artifacts,
and reconstructing a reviewer verdict from a commit message would fabricate the thing the gate exists
to obtain — worse than the gap. The disclosure at `:3220-3223` is the available remedy and it is
made. **One caveat that is not part of this finding**: the SDD-stage pack shows the repository has
form here — it holds nine reports across five rounds inside **one** pack
(`R03_completion-reviewer-round2.md` through `R09_completion-reviewer-round5.md`), which
`review-artifact-layout.md` forbids in terms: *Do not append ad-hoc per-round filenames inside an
existing pack.* Outside this run scope, but worth an owner-phase note.

**Item-12 clause 1. Confirmed.** `references/checkpoint-verification.md` requires *the counts **and**
the finding IDs … recorded in the slice evidence **before any row started**. A baseline written after
the fact is not a baseline.* The only pre-change measurement in the record is the bare `warning=352`
at `:446` — a count, no IDs — and it sits inside the change-1 narrative rather than in a baseline
section. Grepping the whole file for "baseline" returns eleven hits and none is an ID list. The
substitution is therefore permanently unavailable to this slice, which makes step 4 unsatisfiable by
any implementer action while `error=2` stands. **That is a user decision, not rework.**

**Clause 3 excess**: the arithmetic is right — 352 at HEAD equals 352 at `:446` — and the framing is
wrong. See M3.

## The item-10 deferral: legitimate, on a warrant weaker than the one cited

You asked whether the deferral is legitimate or whether that rule is about something else. **The
deferral is legitimate. The citation is about something else.**

- `references/evidence-revision.md:87-92` reads, in full: ***Read that bullet by what it says: any
  file the observation covered.** A commit that changes only the record … covers no file any
  observation ran against, so it does not stale one. This is what allows the anchors of an item to be
  written in the same commit that closes it, which is the only ordering under which several items
  sharing a file can all be current at once. Measure at the tip, then commit the record and the
  `done` transition together.*
- So the sentence is the **conclusion of a carve-out for record-only commits**. It says how to
  sequence the *closing* commit so that a record-only write does not invalidate the measurement just
  taken. It is not a licence to carry a stale observation across rounds — and the bullet immediately
  above it says the opposite in terms: *A commit that changes any file the observation covered
  invalidates it. **Re-run the observation; do not carry the verdict forward** because the change was
  unrelated.*
- **The load-bearing warrant is the other one the record gives**, at `:242-245`: item 10 is a
  **completion** gate, not a review gate; all three round-5 reviewers returned REVISE; every promoted
  row is at `refactor`; no row is closing on this evidence. That is correct and it is sufficient. With
  74 rows across six files, measure-at-the-tip-and-close-together is genuinely the only reachable
  ordering, so the deferral is the right call. It is just that `:236-240` presents a corollary as the
  rule.
- **The residual I would rank above the 56.** The stated policy makes each `:LINE:COL` value address
  *the file at that block landing revision*. Under that policy the 56 that miss at HEAD are not
  defects — they are addresses read against the wrong revision. What **is** unverified is the
  **23 of 74** that *could not be resolved under a rule tight enough to be trusted* at the revision
  each observation ran against. Those 23 are unconfirmed at **every** revision, not merely at HEAD,
  and the deferral does not cover them: a re-run at the closing revision produces new positions and
  still never establishes that the old 23 named what the prose says. Leaving them unresolved rather
  than guessed is the right choice, and `:222-224` says so — but the honest size of the open
  obligation is 23, not 56.
- **Severity**: not blocking. Recorded under required gates below.

## TDD-0069 and TDD-0070 staying todo: your reasoning holds, and it is tighter than you stated

- `references/execution-ledger.md:57-59`: *`Blocked-By` **takes** a Change Request ID
  (`CR-YYYYMMDD-NNNN`), a contract path with line …, **or** a cross-spec row
  (`spec-0006:TDD-0034`).* Read as exhaustive — and the corroborating evidence is that
  `#status-lifecycle:180-182` names exactly three causes for `todo -> blocked`: an upstream defect,
  an unresolved Change Request, or an unfinished row in another spec. One per value shape. Waiting on
  post-merge CI history is none of the three.
- `TDDLIST_BLOCKED_MISSING_REF` fires at **error** without a `Blocked-By`, so `blocked` is not
  reachable for these two rows without writing an out-of-grammar value. Between a false cell and a
  re-derived determination, the false cell is worse.
- **And the re-issue cost is mitigated in the tree.** Both rows carry the attribution in their
  `Evidence` cell — *NOT BLOCKED by a CR - waiting on data that does not exist yet* — plus the
  structural reason and the condition under which each becomes implementable. That cell is inside the
  unconditional carve-out, so the next agent meets the determination without re-deriving it, which is
  exactly what `#blocked-rows` protects against. And `todo` and `blocked` are equally
  completion-prohibiting: *It is **completion-prohibiting**, exactly like `todo`.* Nothing else turns
  on the choice.
- **Confirmed: `todo` is right.** The gap is upstream, and it is advisory A1, carried forward.

## Drift protocol: which cells moved, and whether each was inside the carve-out

**Clean, with one enumeration gap in the protocol itself rather than in the run.**

- **`90a33ee5` to `1ba7aecd`, the whole tree**: 27 paths. Under `.qfai/specs/**` exactly **one** —
  `spec-0017/tdd/test-list.md`. The rest are `.qfai/decisions/**` (14 modified, 1 added),
  `.qfai/evidence/implement-spec-0017.md`, `.qfai/report/validate.log`, four review-pack files, and
  five production/test files under `.github/` and `packages/qfai/tests/`.
- **Inside the ledger**: `Status` x6, `DR-ID` x6, `Evidence` x1 — all three unconditionally carved
  out by `drift-protocol.md#allowed-exceptions-minimal-whitelist`. `Test file` and `Selector` did
  **not** move for any of the 82 rows, so neither conditional cell was touched. `TC-Refs` and `Layer`
  byte-identical. No row added, removed or re-scoped. **Every moved cell is inside the carve-out.**
- **The whole run** (`f8ad8360~1..HEAD`) still shows exactly two files under
  `.qfai/specs/spec-0017/`: `tdd/test-list.md` and `07_Decisions.md`. The second is the
  self-reported upstream write, and `CR-20260820-0007` is open on it. Unchanged since round 5.
- **The new column.** `Blocked-By` carries no obligation identity, is not one of the four columns
  `drift-protocol.md:56-58` reserves (`TC-Refs`, `Layer`, `US-Refs`, `CON-API-Refs`), and is a
  documented member of the ledger schema at `execution-ledger.md:55`. Adding it is the remedy round 5
  named and I stand behind it. What the protocol does not do is **enumerate** it: the whitelist names
  five cells, and a whole new column is not among them — while `TDDLIST_BLOCKED_MISSING_REF` makes
  the `todo -> blocked` transition that `Status` *does* authorise unexecutable without it. That is
  the same deadlock the protocol section "Why Test file and Selector are conditional" is built from.
  Not a finding against the run; raised as advisory A4.
- **`QFAI-DRIFT-001` still cannot be relied on for `07_Decisions.md`.**
  `grep -c QFAI-DRIFT-001 .qfai/report/validate.log` is **0** at HEAD, with the file changed on this
  branch. The cause is unchanged from round 5, advisory A2.

## Which gate holds each row, and who can clear it

**No row may reach `done` at `1ba7aecd`.** Per group, with the holder and its owner:

| rows | holder | repairable by the implementer? |
| --- | --- | --- |
| all 74 `refactor` | **gate item 7** — `completion-reviewer` PASS. This verdict is REVISE. | yes: B1-B4 above |
| all 74 | **gate item 8** — `implementation-reviewer` PASS. Round 5 was REVISE; round 6 is concurrent. | the verdict is not the implementer to give |
| all 74 | **gate item 10** — the four sub-agent observations must name the **same** revision. They name their block base and landing revisions; HEAD is `1ba7aecd`. Deferred, legitimately, to the closing revision. | yes, **but only at a revision nothing else is holding** — so it is gated behind everything below |
| all 74 | **gate item 11** — the evidence file must record both reviewer verdicts *after items 7-8 returned PASS*. The recorded verdicts are REVISE. | follows 7 and 8 |
| all 74 | **gate item 12** — checkpoint verification, not attempted. Step 4 cannot exit 0 (`error=2`: `QFAI-ATDD-111`, `QFAI-ATDD-112`), and the measured-delta substitution is **permanently unavailable** because the clause-1 baseline can no longer be captured. | **no — needs a user decision** |
| all 82 | **`#spec-completion-conditions`** — no unresolved in-scope CR. **16 CRs are open**, at least 14 naming spec-0017 obligations; none is `approved` with `Applied at`. | **no — needs user approvals** |
| the 21 rows carrying a falsifiability trio | **gate item 3**, judged against `red-not-observable.md` while `CR-20260820-0006` disputes whether that reference admits any of their `Satisfied-by` values — 21 of 21 deviate. | **no — needs the CR decided** |
| all 74 | **gate item 10** again, its *fresh per-item entry* limb, while `CR-20260820-0008` disputes whether the section contract is satisfiable in this shape. Its `Blocked set` says `none`; on the step-1 reading that understates it, because the CR subject **is** a `done` gate for all 74. | **no — needs the CR decided** |
| `TDD-0016`, `0030`, `0032`-`0035` | `blocked` on `CR-20260818-0007`, `CR-20260820-0001`, `CR-20260820-0007` (four rows) | **no — needs user approvals** |
| `TDD-0052`, `0066`, `0067`, `0074`, `0075` | the `CR-20260820-0007` halt — see B3 | **no — needs the CR decided** |
| `TDD-0069`, `TDD-0070` | observational data that does not exist: three green `ci-pass` runs, and post-merge default-branch history. Neither is producible on the branch that introduces the change. | **no — needs a merge, i.e. a process action** |

**The two decisive holders are both the user.** The sixteen open Change Requests, and item-12 step 4.
Everything an implementer can do — B1-B4, M1-M5, L1-L3 — leaves both standing. I would say that
plainly in the next completion message rather than presenting the rework list as the path to `done`.

## Required gates and residual risks

- **16 open Change Requests**, none approved. `drift-protocol.md#multiple-open-change-requests` asks
  for this to be reported *rather than letting a queue of unanswered decisions read as normal*: the
  effective halt is the union of their blocked sets, which is `TDD-0016`, `0030`, `0032`-`0035`
  unconditionally, plus `TDD-0052`, `0066`, `0067`, `0074`, `0075` under B3.
- **`QFAI-PROFILE-001`** — the only recorded profile is `--profile tdd`. `QFAI-REVIEW-*` is not
  reported by it, which is why B4 survived five rounds. The full profile is owed before completion
  and will be the first observation of the pack layout.
- **Item-12 step 4** remains the checkpoint blocker (`CR-20260818-0006`), and clause 1 makes the
  substitution unreachable for this slice permanently.
- **23 of 74 oracle locators are unverified at every revision**, not only at HEAD. See the item-10
  section.
- **`QFAI-DRIFT-001` cannot be relied on for `07_Decisions.md` on this branch** — advisory A2.
- `.qfai/report/validate.log` at HEAD is `info=4 warning=352 error=2`, regenerated by `5dab47ed`, and
  matches every count the record quotes. I did not re-run it, and the reason is in the header.

## Sequencing notes (not findings)

- This pack has no `summary.json` **yet** and no `R01` or `R03` yet. The first is B4 once the round
  closes; the other two are the concurrent reviewers.
- The gate-completed evidence fields for round 6 — `Spec review`, `Code quality review`, checkpoint
  verification — cannot exist before these verdicts do. Their absence is the expected state at review
  time per `SKILL.md#per-item-evidence-contract-fresh-evidence-required`.
- `Resolution` in `## Cross-spec obligations` is filled with round 5 outcome; the round-6
  re-affirmation is in this report.

## Advisory / Change Request proposals

`Traces to: none` for all five. **Do not implement as production code or pin as a test assertion**
(`drift-protocol.md#reviewer-originated-obligations`); route to the owner phase.

- **A1** (carried) — the three `Blocked-By` value shapes cannot express *waiting on observational
  data that does not exist yet*, which is the real state of `TDD-0069` and `TDD-0070`. Propose a
  fourth shape, or a `blocked` warrant for unavailable data.
- **A2** (carried) — the approved-CR substring match in `QFAI-DRIFT-001` lets any approved CR that
  happens to mention a path silence a later, undisclosed edit to it, across stages and months.
  Propose scoping the match to CRs whose blocked set or `Impact` names the writing stage.
- **A3** (carried, and now stronger) — `red-not-observable.md` needs the third classification
  `CR-20260820-0006` asks for. **21 of 21** rows on that path in this spec are regression guards or
  seam-satisfied rows, so it is not the minority case the two-way split assumes.
- **A4** (new) — `drift-protocol.md#allowed-exceptions-minimal-whitelist` enumerates five ledger
  cells and does not name `Blocked-By`, yet `TDDLIST_BLOCKED_MISSING_REF` fires at **error** for a
  `blocked` row without it — so the `todo -> blocked` transition the carve-out authorises through
  `Status` cannot be written compliantly. This is the same deadlock the file own section on
  `Test file` and `Selector` documents. Propose adding `Blocked-By` to the unconditional list, with
  the same reasoning.
- **A5** (new) — `#drift-classes` under-determines a recurring shape: a CR that quotes two
  contradicting upstream excerpts (the defect reproduction form) while having several reasonable
  fixes (the intent precondition). Six CRs on this branch hit it and were first filed as `ambiguity`
  for exactly that reason. Propose a tie-break rule, or make the two classes orthogonal to the
  required-sections question.

## Rework list (ordered)

1. **B1** — `CR-20260820-0006`: 20 to 21 at four sites; add `TDD-0012` to class A and to the
   not-reset enumeration.
2. **B3** — `CR-20260820-0007`: make `Blocked set` name all nine rows unconditionally while
   `Status: open`, and scope the option-conditional table to the step-5 sweep.
3. **B2** — `CR-20260820-0008`: drop the `relevant-test-suite.md` attribution, restate the tension as
   *this run used an aggregate RED that Phase Red step 4 already forbids*, reframe option 2, and
   extend the scope to the shared `Refactor verify` pair and the shared reviewer-verdict table, or
   file those separately.
4. **B4** — write `summary.json` for `review-20260820140000000/` and for this pack when it closes,
   then run the full profile so `QFAI-REVIEW-*` is observed at least once.
5. **M1** — restate the B7 sweep as *new test cases added versus failures recorded*, with the
   per-group table. The current proviso is false for `workflowHygiene.test.ts` at three of the
   revisions it covers.
6. **M2** — fix "Fourteen are open" (sixteen) and "four of them" (three) in `## Objective`.
7. **M3** — stop calling 352 the baseline value; it contradicts `:453-456` and the clause-1 "none
   was" in the same sentence.
8. **M5** and **M4** — one sentence per CR on `intent` over `defect`; retitle
   `CR-20260818-0007:40`; and either add `## Reproduction` to the eight `defect` CRs or say where the
   reproduction lives.
9. **L1**, **L2**, **L3**.

Nothing in this list reaches `done` for any row. The two holders that do are in *Which gate holds
each row*, and both are the user.

## Measurement integrity

`git status --porcelain` was **empty** at start, after `node scripts/check-workflow-hygiene.mjs`,
after each of the three suite runs, and at finish. `git rev-parse --short HEAD` was **`1ba7aecd`** at
start and at finish; **HEAD did not move.** The promise in the request was kept, and it is what makes
this the first round whose findings need no pinning caveat. Scratch files under `tmp/r02b/` only;
`.qfai/report/validate.log` deliberately not regenerated, because it is tracked and two reviewers
were reading the same tree. I did not read `R01` or `R03` for this round; this verdict is independent
of them.
