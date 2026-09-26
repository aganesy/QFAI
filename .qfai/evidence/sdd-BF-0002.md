# Evidence: /qfai-sdd BF-0002

## Objective

- Business flow: `BF-0002`
- Outcome: every rule whose examples cite an example of BF-0002 agrees with
  those examples, and every example it cites is explained by a rule and
  asserted by a test.

## Inputs and provenance

- Discussion requirement or import source: the user's request of 2026-09-26 to
  brush up the whole story tree with the concrete-abstract cycle. No discussion
  pack is tracked in this repository (DEC-0782).
- Scope: the cycle normally reads only the BRs an invocation wrote or changed.
  The user asked for a brush-up of the whole tree, so the first cycle read every
  BR whose Examples cite an EX of BF-0002 — 110 BRs across
  `.qfai/spec/03_contract/tech.md`, `cli/shipped-workflows.md`,
  `cli/qfai-init.md` and `cli/qfai-validate.md` — with the EXs and ACs they
  cite. The second cycle read what the first one changed.
- Procedure: `.qfai/assistant/skill/qfai-sdd/references/concrete-abstract-cycle.md`.

## Decisions and open questions

- Decision rows: DEC-0810 (cycle 1, adopted), DEC-0811 to DEC-0824 (cycle 1, rejected),
  DEC-0825 (cycle 2, adopted), DEC-0826 (cycle 2, rejected), DEC-0827
  (`Change request:` for every changed story-tree file).
- Open-question rows: none. No finding was left without a decision, and none
  rested on product intent that nothing written states.

## Pre-draft Grilling

| Phase | Session | Participants | Frontier | Recommendation | Disposition | Decision/OQ IDs | Ended at | Wrote at | Evidence |
| ----- | ------- | ------------ | -------- | -------------- | ----------- | --------------- | -------- | -------- | -------- |
| Cycle 1 adjudication | delegated, ended `adopted` | griller-rr-1 (requirements-reviewer, griller); the orchestrator answering for the authors, who are earlier sessions | the 60 cycle-1 findings | per finding, in the table below | adopted; no critical decision | DEC-0810, DEC-0811 to DEC-0824 | 2026-09-26T08:05Z | 2026-09-26T08:10Z | findings and positions kept locally, not tracked |
| Cycle 2 adjudication | delegated, ended `adopted` | griller-rr-2 (requirements-reviewer, griller); the orchestrator answering for the authors | the 11 cycle-2 findings | per finding, in the table below | adopted; no critical decision | DEC-0825, DEC-0826 | 2026-09-26T08:32Z | 2026-09-26T08:35Z | findings and positions kept locally, not tracked |

## Concrete-Abstract Cycle

Finders: finder-tda-a, finder-tda-b and finder-tda-c split the first cycle by
story range (US-0002-0001 to -0012, -0013 to -0018, -0019 to -0024), and
finder-tda-d ran the second. All four are test-design-analyst instances that
wrote none of the rules they read. Each cycle's griller is a
requirements-reviewer instance that is neither a finder nor an author of a
targeted item. Every targeted item existed before this invocation, so every
adopted change is applied under DEC-0827. The second cycle adopted findings, so
the loop ends there: no third cycle runs.

| Cycle | Finding | Kind | Target IDs | Decision | Adjudicator | Reason |
| ----- | ------- | ---- | ---------- | -------- | ----------- | ------ |
| 1 | C1-A1: every shipped file declares a ref-scoped `concurrency:` group with `cancel-in-progress: true`, which the criterion states and no rule or example did | a case the rule implies that no example states | AC-0002-0001-01, BR-0060, EX-0002-0001-01 | adopted | griller-rr-1 | BR-0060 and EX-0002-0001-01 state the concurrency group; an existing test already asserts it |
| 1 | C1-A2: a `uses:` ref carrying an abbreviated (7-hex or 39-hex) SHA | a case the rule implies that no example states | BR-0063, EX-0002-0002-01 | rejected (DEC-0811) | griller-rr-1 | EX-0002-0002-01 already requires a 40-hex SHA after every `@`, and its test anchors the whole ref, so a short SHA already fails |
| 1 | C1-A3: a SHA-pinned step with no `name:`, or a name carrying no version | a case the rule implies that no example states | BR-0064, EX-0002-0002-04 | rejected (DEC-0812) | griller-rr-1 | EX-0002-0002-04 is universal and its test already reports both a missing name and a name with no version |
| 1 | C1-A4: a shipped file name with the right prefix and the wrong suffix or case (`qfai-docs.yaml`, `qfai-Docs.yml`) | a case the rule implies that no example states | BR-0067, EX-0002-0003-01 | rejected (DEC-0813) | griller-rr-1 | EX-0002-0003-01 states the full pattern; a second plant would test the regular expression, not a separate behaviour |
| 1 | C1-A5: an adopter that declares one layer-named script: that lane runs and the others stay skipped | a case the rule implies that no example states | AC-0002-0003-02, BR-0069, EX-0002-0003-03 | adopted | griller-rr-1 | EX-0002-0003-03 states the declared-script side; a new assertion discharges it |
| 1 | C1-A6: the aggregate's always-run condition, exact `needs` list and empty permission map, which the rule requires and the example did not show | a rule its examples do not support | BR-0087, EX-0002-0003-06 | adopted | griller-rr-1 | EX-0002-0003-06 states the three declarations; existing tests already assert them |
| 1 | C1-A7: a diff whose only changed path is outside the recognized set also emits a warning annotation | a rule its examples do not support | BR-0072, EX-0002-0004-02, AC-0002-0004-01 | adopted | griller-rr-1 | EX-0002-0004-02 states the annotation for all three degraded inputs, matching BR-0072 and the shipped shell |
| 1 | C1-A8: the criterion named four header items where the rule and the example name seven | a flow, story or criterion split the rules show to be wrong | AC-0002-0005-01, BR-0075, EX-0002-0005-02 | adopted | griller-rr-1 | AC-0002-0005-01 names all seven header items |
| 1 | C1-A9: the collision file and the `modified` file keep their bytes across `qfai init` | a case the rule implies that no example states | AC-0002-0007-01, BR-0081, EX-0002-0007-04 | adopted | griller-rr-1 | EX-0002-0007-04 states the byte identity its test already checks |
| 1 | C1-A10: EX-0002-0007-01 and EX-0002-0007-06 both asserted the workflows prune predicate | a redundant example | BR-0078, BR-0085, EX-0002-0007-01, EX-0002-0007-06 | adopted | griller-rr-1 | the predicate stays in EX-0002-0007-06 and BR-0085 only; EX-0002-0007-01 and BR-0078 drop it |
| 1 | C1-A11: the shipped and retired workflow name lists share no name | a case the rule implies that no example states | BR-0078, EX-0002-0007-01 | adopted | griller-rr-1 | EX-0002-0007-01 and BR-0078 state the disjointness an existing test asserts |
| 1 | C1-A12: the lower edge of the sample band: a `0000` segment and a `00` tail | a case the rule implies that no example states | BR-0095, BR-0165, EX-0002-0009-01 | adopted | griller-rr-1 | EX-0002-0009-01 plants both; the parity test already asserts them |
| 1 | C1-A13: the source-comment guard over `DEC-NNNN`, `OQ-NNNN`, `BR-NNNN` and a legacy composite reported once | a case the rule implies that no example states | BR-0165, EX-0002-0009-01, EX-0002-0009-02 | adopted | griller-rr-1 | BR-0165 cites EX-0002-0009-01 and EX-0002-0009-02, whose tests already run the source-comment rule over every shape |
| 1 | C1-A14: the rule names the pre-build lint, which its cited example did not run | a rule its examples do not support | BR-0095, EX-0002-0009-01 | adopted | griller-rr-1 | EX-0002-0009-01 runs the pre-build lint beside the other two guards, as its test already does |
| 1 | C1-A15: a pull request that edits only the prompt, and one that edits both files | a case the rule implies that no example states | AC-0002-0010-01, BR-0125, EX-0002-0010-01 | adopted | griller-rr-1 | EX-0002-0010-01 states all three partitions; existing tests assert them |
| 1 | C1-A16: a misplaced `discussion-*/` directory at the repository root | a case the rule implies that no example states | BR-0130, EX-0002-0011-01 | adopted | griller-rr-1 | EX-0002-0011-01 states it; a new assertion discharges it |
| 1 | C1-A17: the proposed path for a misplaced review pack kept or dropped its `review-` prefix | a rule its examples do not support | BR-0130, EX-0002-0011-01, EX-0002-0011-02 | adopted | griller-rr-1 | the directory keeps its name under the allowed root of its kind, as the lane, its test and the root-additions policy already do |
| 1 | C1-B1: a local `./` action reference, which the shared setup definition requires and which carries no SHA | a rule its examples do not support | BR-0402, BR-0406, BR-0407, EX-0002-0014-07 | adopted | griller-rr-1 | BR-0402 pins only references to another repository; EX-0002-0014-07 accepts local references |
| 1 | C1-B2: a job whose permission block is declared on its workflow | a rule its examples do not support | BR-0419, BR-0396, EX-0002-0018-01 | adopted | griller-rr-1 | BR-0419's first rule reads reachability, as BR-0396 requires |
| 1 | C1-B3: "exactly five rules" against the pin, required-context and sanctioned-set rules the same lane runs | a rule its examples do not support | BR-0419, EX-0002-0018-01, BR-0389, BR-0425, BR-0428, BR-0449 | adopted | griller-rr-1 | BR-0419 bounds its structural rule set to five and leaves the other rules under their own scopes |
| 1 | C1-B4: a floating reference planted only in a composite action under `.github/actions/**` | a rule its examples do not support | BR-0419, BR-0402, EX-0002-0014-07 | adopted | griller-rr-1 | EX-0002-0014-07 plants it; a new assertion discharges it |
| 1 | C1-B5: a needs map mixing `success` and `skipped` | a case the rule implies that no example states | BR-0384, EX-0002-0013-02, AC-0002-0013-03 | adopted in part; the rest rejected (DEC-0823) | griller-rr-1 | BR-0384 and EX-0002-0013-02 accept any mix; a new assertion discharges it |
| 1 | C1-B6: the hygiene lane rejecting a hand-written need list, which no rule explained | an example no rule explains | BR-0383, BR-0387, EX-0002-0013-05 | adopted | griller-rr-1 | BR-0383 states the lane check and cites EX-0002-0013-05; BR-0387 stays a review rule |
| 1 | C1-B7: a condition other than `always()` on the declared required-context job itself | a case the rule implies that no example states | BR-0394, EX-0002-0013-12 | adopted | griller-rr-1 | BR-0394 allows `always()` only, and EX-0002-0013-12 plants the own-condition case |
| 1 | C1-B8: both examples planted a condition on a dependency | a redundant example | BR-0394, BR-0425, EX-0002-0013-12, EX-0002-0018-07 | adopted | griller-rr-1 | the dependency case stays in EX-0002-0018-07 only |
| 1 | C1-B9: a checkout step with `persist-credentials: true` | a case the rule implies that no example states | BR-0400, EX-0002-0014-05 | adopted | griller-rr-1 | EX-0002-0014-05 plants it; an existing test already asserts it |
| 1 | C1-B10: a permitted block value moved to another file or job | a case the rule implies that no example states | BR-0398, EX-0002-0014-03 | rejected (DEC-0814) | griller-rr-1 | EX-0002-0014-03 names every block by file, job and value, and its test compares those keys, so a moved grant already fails |
| 1 | C1-B11: a shallow clone and an unreachable base as separate inputs, each naming its own reason | a case the rule implies that no example states | BR-0390, EX-0002-0013-08 | rejected (DEC-0815) | griller-rr-1 | both reach the classifier as one failed diff whose reason is git's own message; the existing test already runs them separately |
| 1 | C1-B12: a change list pairing an unrecognized path with a documentation-only path | a case the rule implies that no example states | BR-0391, EX-0002-0013-09 | adopted | griller-rr-1 | EX-0002-0013-09 states it; a new assertion discharges it |
| 1 | C1-B13: `continue-on-error: true` planted on a verification step of `build` | a case the rule implies that no example states | BR-0415, BR-0425, EX-0002-0016-05 | adopted | griller-rr-1 | EX-0002-0016-05 plants it; an existing test already asserts it |
| 1 | C1-B14: the two pack-lifecycle builds stay unchanged | a rule its examples do not support | BR-0411, EX-0002-0016-01, AC-0002-0016-01 | adopted | griller-rr-1 | BR-0411 states it, as its example, criterion and test do |
| 1 | C1-B15: a committed pin figure other than the timeout sum changed | a case the rule implies that no example states | BR-0449, EX-0002-0017-04 | adopted | griller-rr-1 | EX-0002-0017-04 changes each figure; existing tests assert them |
| 1 | C1-B16: an unknown or empty checks shape, and an operations checks shape over a whole suite | a case the rule implies that no example states | BR-0450, EX-0002-0017-05 | adopted | griller-rr-1 | EX-0002-0017-05 states them; an existing test asserts them |
| 1 | C1-B17: build, pack verification and the post-build leakage scan serial in `gate` | a case the rule implies that no example states | BR-0451, EX-0002-0017-06 | adopted | griller-rr-1 | EX-0002-0017-06 states the order; an existing test asserts it |
| 1 | C1-C1: the example and criterion put the worker and file-parallelism settings on every project, where the rule puts them at the root | an example no rule explains | BR-0429, EX-0002-0019-01, AC-0002-0019-01 | adopted | griller-rr-1 | EX-0002-0019-01 and AC-0002-0019-01 follow BR-0429 and the configuration |
| 1 | C1-C2: the hook timeout, and a pool-options block the runner reads nowhere | a rule its examples do not support | BR-0429, EX-0002-0019-01 | adopted | griller-rr-1 | BR-0429 names the hook timeout and forbids the pool-options block |
| 1 | C1-C3: a knob declared at a scope the runner does not read | a case the rule implies that no example states | BR-0429, EX-0002-0019-01 | adopted | griller-rr-1 | folded into EX-0002-0019-01's negative clauses; no new example |
| 1 | C1-C4: an adopted setting 15% slower with a reason, and 5% slower with none | a case the rule implies that no example states | BR-0431, EX-0002-0019-03 | rejected (DEC-0816) | griller-rr-1 | EX-0002-0019-03 is universal and its test computes both conditions from the artifact |
| 1 | C1-C5: an adopted setting exactly ten percent slower than the fastest | a case the rule implies that no example states | BR-0431, EX-0002-0019-03 | adopted | griller-rr-1 | "within ten percent" is read inclusively, as the existing test pins it; BR-0431 and EX-0002-0019-03 say "at most ten percent slower". The finder and the applier had held it for the user; the griller found the written contract and test settle it |
| 1 | C1-C6: the timings quoted in the pull-request description and in the evidence tree | a case the rule implies that no example states | AC-0002-0019-03, BR-0431 | rejected (DEC-0817) | griller-rr-1 | EX-0002-0016-02 already covers every cost, wall-clock or parallelism claim, and the description half can only be checked in review |
| 1 | C1-C7: the criterion kept the lower value whenever the higher was slower, where the rule repairs a removable cause first | a rule its examples do not support | AC-0002-0019-03, BR-0432, EX-0002-0019-04 | adopted | griller-rr-1 | AC-0002-0019-03 follows BR-0432 |
| 1 | C1-C8: a revised starting value carrying the user's sign-off, accepted | a case the rule implies that no example states | BR-0433, EX-0002-0019-05 | rejected (DEC-0818) | griller-rr-1 | no test can observe a sign-off; EX-0002-0019-05 already states the other side |
| 1 | C1-C9: two recorded run identifiers where three are required | a case the rule implies that no example states | BR-0435, EX-0002-0019-12 | adopted in part; the rest rejected (DEC-0824) | griller-rr-1 | EX-0002-0019-12 states it; an existing test asserts it. Non-consecutive greens and tuning a non-largest project first are not adopted: no record holds run order, and EX-0002-0019-07 already names the largest project |
| 1 | C1-C10: the example cited an ID the tree does not declare and a record path that does not exist | an example no rule explains | BR-0435, EX-0002-0019-12 | adopted | griller-rr-1 | EX-0002-0019-12 names the tuning change's run history and the record its test reads |
| 1 | C1-C11: a rerun-to-green rate of exactly one in twenty | a case the rule implies that no example states | BR-0436, EX-0002-0019-08 | adopted | griller-rr-1 | EX-0002-0019-08 states it does not reopen the setting; an existing test asserts it |
| 1 | C1-C12: no declared runner project matches zero files, which the criterion and example state and the rule did not | a rule its examples do not support | BR-0437, EX-0002-0019-09, AC-0002-0019-02 | adopted | griller-rr-1 | BR-0437 states the general rule |
| 1 | C1-C13: an undeclared selector filtered to an empty selection, and zero spec references, which no rule explains | an example no rule explains | BR-0437, EX-0002-0019-09 | adopted | griller-rr-1 | EX-0002-0019-09 drops both clauses |
| 1 | C1-C14: a slice with no per-slice script, and a sliced job passing a project name through a generic script | a case the rule implies that no example states | BR-0438, EX-0002-0019-10 | rejected (DEC-0819) | griller-rr-1 | EX-0002-0019-10 is universal and its test asserts both over the real tree |
| 1 | C1-C15: the retired slice's absence was stated in both rules and both examples | a redundant example | BR-0438, BR-0439, EX-0002-0019-10, EX-0002-0019-11 | adopted | griller-rr-1 | it stays in BR-0439 and EX-0002-0019-11 only |
| 1 | C1-C16: one of the seven surfaces differing, such as `SUITE_SLICES` holding six names | a case the rule implies that no example states | BR-0439, EX-0002-0019-11 | rejected (DEC-0820) | griller-rr-1 | EX-0002-0019-11 is an equality across every surface and its test asserts it |
| 1 | C1-C17: the gate present but the justification recorded as the mirror's absence | a case the rule implies that no example states | BR-0443, EX-0002-0020-04 | rejected (DEC-0821) | griller-rr-1 | only review can judge a justification; EX-0002-0020-04 already names the required one |
| 1 | C1-C18: each rule's first clause required what its example shows absent in the current assistant tree | a rule its examples do not support | BR-0444, BR-0445, EX-0002-0021-02, EX-0002-0021-03 | adopted | griller-rr-1 | both rules state only the current tree |
| 1 | C1-C19: the layer-vocabulary partitions were stated in two examples each | a redundant example | BR-0418, BR-0444, BR-0447, EX-0002-0021-01, EX-0002-0021-02, EX-0002-0021-05 | adopted | griller-rr-1 | EX-0002-0021-01 keeps both; BR-0444 and BR-0447 cite it |
| 1 | C1-C20: the mapping must not direct a test annotation outside the validator's test scan | a rule its examples do not support | BR-0446, EX-0002-0021-04, AC-0002-0021-01 | adopted | griller-rr-1 | BR-0446 states it and EX-0002-0021-04 names the configured globs |
| 1 | C1-C21: the rejection of a regular-file mirror names the root path and the link it expected | a rule its examples do not support | BR-0448, EX-0002-0021-06 | adopted | griller-rr-1 | BR-0448 states it |
| 1 | C1-C22: a repository-root-only path under a name that is not retired | a case the rule implies that no example states | BR-0452, EX-0002-0022-02 | adopted | griller-rr-1 | EX-0002-0022-02 plants `.qfai/assistant/notes/x.md`; a new assertion discharges it |
| 1 | C1-C23: a pull request changing the guards without the shape table, or the table without the guards | a case the rule implies that no example states | BR-0454, EX-0002-0023-01 | rejected (DEC-0822) | griller-rr-1 | only review can judge it; BR-0454 stays a review rule |
| 1 | C1-C24: the criterion omitted the workflow control-core suites the rule and example list | a rule its examples do not support | AC-0002-0024-01, BR-0694, EX-0002-0024-01 | adopted | griller-rr-1 | AC-0002-0024-01 names them |
| 1 | C1-C25: the rule's clause that no listed test reads a tracked link had no example | a rule its examples do not support | BR-0694, EX-0002-0024-01 | adopted | griller-rr-1 | the clause moves to prose after the tech.md rules table as the reason for the list |
| 1 | C1-C26: the Windows job concluding `skipped` | a case the rule implies that no example states | BR-0695, EX-0002-0024-05, AC-0002-0024-02 | adopted | griller-rr-1 | EX-0002-0024-05 states the verdict exits 0; a new assertion discharges it |
| 2 | C2-D1: the example and criterion name the failed need, which no rule stated | an example no rule explains | BR-0383, BR-0385, EX-0002-0013-05, AC-0002-0013-01 | adopted | griller-rr-2 | BR-0385 names the need and cites EX-0002-0013-05; existing tests assert it |
| 2 | C2-D2: the rewritten dependency sentence covered every unconditioned job, where the lane and the example read only the declared job's closure | a rule its examples do not support | BR-0394, EX-0002-0018-07, EX-0002-0013-12 | adopted | griller-rr-2 | amended: the sentence applies to the declared job's `needs` closure when it carries no condition; the finder's wording would have forbidden `ci-pass`, which carries `always()` |
| 2 | C2-D3: the example made the hygiene lane exit 1, which the rule did not state, and promised wording the lane does not print | an example no rule explains | BR-0415, EX-0002-0016-05 | adopted | griller-rr-2 | BR-0415 states the exit; EX-0002-0016-05 plants an expression value and names the item, as its test does |
| 2 | C2-D4: the example named the legs that would change while no leg downloads, which no rule or output does | an example no rule explains | BR-0411, EX-0002-0016-01 | adopted | griller-rr-2 | EX-0002-0016-01 drops the clause. Dissent: the applier preferred widening BR-0411; not taken, because the clause described how the test checks itself |
| 2 | C2-D5: the example checks every include glob, the rule only every project | a rule its examples do not support | BR-0437, EX-0002-0019-09, AC-0002-0019-02 | adopted | griller-rr-2 | BR-0437 covers every include glob, as its test does |
| 2 | C2-D6: the root-only path under no retired name was explained by no citing rule | an example no rule explains | BR-0452, BR-0453, EX-0002-0022-02 | adopted | griller-rr-2 | BR-0452 makes `--check` exit 1 on it and cites EX-0002-0022-02 |
| 2 | C2-D7: both examples asserted that the section does not activate per-level routing | a redundant example | BR-0445, BR-0446, EX-0002-0021-03, EX-0002-0021-04 | adopted | griller-rr-2 | amended: the routing clause stays in BR-0445 and EX-0002-0021-03; BR-0446 and EX-0002-0021-04 keep only annotation placement |
| 2 | C2-D8: every job checks out `verify.sha` before the setup sidecar | a case the rule implies that no example states | BR-0451, EX-0002-0017-06 | adopted in part; the rest rejected (DEC-0826) | griller-rr-2 | amended: EX-0002-0017-06 states the order its test asserts; the swapped-copy refusal is rejected |
| 2 | C2-D9: the example said each failing value names the concluded result, which no rule or test states | an example no rule explains | BR-0087, EX-0002-0003-06 | adopted | griller-rr-2 | EX-0002-0003-06 drops the clause; the executing tests gain its annotation |
| 2 | C2-D10: the example names both paths of an un-paired change, which the rule did not state | an example no rule explains | BR-0125, EX-0002-0010-01 | adopted | griller-rr-2 | BR-0125's one-sided clause names them, as the criterion and tests do |
| 2 | C2-D11: a review pack placed under `.qfai/discussion/` | a case the rule implies that no example states | BR-0130, EX-0002-0011-01 | adopted | griller-rr-2 | not sent to the user: the lane keys allowed roots by kind and the root-additions policy puts a review pack under `.qfai/review/`; BR-0130's detection is per kind, and EX-0002-0011-01 plants the case with a new assertion. The finder had marked it as product intent |

## Artifacts changed

| Layer | IDs or paths |
| ----- | ------------ |
| BF | `BF-0002` (unchanged) |
| US | none |
| AC | AC-0002-0005-01, AC-0002-0019-01, AC-0002-0019-03, AC-0002-0024-01 |
| EX | EX-0002-0001-01, -0003-03, -0003-06, -0004-02, -0007-01, -0007-04, -0009-01, -0010-01, -0011-01, -0013-02, -0013-09, -0013-12, -0014-05, -0014-07, -0016-01, -0016-05, -0017-04, -0017-05, -0017-06, -0018-01, -0019-01, -0019-03, -0019-08, -0019-09, -0019-10, -0019-12, -0021-02, -0021-04, -0021-05, -0022-02, -0024-05 (rows changed; none added or removed) |
| BR | BR-0060, BR-0078 in `cli/shipped-workflows.md`; BR-0125, BR-0130, BR-0165 in `cli/qfai-validate.md`; BR-0383, BR-0384, BR-0385, BR-0394, BR-0402, BR-0411, BR-0415, BR-0419, BR-0429, BR-0431, BR-0437, BR-0438, BR-0444, BR-0445, BR-0446, BR-0447, BR-0448, BR-0452, BR-0694 in `tech.md` |
| Tests | new assertions for EX-0002-0003-03, -0011-01 (two), -0013-02, -0013-09, -0014-07, -0019-01, -0021-05, -0022-02, -0024-05; annotations added or moved next to the test that asserts each changed EX |

## Contract executability

- Executability: none. The change edits Markdown contracts; no DB contract
  changes.

## Validation

- Command: `qfai validate --profile sdd --fail-on error --flow BF-0002`, run
  from a fresh `tsup` build of this branch.
- Result: exit 0; error 0, warning 2 (`QFAI-DCON-034`, the sample `DESIGN.md`;
  `QFAI-REVIEW-002`, no review pack), both present before this change.
- `--profile drift`: exit 0, error 0.
- `--profile tdd`: 205 `QFAI-STORY-006` errors, all in the pinned backlog. The
  two in BF-0002 are EX-0002-0002-03 and EX-0002-0023-01, which no finding
  targeted. `node scripts/check-dogfood-backlog.mjs` passes for `sdd`, `tdd`
  and `full`; the `tdd` and `full` pins fall by one, for EX-0002-0021-05, which
  now has a test. No pin rises.
- Other lanes: `check-mdschema.mjs --scope all`, `check-mermaid.mjs`,
  `check-doc-clarity.mjs`, markdownlint and prettier pass on the changed files.
- Tests: the 20 changed test files pass, except two cases in
  `ownWorkflowTopology.test.ts` that need `jq`, which this machine lacks.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | test-design-analyst | finder-tda-a | Finder, cycle 1, US-0002-0001 to -0012 | the BRs citing those EXs | 17 findings | PASS |
| 2 | test-design-analyst | finder-tda-b | Finder, cycle 1, US-0002-0013 to -0018 | the BRs citing those EXs | 17 findings | PASS |
| 3 | test-design-analyst | finder-tda-c | Finder, cycle 1, US-0002-0019 to -0024 | the BRs citing those EXs | 26 findings | PASS |
| 4 | requirements-reviewer | griller-rr-1 | Griller, cycle 1 | the 60 findings and the orchestrator's position | 48 adopted, 12 rejected | PASS |
| 5 | acceptance-test-engineer | tests-ate-1 | Assert or annotate every changed EX | the adopted cycle-1 changes | the test files in this change | PASS |
| 6 | test-design-analyst | finder-tda-d | Finder, cycle 2 | the BRs, EXs and ACs cycle 1 changed | 11 findings | PASS |
| 7 | requirements-reviewer | griller-rr-2 | Griller, cycle 2 | the 11 findings and the orchestrator's position | 11 adopted, 3 amended | PASS |

## Reviewer results

| Reviewer | Verdict | Evidence |
| -------- | ------- | -------- |
| completion-reviewer | PASS | Every changed story-tree file is named by DEC-0827 and nothing else; every finding row is complete; the changed BRs agree with their EXs; 20 changed EXs spot-checked against the tests that assert them. Two record advisories applied (DEC-0825 count, DEC-0823 and DEC-0824 target IDs) |

## Open risks

- Many rows of BF-0002 that no finding targeted are still in Japanese. The
  rewritten rules and examples are in English; the rest is the backlog the
  repository-language rule names.
- EX-0002-0017-04 cites `BR-0017-0030` and BR-0130 cites `REQ-0167` and
  `DR-0274`, IDs the story tree does not declare. No finding targeted them.
- The EX-0002-0021-05 test holds its warning baseline as a constant in the
  test, not read from a recorded file.
- Two tests in `ownWorkflowTopology.test.ts` need `jq`, which the local
  machine lacks. They are unrelated to this change and run in CI.

## Final status

- Status: `PASS`
- Reason: both cycles ran and every finding has a decision; the changed rules,
  criteria and examples agree; each changed example is asserted by a test; the
  checks under Validation pass.
