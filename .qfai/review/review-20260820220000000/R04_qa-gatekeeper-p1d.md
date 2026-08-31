# R04 — qa-gatekeeper, P1d branch-3 DR gate

- Reviewer: `qa-gatekeeper`
- Stage: `/qfai-atdd spec-0017`, gate **P1d**
- Audit subject: `.qfai/decisions/DR-0017-0010-two-tuning-guard-rows-cannot-be-reddened-before-the-history-they-measure-exists.md`
- Rows: `TDD-0069`, `TDD-0070`
- Revision reviewed: `16f611c7` (`git status --porcelain` empty at start and at finish)
- Verdict: **REVISE**

## Scope of this gate

Narrow and single-artifact, per `.qfai/assistant/skills/qfai-atdd/SKILL.md` P1d and
`references/red-provenance.md`: the row identity (`Layer`, `Test file`, `Selector`), the
obligation reference the `Layer` selects, the `DR-ID`, and the DR artifact. The judgement is
whether **branch 3 was reached honestly** — that branches 1 and 2 were genuinely tried and
genuinely unavailable — not whether the rows matter.

Nothing was mutated except this file. No `validate` run was needed: `.qfai/report/validate.log`
and the CI run at HEAD's own sha (`32368851703`, `headSha 16f611c7`) both report `error=2` with
the same two rules, so HEAD-accurate validate evidence was available read-only.

## Evidence shape: SATISFIED

`references/red-provenance.md` section "Evidence shape", `exception` row, requires row identity
plus the obligation reference recorded **before** P1d routes, then the `DR-ID` and the artifact.
All four are present and verified. The REVISE below is about **content**, not structure — the
repair should correct three claims, not restructure the record.

## Verified correct

1. **Row identity is exact on all three fields, both rows**, against
   `.qfai/specs/spec-0017/tdd/test-list.md:107-108`: `Layer = Integration`;
   `Test file = packages/qfai/tests/assets/actionPinBumpOwner.test.ts`; selectors
   `TC-0017-0069 (TDD-0069): one tuning change per pull request, behind three green runs` and
   `TC-0017-0070 (TDD-0070): a rerun-to-green rate above one in twenty reopens it`.
2. **Both rows are genuinely `todo` with `DR-ID = -` and `Blocked-By = -`.** Column-by-column
   read of the ledger confirms it.
3. **Obligation references are exact.** `06_Test-Cases.md:134-135` gives
   `TC-0017-0069 -> EX-0017-0053` and `TC-0017-0070 -> EX-0017-0054`, both under `AC-0017-0029`.
4. **`58c29d9f` recorded the row identity before any gate routed.** That commit does **not**
   touch the ledger, but it writes `.qfai/evidence/atdd-spec-0017.md` sections `TDD-0069` and
   `TDD-0070` with `Layer` / `Test file` / `Selector` / obligation — which is where
   `red-provenance.md` puts branch-3 evidence. The claim holds as written.
5. **Not in `CR-20260820-0007`'s blocked set.** That set is
   `TDD-0032, 0033, 0034, 0035, 0052, 0066, 0067, 0074, 0075` — nine rows, neither of these.
6. **Placement and ID are correct.** `constitution/drift-protocol.md:62-65` whitelists
   *creating* `.qfai/decisions/DR-<id>-<slug>.md` with the `07_Decisions.md` ID scheme; that
   file's last entry is `DR-0017-0009`, so `DR-0017-0010` is the next id and collides with
   nothing.
7. **"Branch 3 does not close a spec" is discharged.** The DR names both permitted endings,
   states that the spec stays open, and points at the user-owned `TDDLIST-001` waiver — which
   `drift-protocol.md:163-166` confirms creating the record does not substitute for.
8. **`exception` is the right status, not `blocked`.** The DR does not consider `blocked`, so I
   checked it: `execution-ledger.md:185-187` scopes `todo -> blocked` to "an upstream defect, an
   unresolved Change Request, or an unfinished row in another spec". Waiting on CI run history is
   none of the three. `execution-ledger.md:322-323` puts "an obligation with no persisted form or
   no observable surface at L5" in `exception`. The alternative closes in the DR's favour.
9. **Counts are exact.** 71 `Integration` rows = 63 `refactor` / 6 `blocked` / 2 `todo`.
10. **PR #794 is this branch's PR, OPEN**, twelve runs exist, none green — verified live.
11. **`TDD-0070`'s branch analysis is sound and I sustain it standalone.** `EX-0017-0054` and
    `BR-0017-0054` do say what the DR says: a rerun-to-green rate over **default-branch**
    aggregate-verdict runs *after a merge*. That cannot exist pre-merge, so branch 1's GREEN is
    unavailable in principle and branch 2 has no satisfied state to mutate. It is branch 3's own
    named example.
12. **"Branch 1 fails on the GREEN side" is a legitimate ground.** `red-provenance.md` section
    "What each stage gate owes" (P1c) requires a branch-1 row to return with the tree green, so a
    row that can never go green cannot take branch 1. The DR reasons this way without citing the
    clause; the reasoning is right.

## Blocking findings

### B1 — the obstacle keeping `TDD-0069` from GREEN is mischaracterised as external

The DR writes: "the required context is still failing on a repo-wide `QFAI-ATDD-111` unrelated to
this row." Three things are wrong in that sentence.

- **Not repo-wide.** `.qfai/report/validate.log:25-26` scopes both errors to
  `.qfai/specs/spec-0017`.
- **Not one error, two.** The DR names only `QFAI-ATDD-111`.
- **The unnamed one names these two rows.** `QFAI-ATDD-112` reads, in the log:
  "宣言 Level が指すディレクトリで参照されていない TC があります: tests/integration/** ->
  SPEC-0017:TC-0017-0016, ..., SPEC-0017:TC-0017-0069, SPEC-0017:TC-0017-0070".

Confirmed independently at HEAD: a repo-wide grep for `TC-0017-0069` / `TC-0017-0070` across
every `.ts` / `.mjs` / `.js` file returns **nothing**. And `QFAI-ATDD-111`'s subject,
`US-0017-0007`, is the parent of `AC-0017-0029` (`03_Acceptance-Criteria.md:311-312`) — the
acceptance criterion both rows belong to. Neither error is "unrelated to this row"; one is
constituted by these two rows' own absence from the tree.

### B2 — the consequence B1 hides is a circular gate, so the stated exit for `TDD-0069` is unreachable

The DR's section "What closes them" says `TDD-0069` "becomes implementable once PR #794 has three
consecutive green `ci-pass` runs to cite". Trace it at HEAD:

- `ci-pass` derives its verdict from `needs` (`.github/workflows/ci.yml:469-541`), so it fails
  when `build` fails;
- `build` runs `qfai validate --fail-on error` and exits 1 on `error=2`;
- one of those two errors is `QFAI-ATDD-112`, raised *because* `TC-0017-0069` and `TC-0017-0070`
  are unannotated.

Run `32368851703` at `headSha 16f611c7`: `build` failure, `ci-pass` failure, "CI job build
concluded failure", and "qfai validate summary: error=2 warning=372 info=5 ... result=FAIL".

So a green `ci-pass` requires the annotation; the annotation requires a passing test for
`TC-0017-0069`; and that test cannot pass without the three green runs. The exit path the DR
records **cannot be followed**, and a later reader following it waits for runs that cannot occur.

This is also where the DR's framing fails: "a timing fact rather than a defect" and "a property
of when the branch is, not of what it contains" are true of `TDD-0070` and false of `TDD-0069`. A
self-referential gate is a property of what the branch contains, and it is the arrangement-defect
class `CR-20260820-0007` was filed for. Branch 3 may still be the correct branch for `TDD-0069` —
I am not disputing the destination — but the recorded reason is not the real one, and
`red-provenance.md` branch 3 requires the record to name "what made both branches unavailable"
while `execution-ledger.md:322-323` requires it to name "what is missing".

### B3 — `EX-0017-0053` is quoted only in the half that supports the conclusion

`05_Examples.md:84` reads, in full: "**Exactly one runner project is tuned, largest first**, and
three consecutive green aggregate-verdict runs are recorded with their run identifiers quoted in
the description". The DR drops the first clause at both occurrences (its section "The anomaly"
and its section "What closes them").

That clause is precisely what a branch-1 / branch-2 analysis owed, because it *is* checkable
against the tree today: `packages/qfai/vitest.knobs.ts` declares the worker axes at the root with
`projectKnobs` applied uniformly, and `.qfai/evidence/timing-workers-spec-0017.md` records `core`
as largest by measurement. Whether that half is satisfied, degenerate, or unassertable because
the runner scopes the worker axis to the root — the subject of `CR-20260820-0003` — is the
question the record does not ask.

Note this most likely cuts **toward** the DR's conclusion. That is why it is a defect of rigour
rather than of outcome: the DR's own section "What a reviewer is being asked to judge" claims
branches 1 and 2 "were genuinely tried", and on the half of the obligation that is live today,
they were not examined.

## Non-blocking findings

### N1 — "the workflow changes that produce an aggregate verdict are unmerged" is not `TDD-0069`'s reason

The `ci-pass` aggregate-verdict job is present at HEAD (`.github/workflows/ci.yml:469`) and ran on
this PR. `EX-0017-0053`'s obligation is **pre-merge** ("three consecutive green ... runs before
merge"), so "unmerged" is `TDD-0070`'s reason imported into `TDD-0069`'s paragraph. What is true
is that the runs exist and are not green.

### N2 — "`CR-20260820-0006`'s twelve rows" cites the one figure that CR documents as wrong

That CR was corrected twice; its final classification is 13 class-A / 4 class-B / 4 class-C = 21
rows, with class A ("obligation already satisfied") at **13**. Its own words: "three filings,
three wrong counts, each one introduced by the fix for the previous ... the number is not the
check. Derive it from the ledger." The **distinction** the DR draws from CR-0006 is real and I
sustain it — class A had satisfied state to mutate, these two have none — but the count should not
be restated.

### N3 — `.qfai/evidence/atdd-spec-0017.md` still contradicts itself after this repair

Not the DR's defect, but `/qfai-implement` step 3b reads this file on handover and three of its
statements now describe a state that no longer holds:

- line 326: "Branch 3, `DR-*` pending, parked" (section `TDD-0070`);
- line 522, finding 8: the rows "need a `DR-*` this stage may not author", "Same authorship gap as
  `CR-20260820-0007`" — retracted by the same file's lines 263-272;
- line 543: "parked on branch 3 with the `DR-*` pending".

Line 539 also attributes `error=2` to `QFAI-ATDD-111` alone, repeating B1's omission. The
"Ledger rows advanced" table (lines 260-261) correctly names `DR-0017-0010`, so the handover
pointer itself resolves.

## Gate decision

**REVISE.** `/qfai-implement` may **not** write `todo -> exception` on the strength of this
artifact yet.

The reason is narrow and does not concern the destination. `TDD-0070`'s account is sustained.
`TDD-0069`'s is not: the record names an obstacle as "repo-wide" and "unrelated to this row" when
the validate log's second error names the row's own TC ids and the first names its own parent US
(B1); it records a closure condition that cannot be reached (B2); and it summarises its governing
example without the half that is live today (B3). The `DR-ID` cell is what a later reader follows
back to this record, so the record has to be right about the anomaly for both rows it covers.

## Required to clear this gate

1. Correct the `TDD-0069` obstacle statement to name **both** validate errors, their `spec-0017`
   scope, and that `QFAI-ATDD-112` names `TC-0017-0069` and `TC-0017-0070`.
2. Replace the `TDD-0069` closure condition with one that is reachable, or state plainly that the
   gate is self-referential on this branch and say what breaks the cycle. If the honest answer is
   that the arrangement is defective, file the Change Request — `CR-20260820-0007` is the
   precedent for exactly this filing, and the DR is not a substitute for it.
3. Quote `EX-0017-0053` whole, and record what the branch-1 / branch-2 examination found for its
   "exactly one runner project is tuned, largest first" half.
4. Drop or re-derive the `CR-20260820-0006` count (N2), and drop the "unmerged" reason from
   `TDD-0069` (N1).
5. Recommended, outside this gate: clear the three stale "pending" statements in
   `.qfai/evidence/atdd-spec-0017.md` (N3).

## Residual risk if this were passed as-is

A governance record would stand as the permanent explanation for two parked rows while being wrong
about why one of them is parked, and pointing its reader at an exit that cannot be taken.
`exception` is cleared only by `exception -> todo` when the anomaly resolves, so a wrong account of
the anomaly is what decides when — or whether — anyone tries again.

## Sign-off

- [x] Review verdict is explicit — **REVISE**
- [x] Findings cite concrete artifacts, line numbers, and live run ids
- [x] Required gates and residual risks are recorded
