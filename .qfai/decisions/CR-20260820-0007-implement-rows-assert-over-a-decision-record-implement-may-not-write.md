# Change Request

- ID: `CR-20260820-0007`
- Title: `Five implement rows assert over the content of decision records the implement skill is forbidden to write, and this run wrote three of them`
- Raised by: `/qfai-implement orchestrator, spec-0017; self-reported after review finding B2, against my own commits`
- Raised at: `2026-08-20T00:00:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `user (interactive decision, /qfai-atdd session)`
- Approved at: `2026-08-23T00:00:00Z`
- Approved option: `1` — ratify the three decision records and add the ordering rule
- Applied at: `-`
- Superseded by: `-`
- Blocked set: `spec-0017 TDD-0032, TDD-0033, TDD-0034, TDD-0035, TDD-0052, TDD-0066, TDD-0067, TDD-0074, TDD-0075` — all nine, held while this CR is open

## The prohibition, quoted

`.qfai/assistant/skills/qfai-implement/SKILL.md` is explicit in two places:

- "Writing spec artifacts other than this skill's own `tdd/test-list.md` ledger (use `/qfai-sdd`)."
- "`07_Decisions.md` / `09_delta.md`, which are **upstream SSOT this skill may not patch**."

## What I did

Two commits under `/qfai-implement` added three decision records to
`.qfai/specs/spec-0017/07_Decisions.md`:

```text
9aced5bb  docs(spec): record why the duplicate validate workflow could be retired   -> DR-0017-0007
955eb2f1  docs(spec): record the ordering check and the parallelism episode          -> DR-0017-0008, DR-0017-0009
```

That is a scope violation, not a grey area, and it is reported here rather than left for a reviewer
to find a second time.

## Why it happened, which is the part that is a defect and not just a mistake

The rows require it. Five ledger rows assert over the **content** of those records:

| row        | asserts                                                                                                                                                                                                    | record         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `TDD-0074` | the decision record exists, names the structural contract gate it relies on, records the manual cross-check as the cost, says the absent mirror is NOT the reason, and keeps the rejected repoint's reason | `DR-0017-0007` |
| `TDD-0075` | the gate is present at or before the deletion                                                                                                                                                              | `DR-0017-0007` |
| `TDD-0052` | the shipped-ordering record names what was verified, and says the hardening came first                                                                                                                     | `DR-0017-0008` |
| `TDD-0066` | the parallelism record carries its numbers, and says the declared value was kept                                                                                                                           | `DR-0017-0009` |
| `TDD-0067` | the parallelism record keeps the refusal, so the sign-off question stays visible                                                                                                                           | `DR-0017-0009` |

The test file pins them as literals — `RETIREMENT_DR = "DR-0017-0007"`,
`SHIPPED_ORDER_DR = "DR-0017-0008"`, `PARALLELISM_DR = "DR-0017-0009"`.

So an agent running `/qfai-implement` over these five rows has exactly three moves:

1. Write the records — forbidden by SKILL.md. **What I did.**
2. Leave the rows at `todo` indefinitely and raise a CR — correct by the letter, and it strands five
   rows on an artifact only another skill can produce, with no mechanism that summons that skill.
3. Weaken the rows to assert something that does not need the record — forbidden by
   "Never weaken a correct test", and it would discard the obligation the rows exist to carry.

None of the three is a good outcome, which is why this is filed as a defect in the arrangement
rather than only as a confession. A test-case design that makes a downstream skill's rows depend on
an upstream artifact's content, with no ordering constraint that produces the artifact first, is a
gap between `/qfai-sdd`'s output contract and `/qfai-implement`'s prohibitions.

## What the records actually contain, so a reviewer can judge the harm

None of the three invents a decision. Each records one that had already been taken and measured:

- `DR-0017-0007` — why the duplicate validate workflow could be retired, including the rejected
  repoint alternative and the reason it was rejected.
- `DR-0017-0008` — the shipped-ordering check: what was verified, and that the hardening came first.
- `DR-0017-0009` — the parallelism episode: the measurements, the refused proposal to lower the
  declared value, and that ten was kept.

`DR-0017-0009` in particular records a **user instruction** — ten is mandatory, fix the structure —
which is exactly the class of thing a decision record exists to hold, and losing it would be worse
than the scope violation. That is an argument about consequences, not about authority, and it does
not make the write permitted.

## Four rows this blocks, established after filing

The header first said "none is newly blocked". That was wrong, and finding out why is what made
this CR's second half concrete rather than procedural: **four `todo` rows cannot be implemented
while this is open**, because their own acceptance criteria require the write the CR is about.

| row        | rule           | what it requires                                                            |
| ---------- | -------------- | --------------------------------------------------------------------------- |
| `TDD-0032` | `BR-0017-0030` | before-and-after numbers quoted in the PR description AND `07_Decisions.md` |
| `TDD-0033` | `EX-0017-0030` | the same, as the rejecting direction — a cost claim with no numbers fails   |
| `TDD-0034` | `EX-0017-0031` | a recorded regression, in that same decision record                         |
| `TDD-0035` | `EX-0017-0030` | the same rule as `TDD-0033`, from the boundary direction                    |

`BR-0017-0030` binds `AC-0017-0014`, which is the criterion `TC-0017-0032` belongs to. So the
conflict is not incidental to how I worked: **the spec routes a row to `/qfai-implement` whose
acceptance criterion is a decision-record write that skill is forbidden to make.** That is stronger
evidence for this CR than the three records I wrote — those could be read as my overreach; this
cannot.

### A second, independent constraint on TDD-0032, recorded so it is not rediscovered

Adopting artifact reuse means a producer job that builds once and uploads. A new job adds a
fifteenth CI check name, and change 9's oracle `R6` — "a new job appears, adding a check name no
repository setting knows" — already reddens `TDD-0043` for exactly that. The pinned set is a
repository-settings surface no agent can reconfigure, so the workflow edit has to be coordinated
with a branch-protection change by a human.

`BR-0017-0007`'s documentation-only ceiling ("at most four job instances") is satisfiable alongside
it, provided the producer is conditioned on the detection output like the other lanes — docs-only
runs would still execute detect, lint, build and the verdict. Checked rather than assumed, because
a producer that always ran would break that ceiling silently.

Neither constraint is a defect in `TDD-0032`. Both are why it is `todo` rather than attempted.

## Options

1. **Ratify the three writes and fix the ordering (recommended).** `/qfai-sdd` adopts the three
   records as-authored, and the arrangement gains a rule: a TC whose assertion reads an upstream
   artifact's content may not be routed to `/qfai-implement` until that artifact exists. Cost: an
   after-the-fact ratification, which is a precedent worth being uncomfortable about. Benefit: the
   records survive, the rows keep their obligation, and the gap that forced the choice closes.
2. **Revert the three records and reset the five rows to `todo` pending a `/qfai-sdd` run.** Clean by
   the letter. Cost: five landed rows go backwards, and the recorded user instruction in
   `DR-0017-0009` is deleted and must be re-elicited or reconstructed from a transcript.
3. **Move the three records out of `07_Decisions.md`** into an artifact `/qfai-implement` may own,
   and repoint the five rows' literals. Cost: it splits the decision record for one spec across two
   files by authorship rather than by subject, which is the kind of division that makes the next
   reader miss half of it.
4. **Permit `/qfai-implement` to APPEND to `07_Decisions.md`** while still forbidding edits to
   existing entries. Cost: "upstream SSOT this skill may not patch" stops being a clean rule and
   becomes a rule with a carve-out, and carve-outs on this particular prohibition are how a
   downstream skill starts authoring upstream requirements.

Recommended: option 1. Option 2 is the only one that is unambiguously correct on authority and it
destroys the most information; option 1 keeps the information and fixes the cause.

### The five `refactor` rows this also covers, conditionally

**Added 2026-08-20, after round 5.** `completion-reviewer` found the `Blocked set` field naming only
the four `todo` rows while this CR's own table lists five `refactor` rows that READ the disputed
records — and its own step 2 says that under option 2 "none may stay at `refactor`". An item the
blocked set does not name is, by `drift-protocol.md`'s own words, "not blocked by this CR", so
leaving them off meant option 2 could reset rows the operator never approved resetting.

| row        | reads          | under option 1 | under option 2 or 3                 |
| ---------- | -------------- | -------------- | ----------------------------------- |
| `TDD-0052` | `DR-0017-0008` | unaffected     | reset — the record is gone or moved |
| `TDD-0066` | `DR-0017-0009` | unaffected     | reset                               |
| `TDD-0067` | `DR-0017-0009` | unaffected     | reset                               |
| `TDD-0074` | `DR-0017-0007` | unaffected     | reset                               |
| `TDD-0075` | `DR-0017-0007` | unaffected     | reset                               |

**They are in the blocked set NOW, unconditionally, and the "conditional" framing was wrong.**
Round 6's `completion-reviewer` corrected it: the halt operates _while_ `Status: open` — exactly
while the option is unknown — and `drift-protocol.md` step 1 settles the tie: "when the dependency
is arguable, it is dependent." All nine rows are held from `done` today, not five of them
conditionally.

The table's `under option 1` column is still useful, but it describes what happens **after** the CR
is decided, not what is in force. Read it as a step-5 sweep forecast, not as the blocked set.

### Three new decision records, not five

Also recorded because a reviewer read it the other way. `completion-reviewer` reported "**five** DR
entries across two commits, not three". Measured:

```text
git show 9aced5bb -- 07_Decisions.md | grep '^+### DR-'   ->  DR-0017-0007
git show 955eb2f1 -- 07_Decisions.md | grep '^+### DR-'   ->  DR-0017-0008, DR-0017-0009
```

The added lines of those two commits MENTION five distinct DR ids — `0004` and `0005` appear as
cross-references inside the new entries' prose. Three entries were created. The figure in this CR is
correct as written, and the discrepancy is recorded here so the next reader does not have to
re-derive which count is right.

## Impact

- Specs: `spec-0017 — 07_Decisions.md (DR-0017-0007, DR-0017-0008, DR-0017-0009)`
- Plans: `none`
- Tests: `packages/qfai/tests/assets/actionPinBumpOwner.test.ts — TDD-0052, TDD-0066, TDD-0067, TDD-0074, TDD-0075`
- Contracts: `none`
- Schema: `none`

Also in scope, because the same conflict produces it: `.qfai/assistant/skills/qfai-implement/SKILL.md`
and whatever authors test cases whose assertions read upstream content.

## Decision needed from user

Ratify the three decision records written under `/qfai-implement` and add an ordering rule so a TC
asserting over an upstream artifact's content is not routed to implement before that artifact exists
(option 1) — or revert them and reset the five rows (option 2), relocate them (option 3), or permit
append-only writes (option 4)?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope under option 1: adopt `DR-0017-0007`, `DR-0017-0008` and `DR-0017-0009`
   into `spec-0017`'s decision record as its own output, and add the ordering rule to
   `SKILL.md`'s prohibition list so the next agent meets a routing constraint instead of this
   choice. Mode: **`confirm-only`** for the decision record under option 1 — the protocol's own
   words for this case are "the change was already applied by hand under approval", which is
   exactly what happened and why this CR exists. The `SKILL.md` ordering rule is a separate
   packaged-asset edit and no mode applies to it. Under option 2 the mode is **`re-derive`**,
   because the three records are removed and the artifact regenerated without them.
2. Downstream ledger sweep: **no rows are reset under option 1**, because the records the rows assert
   over do not change — only their authorship does. Enumerated so a later sweep cannot widen:
   - not reset under option 1: `TDD-0052`, `TDD-0066`, `TDD-0067`, `TDD-0074`, `TDD-0075`
   - reset under option 2: those same five, all of them, recording `CR-20260820-0007` in their
     `DR-ID` column. Option 2 deletes the records they read, so every one of them stops being
     satisfiable and none may stay at `refactor`.
   - under option 3: the same five, because their pinned DR literals move.
3. Cross-check after applying: `grep -c 'DR-0017-000[789]'` over the test file must still find the
   three literals, and the five rows' oracles (`R1`..`R9` of the record-rows round) must still
   redden. Under option 2 the check is the inverse — the three literals must be gone.

## Resolution

<!--
Filled in when Status leaves `open`. Record which option was taken, and for option 1 the ordering
rule as it was written into SKILL.md.
-->
