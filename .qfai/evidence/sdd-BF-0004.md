# Evidence: /qfai-sdd BF-0004

## Objective

- Business flow: `BF-0004`
- Outcome: every business rule whose examples belong to BF-0004 agrees with
  those examples after two concrete-abstract cycles, and every finding is
  decided or left open for the user.

## Inputs and provenance

- Request: the user's brush-up of the whole story tree (2026-09-26). The cycle
  normally reads only the rules an invocation wrote or changed; at the user's
  request it read every rule citing an example of BF-0004.
- Rules read in cycle 1: BR-0093 and BR-0094 (`qfai-init.md`), BR-0163 and
  BR-0164 (`qfai-validate.md`), BR-0455 to BR-0513
  (`qfai-migration-spec-to-story.md`), with every example they cite.
- Approval of changes to items that existed before: the user decided on
  2026-09-26 that it is the user's review of this flow's pull request,
  recorded as DEC-0847.

## Decisions and open questions

- Decision rows: DEC-0810, DEC-0811, DEC-0812, DEC-0813, DEC-0814, DEC-0815, DEC-0816, DEC-0817, DEC-0818, DEC-0819, DEC-0820, DEC-0821, DEC-0845 (adopted);
  DEC-0822, DEC-0823, DEC-0824, DEC-0825, DEC-0826, DEC-0827, DEC-0828, DEC-0829, DEC-0830, DEC-0831, DEC-0832, DEC-0833, DEC-0834, DEC-0835, DEC-0836, DEC-0837, DEC-0838, DEC-0839, DEC-0840, DEC-0841, DEC-0842, DEC-0843, DEC-0844, DEC-0846 (rejected); DEC-0847
  (`Change request:`); DEC-0848 to DEC-0851 (the user's answers of
  2026-09-26 to the four open questions).
- Open-question rows: OQ-0196, OQ-0197, OQ-0198, OQ-0199, all DONE.

## Pre-draft Grilling

The change brushes up existing items, so the only sessions are the two
delegated sessions of the concrete-abstract cycle. Each ended before the story
tree changed.

| Phase | Session | Participants | Frontier | Recommendation | Disposition | Decision/OQ IDs | Ended at | Wrote at | Evidence |
| ----- | ------- | ------------ | -------- | -------------- | ----------- | --------------- | -------- | -------- | -------- |
| Stories, examples and contracts (cycle 1) | delegated, 1 round, ended `adopted` | griller-rr-1 (requirements-reviewer, griller); finder-tda-1a, -1b, -1c (test-design-analyst) | 66 findings on BR-0093 to BR-0513 and their examples | adopt 42 (one in part), reject 23, send 2 to the user | adopted | DEC-0810 to DEC-0844, OQ-0196, OQ-0197 | 2026-09-26T08:10Z | 2026-09-26T08:12Z | `## Concrete-Abstract Cycle`, cycle 1 rows |
| Stories, examples and contracts (cycle 2) | delegated, 2 rounds, ended `adopted` | griller-rr-2 (requirements-reviewer, griller); finder-tda-2 (test-design-analyst); the applier as author | 8 findings on the rules and examples cycle 1 changed | adopt 6, reject 1, send 1 to the user; F2-02 amended after the author round | adopted; applier's dissent on F2-02 taken | DEC-0845, DEC-0846, OQ-0198, OQ-0199 | 2026-09-26T08:45Z | 2026-09-26T08:47Z | `## Concrete-Abstract Cycle`, cycle 2 rows |

## Concrete-Abstract Cycle

Two cycles ran. Cycle 1 adopted findings, so cycle 2 ran on what cycle 1
changed, and no third cycle ran. Finders: finder-tda-1a, finder-tda-1b and
finder-tda-1c (test-design-analyst, cycle 1, one per story range) and
finder-tda-2 (test-design-analyst, cycle 2); none wrote a rule it read.
Adjudicators: griller-rr-1 (cycle 1) and griller-rr-2 (cycle 2), both
requirements-reviewer, neither a finder nor an author of a targeted item.
Cycle 2 held one author round, on F2-02 and on the route for F2-03 and F2-07.

| Cycle | Finding | Kind | Target IDs | Decision | Adjudicator | Reason |
| ----- | ------- | ---- | ---------- | -------- | ----------- | ------ |
| 1 | F1-A-01: a `_policies/`-only old root has no example | a case the rule implies that no example states | BR-0163, BR-0164, AC-0004-0002-01 | adopted: EX-0004-0002-02 (DEC-0810) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-02: "every profile" shown for five of nine profiles | a rule its examples do not support | BR-0163, EX-0004-0002-01 | adopted: EX-0004-0002-01 runs all nine (DEC-0810) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-03: the former default `.qfai/specs/` is checked by the contract but not by the rule | a rule its examples do not support | BR-0163, AC-0004-0002-01 | adopted: BR-0163 and AC-0004-0002-01 widened; EX-0004-0002-03 (DEC-0810) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-04: `--dry-run --force` together | a case the rule implies that no example states | BR-0455, AC-0004-0003-01 | adopted: EX-0004-0003-01 extended (DEC-0811) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-06: the exit code of a dry run that lists an item for a person | a case the rule implies that no example states | BR-0466, BR-0467, AC-0004-0003-06 | adopted: EX-0004-0003-16 runs a dry run first; BR-0466 says a dry run and a real run alike (DEC-0811) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-07: a package installed only in a parent directory's `node_modules` | a rule its examples do not support | BR-0457, EX-0004-0003-04 | adopted: BR-0457 follows the contract's module resolution; EX-0004-0003-25 (DEC-0812) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-08: step 7 with an invalid plan | a case the rule implies that no example states | BR-0458, AC-0004-0003-01 | adopted: EX-0004-0003-26 (DEC-0812) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-09: EX-0004-0003-05's plan errors are not in BR-0458's list | an example no rule explains | BR-0458, EX-0004-0003-05 | adopted: BR-0458 refers to BR-0485's list; EX-0004-0003-05 names a wrong-kind ID and a missing title (DEC-0812) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-11: the step 8 end of the ID-map range | a case the rule implies that no example states | BR-0459, AC-0004-0003-02 | adopted in part: EX-0004-0003-08 adds step 8; step 9 and step 10 parts rejected (DEC row) (DEC-0811) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-12: a dry run that writes and then undoes the write | a rule its examples do not support | BR-0460, EX-0004-0003-10 | adopted: EX-0004-0003-10 forbids any write during the dry run (DEC-0811) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-15: staging whose ownership cannot be verified after an interruption | a rule its examples do not support | BR-0463 | adopted: BR-0463 and AC-0004-0003-04 keep it for a person; EX-0004-0003-27 (DEC-0812) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-16: temporary staging the contract's write set allows | a rule its examples do not support | BR-0464, EX-0004-0003-14 | adopted: BR-0464 names the staging paths (DEC-0812) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-18: a step's own sections, in a dry run and a real run | a rule its examples do not support | BR-0467, EX-0004-0003-18 | adopted: EX-0004-0003-28 (DEC-0811) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-22: which step removes an emptied directory | a rule its examples do not support | BR-0470, EX-0004-0003-22 | adopted: EX-0004-0003-22 checks after each step (DEC-0811) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-23: cites `EX-0018-0010`, which the tree does not declare | an example no rule explains | EX-0004-0003-11 | adopted: cites EX-0004-0003-10 (DEC-0813) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-24: cites `BR-0018-0059`, which the tree does not declare | a rule its examples do not support | BR-0469 | adopted: cites BR-0513 (DEC-0813) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-03: a record with no old ID | a case the rule implies that no example states | BR-0475, EX-0004-0005-01 | adopted: EX-0004-0005-01 reworded (DEC-0814) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-04: `decisions.md` already holding rows | a case the rule implies that no example states | BR-0475, BR-0479 | adopted: EX-0004-0005-09 (DEC-0814) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-06: a `deprecated` pack with no successor | a case the rule implies that no example states | BR-0478, BR-0477, AC-0004-0005-01 | adopted: EX-0004-0005-10 (DEC-0814) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-09: no example shows the consumed sources gone | a case the rule implies that no example states | AC-0004-0006-01, BR-0481, BR-0484 | adopted: EX-0004-0006-01 extended (DEC-0815) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-10: a sentence about a shipped file, with no obligation on step 3 | a rule its examples do not support | BR-0482, AC-0004-0006-01 | adopted: removed from BR-0482 and AC-0004-0006-01 (DEC-0815) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-13: overlay relocation filed under the section-merge criterion | a flow, story or criterion split the rules show to be wrong | AC-0004-0006-01, EX-0004-0006-06, BR-0513 | adopted: AC-0004-0006-03; EX-0004-0006-06 re-cited (DEC-0815) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-15: an overlay whose destination already exists | a case the rule implies that no example states | BR-0513 | adopted, implied part only: BR-0513 states it; EX-0004-0006-07 (DEC-0815) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-16: no example of a plan step 4 refuses under BR-0485 | a case the rule implies that no example states | BR-0485, AC-0004-0007-01 | adopted: BR-0485 cites EX-0004-0003-05 (DEC-0816) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-17: an ambiguous criterion no story lists | a case the rule implies that no example states | BR-0485, AC-0004-0007-01 | adopted: EX-0004-0007-10 (DEC-0816) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-18: two examples of a flow with no `from` | a redundant example | EX-0004-0007-01, EX-0004-0007-08, BR-0485, BR-0488 | adopted: EX-0004-0007-01's second flow names a section and exits 0; BR-0485 drops the duplicate sentence (DEC-0816) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-19: exit-3 cases filed under the success criterion | a flow, story or criterion split the rules show to be wrong | AC-0004-0007-01, AC-0004-0007-02, EX-0004-0007-01, EX-0004-0007-04, EX-0004-0007-08 | adopted: AC-0004-0007-02 widened; EX-0004-0007-08 re-cited; EX-0004-0007-11 split from EX-0004-0007-04 (DEC-0816) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-20: the reserved selector's section, prose included | a case the rule implies that no example states | BR-0488, AC-0004-0007-01 | adopted, with a code change: EX-0004-0007-12; step 4 writes the section's prose (DEC-0817) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-22: an unplaced story's criterion and example | a case the rule implies that no example states | BR-0490, BR-0487, AC-0004-0007-02 | adopted: BR-0490 and EX-0004-0007-07 extended (DEC-0816) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B1-24: cite `BR-0018-0022`, `BR-0018-0026` and `BR-0018-0042` | a rule its examples do not support | BR-0475, BR-0479, BR-0487 | adopted: cite BR-0476, BR-0480 and BR-0496 (DEC-0813) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-01: cites `EX-0018-0047`, which the tree does not declare | an example no rule explains | EX-0004-0008-02, BR-0492 | adopted: cites EX-0004-0008-01 (DEC-0813) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-02: cites `BR-0018-0042` | a rule its examples do not support | BR-0501 | adopted: cites BR-0496 (DEC-0813) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-03: an example cited by a row naming A and a row naming none | a case the rule implies that no example states | BR-0495, BR-0496 | adopted: BR-0496 reads "between them"; EX-0004-0008-10 (DEC-0818) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-04: a case-only row whose one criterion has no new ID | a case the rule implies that no example states | BR-0491, BR-0493, AC-0004-0008-02 | adopted: BR-0493 and AC-0004-0008-02 widened; EX-0004-0008-11 (DEC-0818) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-05: an uncited example covered only vacuously | a rule its examples do not support | BR-0496, EX-0004-0008-09, AC-0004-0008-03 | adopted: BR-0496 and AC-0004-0008-03 name it (DEC-0818) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-07: a rule placed in a JSON contract | a case the rule implies that no example states | BR-0497, AC-0004-0009-01 | adopted: EX-0004-0009-10 (DEC-0819) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-08: a Markdown contract that already has a `## Rules` table | a case the rule implies that no example states | BR-0499, AC-0004-0009-01 | adopted: EX-0004-0009-11 (DEC-0819) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-09: a rule cited by a placed example and a kept one | a case the rule implies that no example states | BR-0500, BR-0501, BR-0496, AC-0004-0009-01 | adopted: BR-0500 and AC-0004-0009-01 count examples with a new ID; EX-0004-0009-12 (DEC-0819) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-12: an annotation naming neither a test case nor a story | a case the rule implies that no example states | BR-0506, AC-0004-0010-02 | adopted: EX-0004-0010-05; AC-0004-0010-02 widened (DEC-0820) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-14: the criterion states one of the three outcomes its example asserts | a flow, story or criterion split the rules show to be wrong | AC-0004-0011-01, EX-0004-0011-01, BR-0507 | adopted: AC-0004-0011-01 widened; the example is kept (DEC-0820) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-16: the skill's "nothing to migrate" report has no example | a rule its examples do not support | BR-0510, EX-0004-0012-02, AC-0004-0012-01 | adopted: EX-0004-0012-01 extended; BR-0510 cites it (DEC-0821) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-B2-17: the guide's run command and resolving section have no example | a rule its examples do not support | BR-0512, EX-0004-0012-04 | adopted: EX-0004-0012-04 extended (DEC-0821) | griller-rr-1 | Implied by the rule's own text or its contract section |
| 1 | F1-A-05: step 5 run with `--dry-run` while `id-map.json` is absent | a case the rule implies that no example states | BR-0459, AC-0004-0003-02 | rejected (DEC-0822) | griller-rr-1 | BR-0459 does not distinguish a dry run; the refusal precedes dry-run handling, and EX-0004-0003-08 already states the partition. |
| 1 | F1-A-10: `qfai.config.yaml` with an unclosed YAML bracket at step 1 | a case the rule implies that no example states | BR-0458, AC-0004-0003-01 | rejected (DEC-0823) | griller-rr-1 | BR-0458 does not split by which input is malformed; EX-0004-0003-06 states the partition. |
| 1 | F1-A-11: step 10 on the unmigrated fixture, and step 9 without `id-map.json` | a case the rule implies that no example states | BR-0459, AC-0004-0003-02 | rejected (DEC-0824) | griller-rr-1 | Step 10 adds nothing beyond EX-0004-0003-07's range check, and step 9 without the map is a negative case no rule draws. The step 8 end of the range was adopted. |
| 1 | F1-A-13: running step 5 a second time on a tree where it exited 3 | a case the rule implies that no example states | BR-0462, BR-0466, AC-0004-0003-04 | rejected (DEC-0825) | griller-rr-1 | EX-0004-0003-12 reruns every step of a fixture whose steps exit 0 or 3; the exit code of a rerun is BR-0466 applied to that run. |
| 1 | F1-A-14: step 2 resumed after half its records are in `decisions.md` | a case the rule implies that no example states | BR-0463, AC-0004-0003-04 | rejected (DEC-0826) | griller-rr-1 | BR-0463 does not split by step; EX-0004-0003-13 states the partition. |
| 1 | F1-A-17: user lines outside the managed `.gitignore` block, and a user-owned entry in `.claude/skills/` | a case the rule implies that no example states | BR-0464, AC-0004-0003-05 | rejected (DEC-0827) | griller-rr-1 | EX-0004-0011-02 already keeps the outside line, and EX-0004-0011-01 keeps an occupied user-owned wrapper with no other path changed. |
| 1 | F1-A-19: `06_Test-Cases.md` holding a row that cites two criteria, after steps 5 and 6 | a case the rule implies that no example states | BR-0468, AC-0004-0003-07 | rejected (DEC-0828) | griller-rr-1 | EX-0004-0008-03 already keeps an unconverted row; the proposal to keep the file in the pack contradicts step 4 archiving it. |
| 1 | F1-A-20: `06_Test-Cases.md` read by step 5 and step 6, removed by step 6 | a case the rule implies that no example states | BR-0468, AC-0004-0003-07 | rejected (DEC-0829) | griller-rr-1 | Step 4 archives the file and steps 5 and 6 read the archive copy; the proposal would change code against EX-0004-0008-03. |
| 1 | F1-A-21: `01_Spec.md` whose Scope moves into a story, moved whole to the retired archive | a case the rule implies that no example states | BR-0469, BR-0468, AC-0004-0003-07 | rejected (DEC-0830) | griller-rr-1 | BR-0469 draws no partial and whole partition, and BR-0496 keeps unplaced rows in the pack file, which a generic moved-whole example would contradict. |
| 1 | F1-B1-01: `paths.specsDir: docs/specs` together with the default `paths.contractsDir: .qfai/contracts` | a case the rule implies that no example states | BR-0471, BR-0472, AC-0004-0004-01 | rejected (DEC-0831) | griller-rr-1 | BR-0472 works per key, and EX-0004-0004-02 and EX-0004-0004-03 state both partitions. |
| 1 | F1-B1-02: `skill.local/house-style/` already present while `skills.local/house-style/` exists | a case the rule implies that no example states | BR-0474, BR-0473, AC-0004-0004-02 | rejected (DEC-0832) | griller-rr-1 | BR-0474 moves `skills.local` as the rename map is moved, so the collision falls under BR-0473, which EX-0004-0004-04 states. |
| 1 | F1-B1-05: a change request whose status is `proposed` | a case the rule implies that no example states | BR-0477, BR-0476, AC-0004-0005-01 | rejected (DEC-0833) | griller-rr-1 | EX-0004-0005-03 states `proposed` to TODO; the status map does not depend on the kind of record. |
| 1 | F1-B1-08: a row of `08_Open-questions.md` saying the file holds no question | an example no rule explains | BR-0479, EX-0004-0005-06 | rejected (DEC-0834) | griller-rr-1 | BR-0479 writes one row per question; a row that is not a question is already explained. |
| 1 | F1-B1-11: two `## Users` sections with different bodies mapped to `objective.md` | a case the rule implies that no example states | BR-0483, BR-0481, AC-0004-0006-01 | rejected (DEC-0835) | griller-rr-1 | Whether a repeated heading merges is stated by no rule; an example would add one. |
| 1 | F1-B1-12: two paragraphs differing only in line wrapping or trailing whitespace | a case the rule implies that no example states | BR-0483, BR-0509 | rejected (DEC-0836) | griller-rr-1 | BR-0483 forbids identical paragraphs only; writing a different one is BR-0481's, which EX-0004-0006-01 covers, and paraphrases are the skill's under BR-0509. |
| 1 | F1-B1-14: the other files of an orphan overlay's directory | a rule its examples do not support | BR-0513, EX-0004-0006-06 | rejected (DEC-0837) | griller-rr-1 | EX-0004-0006-06 names `retired/assistant/catalog/`, the destination EX-0004-0003-24 gives the other files. |
| 1 | F1-B1-21: the example suffix of a test-case-only row relative to the old examples | a case the rule implies that no example states | BR-0486, BR-0489 | rejected (DEC-0838) | griller-rr-1 | No rule or contract text implies an order; the ID map records the assignment. |
| 1 | F1-B1-23: the exit code and ID-map entry of an unplaced story | a rule its examples do not support | BR-0490, EX-0004-0007-07 | rejected (DEC-0839) | griller-rr-1 | "Take no new ID" rules out an ID-map entry, and exit 3 follows from BR-0466. |
| 1 | F1-B2-06: step 4's handling of an example it cannot place, stated in two stories | a flow, story or criterion split the rules show to be wrong | BR-0487, BR-0496, AC-0004-0008-03, US-0004-0007, US-0004-0008 | rejected (DEC-0840) | griller-rr-1 | One derivation applied at two steps, with BR-0487 pointing to BR-0496; moving criteria between stories changes no behaviour. |
| 1 | F1-B2-10: rule-placement failures and the Applicable NFR forward in one criterion | a flow, story or criterion split the rules show to be wrong | AC-0004-0009-02, BR-0501, BR-0502, EX-0004-0009-08 | rejected (DEC-0841) | griller-rr-1 | The criterion states one outcome, step 7's For a person list, and the NFR has its own line; a split changes no obligation. |
| 1 | F1-B2-11: a story annotation in an E2E file whose story the plan did not place | a case the rule implies that no example states | BR-0504, BR-0506, BR-0490, AC-0004-0010-02 | rejected (DEC-0842) | griller-rr-1 | EX-0004-0010-04 states the partition of an ID the map does not hold; BR-0506 does not split by ID kind. |
| 1 | F1-B2-13: a test-case annotation in a file `validation.traceability.testFileGlobs` does not select | a case the rule implies that no example states | BR-0503, BR-0506, US-0004-0010 | rejected (DEC-0843) | griller-rr-1 | BR-0503 bounds step 8 to selected files; reporting other files would be a new rule the request does not need. |
| 1 | F1-B2-15: a `.gitignore` with no managed block | a case the rule implies that no example states | BR-0508, AC-0004-0011-02 | rejected (DEC-0844) | griller-rr-1 | Step 10 delegates to init's managed-block writer (BR-0094); the no-block case is that writer's contract. |
| 1 | F1-B1-07: a plan that places a story or rule from a retired pack | a case the rule implies that no example states | BR-0478, BR-0485 | decided by the user: step 4 keeps refusing with exit 2; BR-0478, BR-0485 and EX-0004-0003-29 state it (DEC-0848, OQ-0196) | user | Rests on product intent nothing written stated |
| 1 | F1-B2-18: the cutover stage of BF-0004 has no owning story | a flow, story or criterion split the rules show to be wrong | BF-0004, US-0004-0001 to US-0004-0012 | decided by the user: the cutover stage leaves `business-flow.md` (DEC-0849, OQ-0197) | user | Rests on product intent; creating a story needs triage |
| 2 | F2-01: cycle 1 let every step keep unverifiable staging; the contract gives that to step 10 | a rule its examples do not support | BR-0463, AC-0004-0003-04, EX-0004-0003-27 | adopted: BR-0463 and AC-0004-0003-04 name step 10 (DEC-0845) | griller-rr-2 | Matches the contract's report table; steps 1 to 8 refuse with exit 2 |
| 2 | F2-02: a staging-named file with no `.owner` marker | a case the rule implies that no example states | BR-0463, EX-0004-0003-27 | adopted, amended after the author round: EX-0004-0003-27 keeps the file byte-identical, not listed (DEC-0845) | griller-rr-2 | Dissent: the applier showed `qfai init` treats such a file as a user file; the griller dropped the listing and exit 3 it first proposed |
| 2 | F2-03: the former-default layout beside a story tree with a finding | a case the rule implies that no example states | BR-0164, EX-0004-0002-03, BR-0132 | adopted: EX-0004-0002-03 extended, BR-0164 cites it (DEC-0845); BR-0132, a BF-0001 rule, rewritten to match by the user's decision (DEC-0851, OQ-0199) | griller-rr-2 | BR-0132 belongs to BF-0001's rules, so the user decided it |
| 2 | F2-04: which path the one error names when both roots hold a spec pack | a case the rule implies that no example states | BR-0163 | rejected (DEC-0846) | griller-rr-2 | No rule states a preferred path; pinning one would add a rule |
| 2 | F2-05: an example whose one criterion takes no new ID | a case the rule implies that no example states | BR-0487, BR-0496, EX-0004-0007-10, EX-0004-0007-11 | adopted: BR-0487 and BR-0496 widened; EX-0004-0007-13 (DEC-0845) | griller-rr-2 | The only outcome consistent with BR-0487, BR-0488, BR-0495 and "Nothing is deleted" |
| 2 | F2-06: AC-0004-0007-02 said a flow with no `from` stays in its source | a flow, story or criterion split the rules show to be wrong | AC-0004-0007-02, EX-0004-0007-08, BR-0488 | adopted: the Then says the flow receives the template (DEC-0845) | griller-rr-2 | Matches BR-0488 and EX-0004-0007-08 |
| 2 | F2-07: a colliding overlay is not listed by the rule, criterion, example or prose | a rule its examples do not support | BR-0513, AC-0004-0006-03, EX-0004-0006-07 | adopted: all four list it for a person (DEC-0845) | griller-rr-2 | The report table lists every item the step could not settle |
| 2 | F2-08: the same overlay name under `constitution/` and `catalog/` | a case the rule implies that no example states | BR-0513 | decided by the user: step 3 writes nothing and lists both overlays; BR-0513, AC-0004-0006-03 and EX-0004-0006-08 state it, and step 3 implements it (DEC-0850, OQ-0198) | user | Which overlay stays in force is product intent |

## Artifacts changed

| Layer | IDs or paths |
| ----- | ------------ |
| BF    | BF-0004: the cutover stage removed (DEC-0849) |
| US    | none |
| AC    | AC-0004-0002-01, AC-0004-0003-04, AC-0004-0006-01, AC-0004-0006-03 (new), AC-0004-0007-02, AC-0004-0008-02, AC-0004-0008-03, AC-0004-0009-01, AC-0004-0010-02, AC-0004-0011-01 |
| EX    | New: EX-0004-0002-02, -0002-03, -0003-25 to -0003-29, -0005-09, -0005-10, -0006-07, -0006-08, -0007-10 to -0007-13, -0008-10, -0008-11, -0009-10 to -0009-12, -0010-05. Changed: EX-0004-0002-01, -0003-01, -0003-05, -0003-08, -0003-10, -0003-11, -0003-16, -0003-22, -0003-27, -0005-01, -0006-01, -0006-06, -0006-07, -0007-01, -0007-04, -0007-07, -0007-08, -0008-02, -0012-01, -0012-04 |
| BR    | BR-0132, BR-0163, BR-0164 (`.qfai/spec/03_contract/cli/qfai-validate.md`); BR-0457, BR-0458, BR-0463, BR-0464, BR-0466, BR-0467, BR-0469, BR-0475, BR-0478, BR-0479, BR-0482, BR-0485, BR-0487, BR-0488, BR-0490, BR-0493, BR-0495, BR-0496, BR-0497, BR-0499, BR-0500, BR-0501, BR-0506, BR-0510, BR-0513 (`.qfai/spec/03_contract/cli/qfai-migration-spec-to-story.md`) |
| Code  | `packages/qfai/src/migration/specToStory/step04RenumberIds.ts`: `business-flow.md` carries the selected old section's prose as well as its diagram (BR-0488, EX-0004-0007-12). `packages/qfai/src/migration/specToStory/step03MoveCatalog.ts`: two overlays of one name that could both take `rule/<name>.local.md` stop step 3 before it writes (BR-0513, EX-0004-0006-08); its test failed before the change |

## Contract executability

- Executability: none. No contract gained a new executable form.

## Validation

- Command: `node packages/qfai/dist/cli/index.cjs validate --profile sdd --fail-on error --flow BF-0004`
- Result: exit 0, 0 errors, 2 warnings. `--profile drift`: 0 errors.
  `--profile tdd`: no finding on a BF-0004 ID; the dogfood guard holds
  `tdd`, `full` and `sdd` within their pins.
- Run log: `.qfai/report/run-*` (not tracked). <!-- qfai:not-a-citation .qfai/report/ -->

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | test-design-analyst | finder-tda-1a | Cycle 1 finder, US-0004-0001 to -0003 | BR-0093, BR-0094, BR-0163, BR-0164, BR-0455 to BR-0470 | 24 findings | PASS |
| 2 | test-design-analyst | finder-tda-1b | Cycle 1 finder, US-0004-0004 to -0007 | BR-0471 to BR-0490, BR-0513 | 24 findings | PASS |
| 3 | test-design-analyst | finder-tda-1c | Cycle 1 finder, US-0004-0008 to -0012 and the flow split | BR-0491 to BR-0512 | 18 findings | PASS |
| 4 | requirements-reviewer | griller-rr-1 | Cycle 1 griller | 66 findings | 42 adopted (one in part), 23 rejected, 2 for the user | PASS |
| 5 | acceptance-test-engineer | tester-ate-1 | Step-level tests for the new examples | EX-0004-0003-16, -0003-26, -0006-07, -0008-10, -0008-11, -0009-10 to -0009-12, -0010-05 | steps05to08.test.ts, step03MoveCatalog.test.ts | PASS |
| 6 | test-design-analyst | finder-tda-2 | Cycle 2 finder | Rules and examples cycle 1 changed | 8 findings | PASS |
| 7 | requirements-reviewer | griller-rr-2 | Cycle 2 griller, one author round | 8 findings | 6 adopted, 1 rejected, 1 for the user | PASS |

## Reviewer results

| Reviewer | Verdict | Evidence |
| -------- | ------- | -------- |
| user | PENDING | The pull request review approves DEC-0847. The four open questions were answered on 2026-09-26 (DEC-0848 to DEC-0851) |

## Open risks

- Steps 1 to 8 refuse unverifiable staging with exit 2, which neither BR-0458
  nor the exit-code table names.

## Final status

- Status: `REVISE`
- Reason: the user's pull request review is the approval DEC-0847 records.
