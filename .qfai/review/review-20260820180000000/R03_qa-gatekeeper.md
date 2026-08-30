# R03 — qa-gatekeeper

**Result: REVISE**

**Answer to the question this round exists to answer: NO ROW MAY REACH `done`.**
Not one of the 82. The single decisive holder is **gate items 7 and 8** — both blocking
reviewers have a **recorded `REVISE`**, and items 7/8 require PASS. Every other finding
below is behind that one.

## Provenance

| | |
| --- | --- |
| Revision measured | `1ba7aecd` (`git rev-parse --short HEAD` at start **and** at end — HEAD did not move) |
| `git status --porcelain` at start | **empty** |
| `git status --porcelain` at end | **empty** |
| Method | all gates run from a `git archive HEAD` shadow root at `tmp/r6-shadow`, with `node_modules` junctioned in, so `validate` wrote the tracked `.qfai/report/validate.log` **inside the shadow** and never in the working tree |
| Scratch | `tmp/r6-shadow`, `tmp/r6-audit` only |
| Mutations applied to the tree | none, other than this report file |

The revision discipline held this round. Pinning was not needed.

## Gates: measured, not accepted

Every number you gave reproduces exactly.

| Gate | Your claim | My measurement at `1ba7aecd` | |
| --- | --- | --- | --- |
| `pnpm ci:lint` | exit 0 | **exit 0** — all eleven members run individually: `prettier -c`, `eslint --max-warnings 0`, `markdownlint-cli2`, `check-bidi`, `check-instructions-size`, `check-review-profile-consistency`, `check-prompt-scanner-pair`, `check-workflow-hygiene`, `lint:shipping`, `lint:workflow-shape`, `check-pack-locations` | CONFIRMED |
| `validate --profile tdd --fail-on error` | exit 1, `info=4 warning=352 error=2` | **exit 1, `info=4 warning=352 error=2`** | CONFIRMED |
| `pnpm -C packages/qfai test:scripts` | 135 passed | **10 files, 135 passed, exit 0** | CONFIRMED |
| `pnpm -C packages/qfai test` | 431 files, 4426 passed / 37 skipped, exit 0 | **431 passed \| 8 skipped (439); 4426 passed \| 37 skipped (4463); exit 0; 190.39s** | CONFIRMED |

`QFAI-TEST-001` findings: **0**. The two errors are `QFAI-ATDD-111` and `QFAI-ATDD-112`.
Read from `validate-tdd.json` rather than the console, their `spec-0017` members are:

- `QFAI-ATDD-111` — `SPEC-0017:US-0017-0001` … `US-0017-0009` (all nine)
- `QFAI-ATDD-112` — `TC-0017-0016`, `0030`, `0032`, `0033`, `0034`, `0035`, `0069`, `0070`
  — **exactly the six `blocked` plus the two `todo` rows, and nothing else.**

Your claim that no promoted row's TC is in that list is **verified**. So is the claim that
spec-0017 contributes **zero** warnings: I filtered all 352 case-insensitively for
`spec-0017` and got **0** hits. No `TDDLIST_STALE_STATUS`, no `TDDLIST_SELECTOR_UNRESOLVED`,
no `TDDLIST_EVIDENCE_STATUS_ONLY`, no `TDDLIST_EVIDENCE_EMPTY`, no
`TDDLIST_BLOCKED_MISSING_REF` for this spec. That is a genuinely clean ledger surface.

## The 12-point gate, per item

Population: **82 rows — 74 `refactor`, 6 `blocked`, 2 `todo`.** Counted from the ledger;
matches your statement.

| # | Item | Verdict | Rows held | Repairable by |
| --- | --- | --- | --- | --- |
| 1 | TDD-ID selected / in progress | PASS | — | — |
| 2 | Failing test added first (or falsifiability substitute) | **FAIL** | `TDD-0008`, `0010`, `0011`, `0068`, `0079` | implementer |
| 3 | RED observed (admissible) | PASS for 72; **FAIL** for `TDD-0068`, `0079` | 2 | implementer |
| 4 | Minimal production code (waived on the trio path) | PASS | — | — |
| 5 | GREEN observed **+ `Oracle proof`** | **FAIL** | `TDD-0008`, `0010`, `0011`, `0068`, `0079` | implementer |
| 6 | Refactor performed, GREEN re-confirmed | **PASS** (see ruling 3) | — | — |
| 7 | `completion-reviewer` PASS | **FAIL — recorded REVISE** | **all 74** | reviewer round |
| 8 | `implementation-reviewer` PASS | **FAIL — recorded REVISE** | **all 74** | reviewer round |
| 9 | Prototype parity (UI) | N/A — no row affects a UI surface | — | — |
| 10 | Status current, anchor resolves, four observations name one revision | **FAIL** | all 74 | blocked behind 7/8 |
| 11 | Evidence appended with both verdicts after 7-8 PASS | **not yet reachable** | all 74 | downstream of 7/8 |
| 12 | Checkpoint verification | **FAIL** | all 74 | **USER DECISION** |

The 6 `blocked` and 2 `todo` rows are completion-prohibiting by status
(`execution-ledger.md#blocked-rows`: "It is **completion-prohibiting**, exactly like
`todo`"), so they fail at item 1.

## Rulings on the six questions you asked

### 1. The trio population — 21 confirmed; the CR is stale by one, for the second round running

The ledger holds **21** rows carrying all three fields. `Satisfied-by` = 21,
`Falsifiability command` = 21, `Falsifiability result` = 21 — no row carries a partial trio,
and no row carries both a numeric RED pair and a trio (the seven that quote a file-scoped RED
run say explicitly "THIS ROW WAS AMONG THE PASSING", which is the honest form, not a double
claim). Your count of 21 is right; my round-5 count of 20 predated the `TDD-0012` repair and
is consistent with it.

**But `CR-20260820-0006` still enumerates twenty.** Measured:

```text
class A  12  0024 0026 0036 0038 0041 0042 0043 0055 0056 0068 0080 0082
class B   4  0004 0078 0079 0081
class C   4  0018 0025 0031 0075
class table total   20
step-3 enumeration  20
ledger              21
missing from BOTH:  TDD-0012
```

Step 3 says "re-grep the ledger for `Satisfied-by:` and confirm **twenty** cells". A
compliant tree holds 21, so **the CR's own cross-check fails against a correct tree** —
which is precisely the defect the "Correction: twenty rows, not thirteen" section was added
to fix. 13 -> 20 -> 21: the same off-by-N, three filings running. The `Blocked set` line
("all twenty rows carry the trio") is stale the same way. Repairable by the implementer,
one-line edits.

**Ruling on the deviation itself: the deviation remains acceptable evidence while the CR is
open.** `Satisfied-by`'s substantive function is to identify what already satisfies the
obligation, which is what makes item 4's waiver legitimate. Naming an artifact and the
property it already had discharges that function; writing a `TDD-NNNN` that does not exist
would not. This is an upstream vocabulary gap, and my charter routes upstream gaps as
advisory/CR rather than sending the implementer to rewrite 21 cells. Your class-C
reclassification of `TDD-0025` is correct — `DR-0017-0003` was written on this branch by
`42dd70cb`, so "pre-existing" would be false.

Note the scope limit: an open in-scope CR does **not** hold an individual row out of `done`
(the 12-point gate has no CR clause), but it **does** block spec-level completion
(`SKILL.md#spec-completion-conditions`: an in-scope CR with `Status: open` is unresolved).

### 2. The mutant hashes — narrowing CONFIRMED, and it is still one step short

Measured: **16 oracle tables**. Exactly **one** carries literal needle/replacement columns —
change 1's, at evidence line 409. The other fifteen carry `mutation` or `row` + `mutant` +
`reddens`, i.e. a description and no literal bytes. Your narrowing is exactly right.

What the narrowed paragraph still overstates: it says "Where literal bytes are recorded, the
hash checks a reconstruction." **That set is empty.** The one table with literals records
`(uncommitted tree)` in its `mutant blob` column for both rounds — no hash at all. So across
all sixteen tables, literals and hashes **never co-occur**, and the fingerprint is inert
everywhere it appears, not just in fifteen of sixteen places. One sentence to fix; the
underlying record (description plus assertion locations) is unaffected and is what
`oracle-strength.md` actually needs.

### 3. Item 6 — one pair per block command SATISFIES the contract. No CR needed.

I re-ran all six at `1ba7aecd`. Every count reproduces exactly:

```text
tests/scripts/ownWorkflowTopology.test.ts   exit 0   Tests 27 passed (27)
tests/scripts/workflowHygiene.test.ts       exit 0   Tests 30 passed (30)
tests/scripts/sliceSurfaceAlignment.test.ts exit 0   Tests  3 passed (3)
tests/scripts/vitestWorkspaceKnobs.test.ts  exit 0   Tests  5 passed (5)
tests/assets/actionPinBumpOwner.test.ts     exit 0   Tests  8 passed (8)
tests/assets/layerCiLaneMapping.test.ts     exit 0   Tests  7 passed (7)
```

And I mapped every promoted row's `Test file`: **all 74 land on one of the six**, with no
file outside the set. Distribution 26 / 27 / 3 / 3 / 8 / 7.

Three reasons this is compliance rather than deviation:

1. The six commands are exactly the **file-scoped** runs the contract's own references
   prescribe — `checkpoint-verification.md` step 1 requires the file-scoped form and warns
   against narrowing to the `Selector`, because a vitest `-t` reads `(` and `)` as a capture
   group, matches nothing, and **exits 0**.
2. "Written once for the item as a whole" is a **de-duplication instruction against
   `Round N:` prefixes**, not a prohibition on one record covering several items. The
   contract's contrast is with per-round, not with per-file.
3. Each row's `Selector` resolves in its named file (zero `TDDLIST_SELECTOR_UNRESOLVED` for
   this spec), and each run reported **0 failures**. A 0-failure file-scoped run is a
   per-row re-confirmation, not the "full-suite pass that does not name the row's selector"
   my charter rejects.

Two record repairs, neither a CR:

- The `Rows covered` column names **blocks**, not `TDD-ID`s, and at least two blocks are not
  named by any entry — "The expected-required-context declaration" (`TDD-0013`, `0037`,
  `0057`, `0058`, `0059`) and "The shipped tree joins the lane" (`TDD-0050`, `0051`, `0053`,
  `0054`, `0055`, `0056`) are both in `workflowHygiene.test.ts`, whose entry reads "changes
  2, 3 and the hygiene rule-set blocks". "the required-context block" is also ambiguous
  between two blocks of that name. Coverage **is** complete — I verified it by file — but a
  reader cannot confirm it from the column.
- The label "Measured at `76ade4dd`, after every round-5 edit" is three commits stale, and
  `5dab47ed` changed `workflowHygiene.test.ts` **after** `76ade4dd`. I re-measured, so the
  numbers hold at HEAD; the revision label does not.

### 4. Items 7/8/11 — you are right, and I concede the round-5 framing

`SKILL.md` is explicit: the gate-completed fields "record verdicts that do not exist until
the reviews have run. A reviewer MUST NOT treat their absence as a blocking gap during
review — an evidence file complete in its phase-authored part and missing only the verdict
fields is the expected state at review time." Calling their absence a blocking 74/74 gap at
review time was over-strict, and I withdraw that framing.

It changes nothing about the outcome, because they are no longer absent — they are
**present and they say REVISE**:

```text
Spec review          REVISE — completion-reviewer,     Reviewed revision: 90a33ee5
Code quality review  REVISE — implementation-reviewer, Reviewed revision: 90a33ee5
Gatekeeper           REVISE — qa-gatekeeper,           Reviewed revision: 90a33ee5
Prototype parity     not applicable
```

Items 7 and 8 require **PASS**. A recorded REVISE is a harder failure than an absence, and
it is the reason no row may reach `done`. Item 11 is downstream of 7-8 by construction and
is not independently blocking.

### 5. Item 10 — the deferral IS legitimate; item 10 still fails, for a reason the deferral does not reach

**The deferral is legitimate.** I measured the locators independently and corroborate the
finding: **79 distinct `(file, line, col)` locators, 16 landing on an assertion at HEAD, 63
not** (34 on a comment, 6 on a blank line, 23 on other non-assertion source). Your 74/18/56
is the same finding under a slightly tighter tokenisation — I do not contradict it.

`evidence-revision.md` does support the ordering you cite. Read in context, "Measure at the
tip, then commit the record and the `done` transition together" resolves the paradox that a
record-only commit would otherwise stale the record it writes, and it is explicitly "the
only ordering under which several items sharing a file can all be current at once". With 82
rows on six files and 24 commits touching them, re-deriving 74 positions per commit is the
loop the rule exists to break. Measuring it, stating the policy, naming the discharge point
and saying "neither substitutes for a re-run" is the right handling, and I accept it.

**Item 10 nevertheless fails for all 74, on a second ground.** It also requires that "the
item's four sub-agent observations (items 3, 5, 7, 8) all name the **same** revision".
Measured: the record carries **17 distinct `Base revision` values** across its blocks
(`3dbeeef6`, `08214aeb`, `a8a9e4e3`, `28b7a8e2`, `9b5b174b`, `01c9f6ff`, `d8e58fe0`,
`e0396c62`, `9aced5bb`, `2a3ef61c`, `4ec429e3`, `dd894914`, `4e29a2a4`, `4a4c0954`,
`8bd05615`, `955eb2f1`, `bc36f08c`), the reviewer verdicts name `90a33ee5`, and HEAD is
`1ba7aecd`. No row has four observations at one revision, and items 7/8 are REVISE, so there
is nothing to compose. That is not deferrable — but it is also **not actionable until a round
in which both reviewers PASS**, so item 10 is not the operative blocker and I am not asking
you to work on it now.

**One upstream tension worth a CR, advisory only.** A RED is by definition observed *before*
the production code exists, so the revision at which RED was observed can never be the
revision the row lands at. Read literally, item 10's same-revision clause is unsatisfiable
for every row in every spec. Something has to give — most likely that the falsifiability /
oracle round, which *is* re-runnable at the tip, is what re-affirms items 3 and 5 at the
closing revision. That is a contract question, not implementer work, and I will not send
anyone to satisfy an obligation the contract does not clearly state.

### 6. Item-12 clause 3 VERIFIED; clause 1 "unrepairable" is CORRECT — and needs your decision

**Clause 3 verified.** `warning=352`, the baseline value. The +6 is gone: of the four
remaining `TDDLIST_STALE_STATUS` findings, one is `spec-0003` and three are `spec-0012` —
**none is spec-0017**. And `TDDLIST_BLOCKED_MISSING_REF` does not fire, so the validator
accepts all six `Blocked-By` values.

**The migration is clean.** I diffed all 82 rows cell-by-cell across `bc36f08c` -> HEAD:

```text
rows 82 -> 82,  columns 8 -> 9,  rows added 0, rows removed 0
TDD-0016/0030/0032/0033/0034/0035  Status todo -> blocked
                                   DR-ID  CR-* -> '-'
                                   Blocked-By '-' -> the same CR-*
TDD-0012                           Evidence grew 303 -> 1123 chars (the B7 repair)
NOTHING ELSE MOVED.
```

Moving the CR out of `DR-ID` into `Blocked-By` is exactly what `execution-ledger.md`
prescribes ("`DR-ID` is **not** widened to carry it").

**Clause 1: your claim is correct and I am ruling it unrepairable.** The clause says a
baseline must be "captured before the slice's first code change and recorded in the slice's
evidence **before any row started**", and then: "A baseline written after the fact is not a
baseline." Writing one now is excluded by the clause's own sentence. Borrowing
`spec-0006`'s (`CR-20260818-0006` quotes `info=4 warning=352 error=2` from
`.qfai/evidence/implement-spec-0006.md`) does not work either — the clause says *the
slice's* evidence.

Consequence, stated plainly: **the step-4 substitution is unavailable, so step 4 must exit 0,
and it exits 1. Item 12 fails for all 74 rows and the implementer cannot repair it.** For
completeness, clauses 2-5 all hold — 2: zero `QFAI-TEST-001`; 3: 352 = 352; 4: no promoted
row's TC is in the `QFAI-ATDD-112` list; 5: the standing errors name `US-0017-*` (an ATDD
obligation no row carries) and the TCs of the eight non-promoted rows. Four of five hold and
the fifth is structurally closed.

**This needs a decision from you**, one of:

- amend `checkpoint-verification.md` clause 1 to admit a baseline pinned to a named earlier
  revision and reconstructible from it (`git show <rev>` plus a re-run), which is what would
  make this recoverable in general;
- waive item 12 for spec-0017 with a recorded DR;
- or clear the two `QFAI-ATDD-*` errors, which is not reachable from here — the spec-0017
  half of `QFAI-ATDD-112` is behind CR-blocked rows and missing post-merge data, and
  `QFAI-ATDD-111` is `/qfai-atdd` scope (see finding N7).

`CR-20260818-0006` does **not** cover this: it is about clause 3, and it records clause 1 as
*holding* for spec-0006.

## The two things you asked me to be sceptical about

### The six `blocked` rows — CORRECT on every count I can check

| check | result |
| --- | --- |
| Is `blocked` reachable from where each row was? | **Yes.** All six were `todo` at `bc36f08c` and across the twelve preceding ledger revisions. `todo -> blocked` is the listed edge. |
| Is each `Blocked-By` value legal? | **Yes.** All three distinct values are `CR-YYYYMMDD-NNNN` Change Request IDs — the first of the three forms `execution-ledger.md` allows. |
| Does the named CR name the row back? | **Yes, all six.** `CR-20260818-0007` -> "spec-0017 TDD-0016"; `CR-20260820-0001` -> "spec-0017 TDD-0030"; `CR-20260820-0007` -> "TDD-0032, TDD-0033, TDD-0034, TDD-0035 unconditionally". |
| Are all three CRs live? | **Yes**, all `Status: open`. |
| Are they the right six? | **Yes.** Each row's stated reason is that implementing it requires choosing the rule's meaning (`TDD-0016`), an impossible three-way reconciliation (`TDD-0030`), or a `07_Decisions.md` write this skill is forbidden (`TDD-0032`…`0035`). None is "not started yet"; each is "cannot be started". |

**But `CR-20260820-0007` also conditionally blocks five rows that are at `refactor`.** Its
blocked set continues: "`TDD-0052, TDD-0066, TDD-0067, TDD-0074, TDD-0075` under options 2
and 3 only". The CR is open, so no option is chosen — meaning **if you approve option 2 or
3, five rows currently at `refactor` become blocked retroactively**, and their recorded
evidence would be against an obligation the CR changes. Those five must not reach `done`
before that CR resolves, whichever way it goes. That is a per-row holder in addition to
items 7/8, and it is a **user decision**.

**`TDD-0069` / `TDD-0070` staying `todo` — your reasoning is right.** `Blocked-By` takes a
CR ID, a contract path with line, or a cross-spec row. "Waiting on twenty post-merge
default-branch runs" is none of the three, and `blocked` without a legal `Blocked-By` raises
`TDDLIST_BLOCKED_MISSING_REF` at **error**. So `blocked` would be a worse record than `todo`,
and nothing is lost in gate terms — both are completion-prohibiting. Advisory: `blocked`
*semantically* fits ("cannot be started") and the limitation is the `Blocked-By` vocabulary,
which has no value for "an external event that has not happened". That is the same class of
gap as `CR-20260820-0006` one level over, and worth its own CR.

### `TDD-0065` — the round-5 ruling HOLDS at `1ba7aecd`

Verified unchanged in substance. The only diff since `90a33ee5` is that the block **gained**
`Row`, `Base revision: bc36f08c` and `Revision: a910c91c` (the BL-8 repair); the RED, GREEN
and oracle table are untouched. Re-measured at HEAD:
`tests/assets/actionPinBumpOwner.test.ts` -> **8 passed (8)**, matching the recorded GREEN.

It remains the strongest block in the record, and the reasons are worth restating because
they are the standard the other blocks are not meeting:

- the RED is an **assertion** inside the row's own test, naming the predicate the row owns
  ("the artifact must name the largest project and its test count: expected null not to be
  null"), against the prescribed minimal seam;
- the oracle mutations are all inside the artifact **this row owns**, not a shared helper —
  none is a syntax error, a thrown "not implemented", or a deleted export;
- each round names an **assertion message**, not a `:line:col`, so the record does not decay;
- `U2` is a genuinely discriminating oracle: it makes the artifact *more* self-consistent
  and *more* compliant-looking, and the row still fails. That is the property
  `oracle-strength.md` is asking for;
- `U6` is a control that reddens nothing;
- the `U3` self-report — a mutation that did not actually violate the property, producing a
  false "reddens nothing" — is disclosure that raises confidence rather than lowering it.

It is the only block carrying both a base and a landing revision. If you restructure under
`CR-20260820-0008`, use it as the template.

## Findings

### The "third time" check — you were right to ask, and one of the five fixes is defective

You asked me to assume this round's fixes carry the same vacuity defect until checked. I
checked all five by measurement, not by reading.

**N1 — `F1` retry scan: SUBSTANTIVE, not vacuous.** I replicated the gathering read-only:

```text
commandSites gathered : 359   (pkg scripts 18, root scripts 16, ci.yml run-ish lines 325)
configSites gathered  : 206
hits now              : []
probe "vitest run --project core --retry 2"  -> caught=true
probe "vitest run --retry=2"                 -> caught=true
probe "vitest run --retries 3"               -> caught=true
```

Both spellings redden and the population is real. *Advisory:* there is **no population
floor** asserted on `commandSites` / `configSites`. A zero-length gather would pass the
"must return zero results" claim vacuously. The silent-zero route is narrow today (a missing
file throws rather than returning an empty array), but `TC-0017-0063` in this same spec
already adopted the per-glob floor for exactly this reason, so the fix is inconsistent with
the spec's own precedent. Advisory, not required — I am not pinning an assertion.

**N2 — `F4` loader check: SUBSTANTIVE.** `layerPolicy.ts` holds exactly two `path.join`
sites, both naming `test-layers.md`, neither naming `test-layers-ci-lanes.md`. The
`resolutions.length > 0` assertion **is** the anti-vacuity floor `F1` lacks — good.
*Advisory:* the extraction pattern captures up to the first closing parenthesis, so a nested
call of the form `path.join(dirname(x), MAPPING)` would truncate at `dirname(x` and evade the
negative claim. Inert at HEAD — no nested site exists.

**N3 — `F6` helper dedup: SAFE, verified byte-equivalent.** `stepsOf` (line 1457) is
identical to the removed `stepsOfJob`, throw included. `isRecord` (workflowHygiene line 96)
is identical to the removed `isPlainRecord`. No check was weakened.

**N4 — `F8` planted tree: GENUINE FIX of a genuine defect.** Returning
`raw.filter(isContext)` rather than rebuilt objects keeps `$comment`, `why` and
`verificationSetNote` travelling with the planted declaration. The defect it fixes was
invisible to every assertion, which is the worst kind. Good catch and a good fix.

**N5 — `F3` classifier reason: BLOCKING. A production change nothing can detect.**

`68beb10d` changed `.github/workflows/ci.yml`'s classifier so that a recognized,
non-documentary path reports `reason: "source path: ..."` instead of
`"executable, not documentation whatever directory it sits in: ..."`. The verdict
(`full: true`) is unchanged; only the diagnostic changed. I enumerated **every** assertion in
the test tree that touches the classifier's `reason`:

```text
line 1170  assistant.reason  toMatch(/validate output/i)                     <- NEVER_DOCUMENTATION branch
line 1194  script.reason     toMatch(/executable/i)                          <- documentary+executable branch
line 1211  result.reason     toMatch(/unrecognized|not in any recognized/i)  <- unrecognized branch
```

Nothing anywhere asserts the `"source path"` reason. And line 1194's `/executable/i` matches
the **old** string as well as the new one. **Revert `F3` and nothing reddens.** So this
change has:

- no RED — nothing failed before it, and nothing could have;
- no `Oracle proof` — no mutation of it reddens any row;
- no evidence entry at all (see N6);
- and it violates `CLAUDE.md`'s "All source changes must have corresponding test coverage".

This is my charter's central failure mode with the sign flipped: not a test that cannot fail,
but a production change no test can see. The irony is worth naming — the fix exists because
"an operator reading `reason=executable ...` for a source file is being told something
false", and the restored honesty is guarded by nothing, so a regression to the false reason
passes every gate in the repository. **Blocking for `TDD-0008`, `TDD-0010`, `TDD-0011`.
Repairable by the implementer**, and the obligation traces to `CLAUDE.md` plus gate items
2/3/5 — it is not reviewer-originated.

**N6 — `68beb10d` rewrote two rows' assertions and recorded nothing. BLOCKING.**

```text
68beb10d  fix(tests): two more vacuous claims from the rework, plus an honest classifier reason
  .github/workflows/ci.yml                                 13 +++-
  packages/qfai/tests/assets/layerCiLaneMapping.test.ts    25 ++++--
  packages/qfai/tests/scripts/ownWorkflowTopology.test.ts  12 +---
  packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts 79 +++++++----
  packages/qfai/tests/scripts/workflowHygiene.test.ts      13 ++--
  -- and NO evidence file.
```

`TC-0017-0068`'s scan and `TC-0017-0079`'s loader check were **replaced**. The recorded
oracle rounds for those rows (`R8`/`R9`/`R10` at `:301:8`/`:323:8` for `TDD-0068`; `R6` for
`TDD-0079`) were run against the assertions this commit deleted. So at HEAD, **neither row
has an `Oracle proof` for the assertion it actually carries**, and neither has a RED or GREEN
for it. I verified the new assertions are substantive (N1, N2) — this is a *recording* gap,
not a vacuity, but item 5 requires the record, and my charter does not accept evidence from a
superseded round. **Blocking for `TDD-0068` and `TDD-0079`. Repairable by the implementer**:
one fresh RED/GREEN plus oracle round each.

### Record-level findings

**N7 — `spec-0017` declares nine `US-*` and has no `Layer = E2E` row.**
`SKILL.md#spec-completion-conditions` requires "Every `US-*` the spec declares has a
`Layer = E2E` row whose `US-Refs` names it". The ledger's own Producer section says the
opposite: "`US-*` and `CON-API-*` are **not** rows here." That is a direct, unfiled
contradiction, and it is the root of `QFAI-ATDD-111` — which is in turn half of what makes
item 12 unreachable. Calling it "a different skill's scope" addresses the annotation half and
not the ledger-row half. **Needs a CR and a user decision.** Filing it would also give item
12 a documented reason rather than a standing error.

**N8 — no row has ever held `review-fix`.** I checked 25 revisions of the ledger: zero
`review-fix` rows at every one. Five rounds of blocking `REVISE` produced no
`refactor -> review-fix` transition, which is the transition `execution-ledger.md` says a
blocking `REVISE` produces. `refactor` is arguably correct *now* (the rework is complete and
re-submitted), so I am not calling this blocking — but it means the ledger has never recorded
that these rows were in rework, and it pairs with N9.

**N9 — zero `Round N:` blocks exist in the record.** `round-evidence.md` requires that every
phase-authored field carry a `Round N:` prefix, that each `REVISE` requiring new production
behaviour open a round with its own RED/GREEN, and that a behaviour-preserving `REVISE`
record "the trigger and the path taken on the current round's `Round N: reviewer verdict`
line". Measured: **0 occurrences of `Round N:` in the evidence file.** Six rounds have run.
Repairable by the implementer.

**N10 — "oracles V1/V2/V3" do not exist.** `review_request.md` line 29 says the `F4` fix
carries "oracles V1/V2/V3". I grepped the evidence file: **zero** occurrences of any `V<n>`
oracle id. The only record of that fix's falsifiability is the request's own prose, written
by the implementing agent. That is the self-attestation this gate exists to prevent, and it
is why N6 is blocking rather than advisory.

**N11 — count drift, three more instances.** The same defect class as N1's population and
`CR-20260820-0006`'s 13 -> 20 -> 21:

| claim | where | measured |
| --- | --- | --- |
| "Fourteen are open" | evidence line 28 | **16** open CRs in `.qfai/decisions/` |
| "all fifteen CRs" | `review_request.md` line 43 | **16** |
| "Six rows are `blocked` on four of them" | evidence line 28 | **three** distinct blockers: `CR-20260818-0007`, `CR-20260820-0001`, `CR-20260820-0007` |

Individually trivial; collectively they are the record's most persistent defect, and they are
all mechanically checkable — which is the argument for generating them rather than writing
them, the same argument the "Items processed" section already makes for itself.

**N12 — `CR-20260820-0008`: the conflict is NOT genuine, and option 2 is available today.**
You asked directly. The CR's title claims the section contract "is unsatisfiable"; its own
option-2 analysis refutes that. Option 2 does not duplicate the shared pair — the CR concedes
"the pair still lives in one place". The contract's phrase "the single home for the RED/GREEN
commands and output" is drawn in contrast with **the ledger cell**, which is what the very
next clause explains ("because a GFM cell cannot hold a newline or a bare pipe"); it is not a
prohibition on a per-row section pointing at a sibling section in the same file. So the
seven-copies problem the CR rejects on measured grounds is option 3's problem, not option 2's.

Correcting myself on the anchors: I initially found only 5 `### TDD-NNNN` headings and
suspected 69 dangling anchors. I was wrong — there are 16 HTML anchor blocks carrying 69
further ids. Audited mechanically: **74 ledger references, 74 available anchors, 0
unresolved, 0 orphaned, 0 duplicated.** The CR's "all 74 anchors resolve" is accurate.

So the decision is genuinely yours, but the options are not equal: **option 1 needs your
approval to change the contract; option 2 needs no approval at all** and is 69 four-line stub
sections. Either resolves it. What is not true is that neither can be done.

## Per-row disposition — may it proceed to `done`?

| Rows | Status | May reach `done`? | Holders |
| --- | --- | --- | --- |
| `TDD-0068`, `TDD-0079` | `refactor` | **NO** | items **2, 3, 5** (N6 — assertion rewritten at `68beb10d`, oracle superseded, nothing recorded); plus 7, 8, 10, 12 |
| `TDD-0008`, `TDD-0010`, `TDD-0011` | `refactor` | **NO** | items **2, 5** (N5 — unguarded `ci.yml` classifier change); plus 7, 8, 10, 12 |
| `TDD-0052`, `TDD-0066`, `TDD-0067`, `TDD-0074`, `TDD-0075` | `refactor` | **NO** | inside `CR-20260820-0007`'s **conditional** blocked set — **user decision**; plus 7, 8, 10, 12 |
| `TDD-0012` | `refactor` | **NO** | trio row absent from `CR-20260820-0006`'s enumeration (record repair); plus 7, 8, 10, 12 |
| the other 63 `refactor` rows | `refactor` | **NO** | items **7, 8** (recorded REVISE), **10** (revision divergence), **12** (validate exit 1, substitution structurally unavailable) |
| `TDD-0016`, `0030`, `0032`, `0033`, `0034`, `0035` | `blocked` | **NO** | `blocked` is completion-prohibiting. Status and `Blocked-By` are **correct** — no repair owed |
| `TDD-0069`, `TDD-0070` | `todo` | **NO** | `todo` is completion-prohibiting. Status is **correct** — no repair owed |

## What has to happen, sorted by who owns it

**Implementer (blocking; clears items 2/3/5):**

1. `TDD-0068`, `TDD-0079` — a fresh RED/GREEN plus `Oracle proof` round for the assertions
   that exist at HEAD, in a `Round N:` block (N6, N9).
2. `TDD-0008`/`0010`/`0011` — an assertion that an ordinary recognized source path's reason
   says `source path` and does **not** say `executable`, then a RED/GREEN plus oracle round
   for the `ci.yml` change (N5). Traces to `CLAUDE.md` and gate items 2/3/5.
3. `CR-20260820-0006` — 20 -> 21: add `TDD-0012` to the class table (class A) and to the
   step-3 enumeration, and fix `Blocked set` (ruling 1).
4. The three count-drift claims in N11.
5. The `Rows covered` column and the stale `76ade4dd` label on the refactor-verify table
   (ruling 3).
6. The one-sentence mutant-hash correction (ruling 2).

**User decision (blocking; the implementer cannot move these):**

7. **Item 12 / clause 1** — amend, waive, or accept a documented park. This is the one that
   holds all 74 regardless of everything on the implementer's list.
8. **`CR-20260820-0007`** — until an option is chosen, five `refactor` rows are conditionally
   blocked.
9. **`CR-20260820-0008`** — option 1 (contract change, needs you) or option 2 (no approval
   needed).
10. **`CR-20260820-0006`** — the `Satisfied-by` grammar. Acceptable as evidence meanwhile.
11. **N7** — the `US-0017-*` versus `Layer = E2E` contradiction, which is half of why item 12
    is unreachable.

**Then, and only then:** a reviewer round in which `completion-reviewer` and
`implementation-reviewer` both return PASS at **one** revision, which is what items 7, 8 and
10 need and what item 11 is appended after.

## Residual risks I could not discharge

- **Items 3 and 5 for the other 63 rows** are accepted on the record's own account of runs
  taken at 17 different base revisions, which I cannot re-observe: a RED is destroyed the
  moment Green begins. I verified everything re-runnable — the six file-scoped suites, the
  full suite, all eleven lint members, validate, the six blocked rows' provenance, the
  locator population, the anchor set, the trio population, the ledger diff, and four of the
  five round-6 fixes. The RED observations themselves rest on the record.
- **The `spec-0003` cross-spec obligation** (`TC-0003-0039`, the shared degraded-case
  fixture) is recorded in the contract's field form and marked `re-reviewed`. I did not
  re-verify that spec's obligations; that is `completion-reviewer`'s intersection to own.
- **Rounds 1-4 have no review pack.** Correctly recorded as unrepairable — the reports no
  longer exist. I agree it cannot be fixed and should stay recorded rather than papered over.

## Sign-off

- [x] Review verdict is explicit — **REVISE**; no row may reach `done`.
- [x] Findings cite concrete artifacts, measured at `1ba7aecd`.
- [x] Required gates and residual risks are recorded.
