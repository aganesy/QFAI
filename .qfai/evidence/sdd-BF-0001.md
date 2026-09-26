# Evidence: /qfai-sdd BF-0001

## Objective

- Business flow: `BF-0001`
- Outcome: `/qfai-sdd` checks the rules it wrote against the examples they
  generalize, in at most two cycles between Stage 4 and the gate, and records
  every finding and its decision.

## Inputs and provenance

- Discussion requirement or import source: the user's requirement of
  2026-09-26, decided in a confirmed discussion session. No discussion pack is
  tracked in this repository (DEC-0782), so the requirement is an explicit user
  requirement, which BR-0306 accepts.
- Existing policy, story, and contract references: US-0001-0152 (AC-0001-0152-01
  to -07, EX-0001-0152-01 to -11); `.qfai/spec/03_contract/cli/story-tree-authoring.md`
  (BR-0316 to BR-0329, BR-0729 to BR-0742); BR-0005 in
  `.qfai/spec/03_contract/cli/qfai-validate.md`; DEC-0748, DEC-0778.

## Decisions and open questions

- Decision rows: DEC-0789 to DEC-0796 (the user's decisions), DEC-0797
  (pre-draft grilling), DEC-0798 (triage, UPDATE:APPEND US-0001-0152),
  DEC-0799 to DEC-0801 (rejected options), DEC-0802 and DEC-0803 (cycle 1),
  DEC-0804 and DEC-0805 (cycle 2), DEC-0806 (`Change request:` for the files
  this change writes).
- Open-question rows: none. No finding was left without a decision.

## Pre-draft Grilling

Record one row for each affected design-writing stage before its first story-tree
mutation. If a contract change exposes another flow, record its new checkpoint
before the next mutation. A missing or skipped checkpoint leaves this evidence
at `REVISE`; a Work Orders Summary row does not replace this record.

| Phase | Session | Participants | Frontier | Recommendation | Disposition | Decision/OQ IDs | Ended at | Wrote at | Evidence |
| ----- | ------- | ------------ | -------- | -------------- | ----------- | --------------- | -------- | -------- | -------- |
| Triage and records | delegated, 2 rounds, ended `adopted` | griller-rr-1 (requirements-reviewer, griller); author-ra-1 (requirements-analyst); author-sa-1 (solution-architect) | Q1 placement; Q12 owning contract | Q1: UPDATE:APPEND to US-0001-0152, no Legacy Source Scope bullet. Q12: `story-tree-authoring.md` `## Rules`, citing BR-0005, BR-0316, BR-0320, BR-0321, BR-0733, BR-0734, BR-0736 and BR-0741 by ID | adopted; authors agreed | DEC-0798, DEC-0799, DEC-0800, DEC-0801 | 2026-09-26T04:11Z | 2026-09-26T04:12Z | round files kept locally, not tracked |
| Stories and examples | same session | same | Q2 finder input; Q3 `sdd_append`; Q4 stop; Q5 open findings; Q7 identity changes; AC and EX set | Seven ACs AC-0001-0152-08 to -14 and 18 EXs EX-0001-0152-12 to -29; Q5 widened to any finding with no decision when the loop ends | adopted; Q5 amended by both authors | DEC-0789 to DEC-0796, DEC-0797 | 2026-09-26T04:11Z | 2026-09-26T04:12Z | round files kept locally, not tracked |
| Contracts and rules | same session | same | Q6 runs; Q8 rejected findings and re-raise; Q9 adopted records; Q10 adjudicator; Q11 record and reviewer check; BR cut | Seven BRs BR-0748 to BR-0754. Q6: the cycle runs on the proposal before the one question BR-0741 allows; drift outside the checked scope returns `blocked`. Q10: one griller per cycle adjudicates, neither the finder nor an author of a targeted item | adopted; dissent on Q10 kept: author-ra-1 would have the finder grill and a separate agent classify only | DEC-0797 | 2026-09-26T04:11Z | 2026-09-26T04:12Z | round files kept locally, not tracked |

No critical decision was left for the user. The `Change request:` row the
drift gate needs (DEC-0806) cites as its approval the user's decisions of
2026-09-26 (DEC-0789 to DEC-0796), as the coordinating session relayed them.

## Concrete-Abstract Cycle

The cycle ran twice on the rules this change wrote. Finder: finder-tda-1
(test-design-analyst), which wrote none of BR-0748 to BR-0754. Adjudicator of
every finding: griller-rr-2 (requirements-reviewer), which is neither the
finder nor an author of a targeted item. Authors answering: author-ra-2 (ACs
and EXs) and author-sa-2 (BRs and decision rows). Every target was written in
this invocation, so every adopted change was applied directly (BR-0750). Cycle
2 adopted findings, and no third cycle ran (BR-0752).

| Cycle | Finding | Kind | Target IDs | Decision | Adjudicator | Reason |
| ----- | ------- | ---- | ---------- | -------- | ----------- | ------ |
| 1 | C1-F1: BR-0748 names five kinds, but its examples show the finder raising two | a rule its examples do not support | BR-0748, EX-0001-0152-12, EX-0001-0152-13 | adopted, amended: BR-0748 cites EX-17, EX-18 and EX-19; no new EX | griller-rr-2 | Those EXs already show the other three kinds; a new EX would repeat them. Dissent: finder-tda-1 proposed a new EX |
| 1 | C1-F2: no example of an invocation that changes an AC or EX but no BR, so no cycle runs | a case the rule implies that no example states | BR-0748, AC-0001-0152-08 | adopted: EX-0001-0152-30 | griller-rr-2 | The other side of BR-0748's last sentence |
| 1 | C1-F3: EX-17 narrows a rule to a threshold nothing in its input states | an example no rule explains | EX-0001-0152-17, BR-0749, BR-0750 | adopted: EX-17's input names the criterion that states the threshold | griller-rr-2 | Without a written source the finding would be critical, which EX-17 does not show |
| 1 | C1-F4: no example of a griller that is the finder or a targeted item's author | a case the rule implies that no example states | BR-0749, BR-0754, AC-0001-0152-09, AC-0001-0152-14 | adopted: EX-28 gains the case; BR-0754 and AC-14 gain the REVISE ground; BR-0749 cites EX-28 | griller-rr-2 | DEC-0791's independence had no observable check |
| 1 | C1-F5: no example of splitting an AC this invocation wrote | a case the rule implies that no example states | BR-0750, AC-0001-0152-10, EX-0001-0152-19 | adopted: EX-0001-0152-31 | griller-rr-2 | The negative side of "a BF or US" in BR-0750 |
| 1 | C1-F6: an in-force change request naming a file does not say whether it covers a later cycle change | a case the rule implies that no example states | BR-0750, BR-0754, EX-0001-0152-18, EX-0001-0152-29 | adopted: BR-0750 and BR-0754 require the approved change to cover the change; EX-0001-0152-32 | griller-rr-2 | Follows the drift protocol and triage; the file-scoped reading would contradict them (DEC-0803). Dissent: griller-rr-2's round-1 reading, withdrawn |
| 1 | C1-F7: EX-29 states a drift-gate limitation no rule states, and BR-0147 contradicts it | an example no rule explains | EX-0001-0152-29, BR-0754 | adopted: the sentence is deleted | griller-rr-2 | The per-flow gate runs the `sdd` profile, which has no drift check |
| 1 | C1-F8: no example of a finding rejected inside a run | a case the rule implies that no example states | BR-0751, BR-0753, BR-0754, AC-0001-0152-11 | adopted: EX-0001-0152-33; BR-0751 and AC-11 say what the answering attempt writes | griller-rr-2 | The only place the "decided in this invocation" case can show |
| 1 | C1-F9: no example of a first cycle that rejects every finding and ends the loop | a case the rule implies that no example states | BR-0752, AC-0001-0152-12, EX-0001-0152-23 | adopted: EX-0001-0152-35, EX-23 kept | griller-rr-2 | Rejecting all is its own case; EX-26's empty cycle ends on the cap. Dissent: author-sa-2 would have cited EX-26 instead |
| 1 | C1-F10: no example outside `--auto` of a finding left without a decision | a case the rule implies that no example states | BR-0752, AC-0001-0152-12 | adopted: EX-0001-0152-34 | griller-rr-2 | The trigger is the user leaving it open; `proceed` never assumes a decision the user must make |
| 1 | C1-F11: the first sentence of BR-0753 is shown by no cited example | a rule its examples do not support | BR-0753, EX-0001-0152-16 | adopted: BR-0753 cites EX-16 | griller-rr-2 | EX-16 is the only example that writes the REJECTED row |
| 1 | C1-F12: matching by kind and IDs alone suppresses an unrelated finding on the same IDs | a rule its examples do not support | BR-0753, EX-0001-0152-27, EX-0001-0152-16 | adopted, amended: matching adds the case; EX-16 and EX-27 changed | griller-rr-2 | DEC-0794 suppresses the rejected findings only. Dissent: author-sa-2's griller-side backstop, not taken |
| 2 | C2-F1: no example of a later case that the rejected case includes | a case the rule implies that no example states | BR-0753, AC-0001-0152-13, EX-0001-0152-27 | adopted: EX-0001-0152-36; BR-0753 and AC-13 say "included in" | griller-rr-2 | A case the rejected case includes is part of what was rejected (DEC-0794) |
| 2 | C2-F2: a declined change request leaves the finding free to be raised again | a case the rule implies that no example states | BR-0750, BR-0753, EX-0001-0152-18, EX-0001-0152-32 | adopted, amended: a REJECTED `Change request:` row suppresses the finding it answers; EX-0001-0152-37 | griller-rr-2 | A decline is the user deciding the finding; a second row could not be written after the invocation ends (DEC-0805) |
| 2 | C2-F3: no example of what the answering attempt of a run does with findings the user decided or left open | a case the rule implies that no example states | BR-0751, BR-0752, AC-0001-0152-11, EX-0001-0152-21 | adopted: EX-0001-0152-38; BR-0751 and AC-11 extended | griller-rr-2 | Only the answering attempt can write (BR-0741) |
| 2 | C2-F4: no example of a covered change applied under an existing change request | a case the rule implies that no example states | BR-0750, BR-0754, AC-0001-0152-10, EX-0001-0152-32 | adopted: EX-0001-0152-39; AC-10 aligned with BR-0750 | griller-rr-2 | Without it, "covers" has no positive example |

## Artifacts changed

| Layer | IDs or paths |
| ----- | ------------ |
| BF    | `BF-0001` (unchanged) |
| US    | `US-0001-0152` (UPDATE:APPEND; `01_User-story.md` unchanged) |
| AC    | AC-0001-0152-08 to AC-0001-0152-14 |
| EX    | EX-0001-0152-12 to EX-0001-0152-39 |
| BR    | BR-0748 to BR-0754 in `.qfai/spec/03_contract/cli/story-tree-authoring.md` |

## Contract executability

- Executability: none. The change adds rules to a Markdown CLI contract; no DB
  contract changes.

## Validation

- Command: `qfai validate --profile sdd --fail-on error --flow BF-0001`, run from
  a fresh `tsup` build of this branch.
- Result: exit 0; error 0, warning 2 (`QFAI-DCON-034`, the sample `DESIGN.md`;
  `QFAI-REVIEW-002`, no review pack), both present before this change.
- Run log: .qfai/report/run-20260926160045748 <!-- qfai:not-a-citation -->
- Other lanes: `check-mdschema.mjs --scope all`, `check-mermaid.mjs`,
  `check-doc-clarity.mjs`, markdownlint and prettier pass on the changed files.
  `--profile tdd` reports 39 `QFAI-STORY-006` errors in
  `user-story-0001-0152/03_Example.md`, 28 of them the new examples no test
  annotates yet; the test slice adds those annotations.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | requirements-reviewer | griller-rr-1 | Pre-draft grilling, rounds 1 and 2 | the user's requirement of 2026-09-26; US-0001-0152; `story-tree-authoring.md` | the frontier and final recommendations above | PASS |
| 2 | requirements-analyst | author-ra-1 | Round-1 answers | round 1 | positions on Q1 to Q12 | PASS |
| 3 | solution-architect | author-sa-1 | Round-1 answers | round 1 | positions on Q1 to Q12 | PASS |
| 4 | requirements-analyst | author-ra-2 | Draft AC-0001-0152-08 to -14 and EX-0001-0152-12 to -29; apply both cycles' AC and EX changes | the adopted grilling | `user-story-0001-0152/02_Acceptance-Criteria.md`, `03_Example.md` | PASS |
| 5 | solution-architect | author-sa-2 | Draft BR-0748 to BR-0754 and DEC-0789 to DEC-0801; rewrite the BRs after each cycle; DEC-0802 to DEC-0805 | the written EXs | `story-tree-authoring.md`, `decisions.md` | PASS |
| 6 | test-design-analyst | finder-tda-1 | Finder, cycles 1 and 2 | BR-0748 to BR-0754 and the EXs they cite | 12 findings in cycle 1, 4 in cycle 2 | PASS |
| 7 | requirements-reviewer | griller-rr-2 | Griller and adjudicator, cycles 1 and 2 | the findings and the authors' answers | every finding adopted, three amended | PASS |

## Reviewer results

| Reviewer | Verdict | Evidence |
| -------- | ------- | -------- |
| completion-reviewer, first pass | REVISE | DEC-0798 named EX-0001-0152-12 to -29 instead of -12 to -39; DEC-0806 claimed the user approved the design, which agents adopted in part. Both repaired; agent handles in the decision rows replaced by roles |
| completion-reviewer, recheck | PASS | Both repairs correct; only rows this change adds differ; `--profile drift` 0 errors; `--profile sdd --flow BF-0001` 0 errors and the same 2 warnings. The verdict was relayed by the coordinating session |

## Open risks

- The new ACs and EXs have no annotating test until the test slice lands, so
  the dogfood backlog guard's `tdd` and `full` profiles count them against
  `user-story-0001-0152/02_Acceptance-Criteria.md` and `03_Example.md`. The
  pins in `scripts/dogfood-backlog.json` are not raised here.
- The skill text, the `sdd-flow.md` evidence template section for the cycle
  record, and the reviewer checklist that reads it land in a later slice.
  Until then no shipped text tells `/qfai-sdd` to run the cycle.
- DEC-0806 records the user's 2026-09-26 decisions as its approval, relayed by
  the coordinating session rather than given in this session.

## Final status

- Status: `PASS`
- Reason: the per-flow `sdd` gate and the drift gate report no error, and the
  completion reviewer returned PASS on the repaired revision. The new examples
  wait for their tests in the test slice.
</content>
</invoke>
