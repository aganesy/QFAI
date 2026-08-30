# Change Request

- ID: `CR-20260820-0009`
- Title: `Fifty-three promoted rows have block-level RED evidence where step 4's admissibility clause is per row`
- Raised by: `/qfai-implement orchestrator, spec-0017; self-reported. Found by completion-reviewer while refuting the premise of my own CR-20260820-0008`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-sdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `1` — re-observe the 35 rows per Selector
- Applied at: `-` — HANDOFF to /qfai-implement: RED observation on ledger rows is that skill lifecycle, not this one
- Superseded by: `-`
- Blocked set: `spec-0017: the 35 rows enumerated in the measurement table below — every refactor row citing an aggregate run with more than one test and carrying no falsifiability trio`

## The rule, quoted

`SKILL.md`, Phase Red step 4:

> Run the test and **watch it fail**. Admissible only when an assertion — or an expected-exception
> check — inside this row's `Selector` raised the failure and its message names the predicate the row
> owns […] **Observe each `Selector` entry's failure separately; one aggregate run is not a valid RED
> observation.**

## The measurement

**Corrected before filing.** The first count said 44 aggregate rows across 12 groups. It was wrong
in the direction that made the finding look worse, because it matched the `N failed / M passed (T)`
string anywhere in a cell — including in the 12 cells that were REFRAMED by review finding B7 to say
"the file-scoped RED run was N failed / M passed (T) and THIS ROW WAS AMONG THE PASSING". Those rows
are on the falsifiability path and claim no RED at all. Excluding them:

```text
promoted rows                                                        74
  falsifiability trio in place of a RED pair                         21
  own RED — the file held one row, or the row's failure is isolated   18
  citing an AGGREGATE run of the whole test file                     35
aggregate groups (one recorded run shared by N rows)                 11
```

| test file                      | recorded run                | rows | failures |
| ------------------------------ | --------------------------- | ---- | -------- |
| `ownWorkflowTopology.test.ts`  | `6 failed / 13 passed (19)` | 6    | 6        |
| `workflowHygiene.test.ts`      | `6 failed / 16 passed (22)` | 6    | 6        |
| `workflowHygiene.test.ts`      | `6 failed / 10 passed (16)` | 5    | 6        |
| `workflowHygiene.test.ts`      | `4 failed / 24 passed (28)` | 4    | 4        |
| `actionPinBumpOwner.test.ts`   | `3 failed / 4 passed (7)`   | 3    | 3        |
| `ownWorkflowTopology.test.ts`  | `3 failed / 9 passed (12)`  | 3    | 3        |
| `layerCiLaneMapping.test.ts`   | `2 failed / 5 passed (7)`   | 2    | 2        |
| `ownWorkflowTopology.test.ts`  | `2 failed / 24 passed (26)` | 2    | 2        |
| `vitestWorkspaceKnobs.test.ts` | `4 failed / 1 passed (5)`   | 2    | 4        |
| `actionPinBumpOwner.test.ts`   | `1 failed / 7 passed (8)`   | 1    | 1        |
| `actionPinBumpOwner.test.ts`   | `1 failed / 1 passed (2)`   | 1    | 1        |

### And the strength of the finding is lower than the first draft claimed

In **all eleven** groups, `failures >= rows`. These files hold one `it()` per `describe`, so a
failure count is a failing-row count — and where six tests failed and six rows are in the group,
those six rows are exactly the six that failed. The aggregate is therefore CONSISTENT with every
member having reddened, and under that proviso it identifies them.

So this is a **procedural** defect, not an evidentiary one. What is missing is the observation the
rule asks for — each `Selector` watched separately — not a row claiming a failure that may never
have happened. The evidentiary version of this defect was review finding B7, it was real, and it is
closed: `TDD-0012` was the one row an aggregate had mis-attributed, and a mechanical sweep now
asserts no group has more rows claiming its run than that run had failures.

Recording it this way rather than at 44 rows because a self-reported finding that overstates itself
is worth no more than one that understates itself, and the first draft of this CR did the former.

## How this was found, and why it took six rounds

Not by reading the rule. `completion-reviewer` was asked to CHALLENGE `CR-20260820-0008`, which
argued that the per-item evidence section contract could not be satisfied because "the commands are
file-scoped, because that is what `references/relevant-test-suite.md` asks for". It checked the
citation:

```text
references/relevant-test-suite.md, line 3:
  "What 'run the relevant test suite' resolves to in Phase: Refactor step 2,
   and where the wide run is actually paid for."
```

That file governs **Refactor**, not Red, and mentions RED once in passing. The rule that governs Red
says the opposite of what I assumed. So the premise of `CR-20260820-0008` was false, and underneath
it was this: the aggregate runs are not merely an inconvenient shape for the evidence file, they are
**not valid RED observations**.

`CR-20260820-0008` is superseded by this CR.

This also explains review finding B7 completely. Seven cells quoting one file-scoped RED, one of them
never part of it, was the SYMPTOM. An aggregate run cannot say which row it reddened, so a cell
citing one is guessing — and in `TDD-0012`'s case the guess was wrong. Two rounds were spent
repairing the symptom.

## Why this is `defect` and not `intent`

Because there is nothing to decide about the rule. It is unambiguous, it governs the phase in
question, and I did not follow it. `#drift-classes` requires a reproduction for a defect claim: the
twelve rows of the table above, each one a recorded aggregate, against the quoted sentence.

What needs a decision is not WHETHER but the remedy's scope, which is why this is filed rather than
silently re-run.

## The remedy, and what it costs

A per-`Selector` RED observation needs the row's test run alone against the state where the
production change is absent. That state is reconstructible: for each change, restore the production
files to the change's recorded `Base revision` and leave the tests at HEAD. Then run each member
row's `Selector` separately.

```text
seam reconstructions        11   (one per aggregate group)
individual Selector runs    35
```

The observation obtained is "would this row's test fail without this change's production code" —
which is what a RED demonstrates, and it is stronger than the historical observation because it uses
the tests as they now stand rather than as they were first drafted.

## CORRECTION — the rule is narrower than I read it, and the real finding is narrower too

**2026-08-20, after merging `origin/main` and measuring three ways.** This CR rested on step 4's
"one aggregate run is not a valid RED observation" read as forbidding a file-scoped run. That reading
is wrong, and merged `main` supplies the gloss that settles it — step 3c, on the same rule:

> run **each entry of** this row's `Selector` separately and capture each failure — a `Selector` may
> legally hold a comma-separated list or a glob, and one aggregate run shows the first entry failing
> while the rest are unobserved, **which is the same rule step 4 applies to a RED**

So "aggregate" means one run covering SEVERAL ENTRIES OF ONE SELECTOR, where only the first failure
is visible. Every `Selector` in this spec holds one entry, so that clause is satisfied.

Fourth time in this run that I argued from a quoted sentence read wider than written. The others are
recorded in `CR-20260820-0008` (superseded), `CR-20260820-0010` (withdrawn) and the four vacuous
claims.

### What is actually unmet, measured

Step 4's admissibility clause is per-ROW and has two halves:

> Admissible only when an assertion […] **inside this row's `Selector`** raised the failure and
> **its message names the predicate the row owns**

Measured against the record:

```text
refactor rows                                                       74
  falsifiability trio, no RED pair owed                             21
  RED evidence recorded at BLOCK level, covering N rows each        53
evidence blocks carrying a RED result                               14
  of those, carrying an assertion message                          14   <- all of them
```

So the messages exist and every one of them is a real assertion message. What does not exist is a
**per-row** message: fourteen blocks carry one RED result each, covering 53 rows between them, and a
reader cannot get from a block's `6 failed | 13 passed (19)` plus "every failure an assertion" to
"the assertion inside `TDD-0009`'s Selector raised it, and its message names the predicate
`TDD-0009` owns".

That is the finding, and it is the same thing review finding B7 was a symptom of — a cell citing a
run it cannot attribute. B7's evidentiary half is closed; this is its procedural half.

### What this does to the options

The remedy in option 1 is unchanged in shape and smaller in scope than filed: run each row's
`Selector` alone against the reconstructed seam and record ITS failing message. What changes is the
justification — not "the rule forbids a file-scoped run", which it does not, but "the rule's
admissibility clause is per row and the record answers it per block".

Option 3 is withdrawn. It asked for the rule to admit an aggregate where every row failed, and the
rule already admits a file-scoped run; there is nothing to relax.

Option 2 is withdrawn for a different reason: it offered to record an identification argument instead
of re-observing, and the argument it rested on — `failures >= rows`, one `it()` per `describe` — does
not produce a per-row assertion MESSAGE, which is the half that is missing.

Recommended, unchanged: **option 1**, now stated as 53 rows rather than 35, because the count that
matters is rows whose RED evidence is block-level, not rows citing an aggregate string.

### And the merge added a reason this may be moot for most of them

Merged step 3b: "A `todo` `E2E` / `API` / **`Integration`** row consumes the provenance
`/qfai-atdd` recorded; **steps 4 and 5 do not apply to it**." Seventy-one of this spec's rows are
`Layer = Integration`, so on the merged contract step 4 governs only the eleven `Unit` rows — and the
71 owe a different thing entirely, recorded in `.qfai/evidence/atdd-spec-0017.md`, which does not
exist. That gap is recorded in the evidence file under "The merge moved the contract past this
record" and is not this CR's subject.

## Options

1. **Re-observe all 35 per Selector, at the closing revision (recommended).** Reconstruct each seam,
   run each `Selector` alone, record 35 RED pairs. Cost: 11 reconstructions and 35 runs, plus the
   evidence rewrite. Benefit: the gate item is actually satisfied, the aggregate citations disappear,
   and item 10's re-run is discharged in the same pass because the observations are fresh.
2. **Re-observe nothing, and record the identification argument instead.** Measured above: all
   eleven groups have `failures >= rows`, and one `it()` per `describe` makes the count a
   row-identification. So the aggregate already says which rows reddened. Cost: the rule does not
   offer that exemption — it asks for the observation, not for a proof that the observation could be
   reconstructed — and accepting it means the next author reads "one aggregate run is not a valid RED
   observation" and treats it as advisory. This is the cheap option and I am the party who benefits
   from it, which is why it is second rather than first.
3. **Ask for the rule to admit an aggregate when every row in it failed.** An `intent` CR against
   Phase Red step 4. Cost: it asks to weaken the sentence that stopped B7 from staying hidden, and I
   am the party who would benefit. Recorded as available and not recommended for that reason.
4. **Mark the 35 rows `exception`.** Rejected: `exception` is for an anomaly, and this is a known
   procedural defect with a known remedy. Filing it there would satisfy spec completion over an
   obligation nothing observed.

Recommended: option 1. Option 2's saving is small and its criterion is not in the rule.

## Impact

- Specs: `none — the rule is skill text, not spec text`
- Plans: `none`
- Tests: `no test changes; the observations are re-taken against reconstructed seams`
- Contracts: `none`
- Schema: `none`

The 35 rows keep their `Status: refactor`. They are already held from `done` by items 7, 8 and 12; a
reset to `todo` would discard correct GREEN evidence and re-run work that is finished.

## Decision needed from user

Re-observe all 35 rows per `Selector` against reconstructed seams (option 1), or record the identification argument instead (option 2), or ask for Phase Red step 4 to admit an aggregate where every
row in the group failed (option 3)?

## Approved actions (owner skill rerun plan)

1. **No mode applies** — no upstream artifact changes. `/qfai-implement` re-observes its own evidence;
   the step-4 invocation table covers `spec-*/**`, `_policies/**` and `.qfai/contracts/**`, and none
   of those is touched. Under option 3 the target would be packaged skill text under
   `packages/qfai/assets/init/**`, which the table also does not cover.
2. Downstream ledger sweep: **no rows are reset.** The remedy replaces RED evidence for rows already
   at `refactor` with correct GREEN evidence; resetting them to `todo` would discard finished work and
   re-run it. Enumerated so a later sweep cannot widen: not reset, the 35 rows named in the measurement table
   above.
3. Cross-check after applying: every promoted row's evidence must carry either a `RED command` /
   `RED result` naming its own `Selector` alone, or the falsifiability trio. Mechanically: no two rows
   may cite the same `N failed / M passed (T)` string with `T > 1`. The sweep script from review
   finding B7 already computes the groups and can assert the count is zero.

## Resolution

<!--
Filled in when Status leaves `open`. Record the option taken, and for option 1 the 35 per-Selector
observations with the revision each was taken at.
-->
