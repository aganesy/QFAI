# Evidence: /qfai-sdd BF-0003

## Objective

- Business flow: `BF-0003`
- Outcome: the rules of BF-0003 and the examples they generalize agree, after
  two concrete-abstract cycles over every rule that cites an example of the flow.

## Inputs and provenance

- Discussion requirement or import source: the user's request of 2026-09-26 to
  brush up the whole story tree with the concrete-abstract cycle, one flow per
  pull request. No discussion pack is tracked.
- Scope: the cycle normally reads only the rules an invocation wrote or changed.
  The user asked for the whole tree, so this run read every BR whose Examples
  cite an EX of BF-0003: BR-0178 to BR-0199, BR-0525 and BR-0526 in
  `.qfai/spec/03_contract/cli/qfai-doctor.md`, and BR-0200 to BR-0209 in
  `.qfai/spec/03_contract/cli/qfai-guardrails.md`.
- Approval of changes to existing items: the user's review of this flow's pull
  request, as the user decided on 2026-09-26 (DEC-0833).

## Decisions and open questions

- Decision rows: DEC-0828 (cycle 1 adopted), DEC-0829 to DEC-0831 (cycle 1
  rejected), DEC-0832 (cycle 2 adopted), DEC-0833 (`Change request:`),
  DEC-0834 to DEC-0836 (the user's answers to OQ-0196 to OQ-0198).
- Open-question rows: OQ-0196, OQ-0197 and OQ-0198, the three findings that rest
  on a choice between the contract and the product. No agent decided them. The
  user answered all three on 2026-09-26, each with option 1, and they are DONE.

## Pre-draft Grilling

This run wrote no new design. Its only story-tree mutations are the adopted
findings, and each cycle's griller adjudicated them in a delegated session before
any file changed.

| Phase | Session | Participants | Frontier | Recommendation | Disposition | Decision/OQ IDs | Ended at | Wrote at | Evidence |
| ----- | ------- | ------------ | -------- | -------------- | ----------- | --------------- | -------- | -------- | -------- |
| Concrete-abstract cycle 1 | delegated, 1 round, ended `adopted` | griller-rr-1 (requirements-reviewer); author side (the applier); finder-tda-1 (test-design-analyst) | F1-01 to F1-39 | per finding, in the table below | 35 adopted, 1 rejected, 3 put to the user | DEC-0828 to DEC-0831, OQ-0196 to OQ-0198 | 2026-09-26 | 2026-09-26 | the table below |
| Concrete-abstract cycle 2 | delegated, 1 round, ended `adopted` | griller-rr-2 (requirements-reviewer); author side (the applier); finder-tda-2 (test-design-analyst) | F2-01 to F2-18 | per finding, in the table below | 18 adopted | DEC-0832 | 2026-09-26 | 2026-09-26 | the table below |

## Concrete-Abstract Cycle

Two cycles ran. Cycle 1 adopted findings, so cycle 2 ran; no third cycle runs.
Every target existed before this run, so every adopted change is covered by the
`Change request:` row DEC-0833, which names each changed file. Findings a cycle
rejected are DEC-0829 to DEC-0831. Where a griller amended a finding, the
finder's or the author side's position is the dissent.

| Cycle | Finding | Kind | Target IDs | Decision | Adjudicator | Reason |
| ----- | ------- | ---- | ---------- | -------- | ----------- | ------ |
| 1 | F1-01: only `playwright-cli` resolves, past the 1.10.0 sunset | a rule its examples do not support | BR-0185, EX-0003-0006-02, AC-0003-0006-01, AC-0003-0006-02, US-0003-0006 | adopted: post-sunset `error` in BR-0185, the EX and the story | griller-rr-1 | The product and its test already emit `error` |
| 1 | F1-02: `playwright-cli` alone is not "every probe fails" | a flow, story or criterion split the rules show to be wrong | EX-0003-0006-02, AC-0003-0006-01, AC-0003-0006-02 | adopted, amended: new AC-0003-0006-04 | griller-rr-1 | AC-0003-0006-01's Given contradicts the case. Dissent: finder and author proposed re-pointing to AC-0003-0006-01 |
| 1 | F1-03: `npx` fallback resolves with no local launcher | a case the rule implies that no example states | BR-0184, AC-0003-0006-01 | adopted, amended: EX-0003-0006-05; the Windows shim-only case rejected (DEC-0830) | griller-rr-1 | EX-0003-0006-01 already runs on the Windows shim |
| 1 | F1-04: BR-0184 says where a document records the order | a rule its examples do not support | BR-0184 | adopted: clause removed | griller-rr-1 | No run of the command can show it |
| 1 | F1-05: Input and Expected of EX-0003-0006-04 are identical | a rule its examples do not support | EX-0003-0006-04, BR-0526 | adopted: Input and Expected separated | griller-rr-1 | Expected stated no outcome |
| 1 | F1-06: the error leg of EX-0003-0007-02 is a missing config, which is a warning | an example no rule explains | EX-0003-0007-02, BR-0188, EX-0003-0001-03 | adopted: a prototyping error | griller-rr-1 | The product reports a missing config as a warning |
| 1 | F1-07: BR-0188 promises group identifiers in JSON, which the product does not emit | a rule its examples do not support | BR-0188 | adopted: BR-0188 narrowed to text output (OQ-0196, DEC-0834) | user | Either withdraws a published promise or changes the product |
| 1 | F1-08: `skills.integrity` drift alone under `--fail-on warning` | a case the rule implies that no example states | BR-0187, AC-0003-0007-01 | adopted: EX-0003-0007-03 | griller-rr-1 | BR-0187 states exit 1 |
| 1 | F1-09: BR-0179 names a delegation its examples cannot show | a rule its examples do not support | BR-0179, EX-0003-0001-03, EX-0003-0002-01 | adopted: BR-0179 states the observable outcomes | griller-rr-1 | The rule named a function |
| 1 | F1-10: a missing default `specsDir` is `info`, not a warning | a rule its examples do not support | EX-0003-0002-01, AC-0003-0002-01, US-0003-0002 | adopted: the configured non-default path | griller-rr-1 | No written rule states the default case, so none is added |
| 1 | F1-11: no example asserts AC-0003-0001-01's Then | a flow, story or criterion split the rules show to be wrong | AC-0003-0001-01, EX-0003-0001-01, EX-0003-0001-02, EX-0003-0001-04 | adopted, amended: EX-0003-0001-05; EX-0003-0001-01 names the found path | griller-rr-1 | IDs stay in their story. Dissent: finder proposed moving EX-0003-0001-04 |
| 1 | F1-12: root found in an ancestor directory | a case the rule implies that no example states | BR-0180, AC-0003-0001-01 | adopted, amended: EX-0003-0001-06; the no-config case rejected (DEC-0831) | griller-rr-1 | EX-0003-0001-03 already shows it |
| 1 | F1-13: explicit `--format json` has no rule and no named keys | an example no rule explains | EX-0003-0005-01, BR-0178, AC-0003-0005-01 | adopted: BR-0178 and the EX name the keys | griller-rr-1 | "Equivalent information" names nothing testable |
| 1 | F1-14: BR-0182 says nothing reaches stdout | a rule its examples do not support | BR-0182, EX-0003-0005-02 | adopted: stdout carries the `doctor: wrote` line | griller-rr-1 | The product and the contract print it |
| 1 | F1-15: `--out` under a missing parent directory | a case the rule implies that no example states | BR-0182, AC-0003-0005-02 | adopted: EX-0003-0005-03 | griller-rr-1 | BR-0182 states the directory is created |
| 1 | F1-16: exit code with an error and no `--fail-on` | a case the rule implies that no example states | BR-0181, AC-0003-0012-01, AC-0003-0012-02, US-0003-0012 | adopted: case A as BR-0181 rewritten to `validation.failOn`, AC-0003-0012-04 and EX-0003-0012-04 (OQ-0197, DEC-0835); case B covered by F1-17 | user | The product applies `validation.failOn`, which contradicts BR-0181 |
| 1 | F1-17: EX-0003-0011-09 shows BR-0181's second clause | a flow, story or criterion split the rules show to be wrong | EX-0003-0011-09, AC-0003-0011-02, BR-0196, BR-0181 | adopted, amended: control Then in AC-0003-0011-02; BR-0181 cites the EX | griller-rr-1 | No ID moves. Dissent: finder proposed a US-0003-0012 criterion |
| 1 | F1-18: a configured TTL of 30 days, and a pack exactly 14 days old | a case the rule implies that no example states | BR-0189, AC-0003-0008-01 | adopted: EX-0003-0008-03, EX-0003-0008-04 | griller-rr-1 | BR-0189 states both |
| 1 | F1-19: `--autoremediate --yes` with no `--profile <skill>` expects `npm install` | a rule its examples do not support | EX-0003-0009-01, BR-0191, AC-0003-0009-01 | adopted: the Input names the profile; BR-0191 names the precondition | griller-rr-1 | The contract skips the install phase without it |
| 1 | F1-20: `--autoremediate` without `--yes`, unconfirmed | a case the rule implies that no example states | BR-0191, AC-0003-0009-01 | rejected (DEC-0829) | griller-rr-1 | The contract records the binary as breaching the gate |
| 1 | F1-21: BR-0191 lists three writes as if complete | a rule its examples do not support | BR-0191 | adopted: the list is no longer exhaustive | griller-rr-1 | The product writes more |
| 1 | F1-22: `CI=false` and `GITHUB_ACTIONS=true` | a case the rule implies that no example states | BR-0192, AC-0003-0009-02 | adopted: EX-0003-0009-03, EX-0003-0009-04 | griller-rr-1 | The contract defines the CI predicate |
| 1 | F1-23: three examples pack independent cases | a flow, story or criterion split the rules show to be wrong | EX-0003-0009-02, EX-0003-0010-02, EX-0003-0011-03 | adopted, amended: EX-0003-0009-05, EX-0003-0011-10, EX-0003-0011-11; EX-0003-0010-02 waits on OQ-0198 | griller-rr-1 | One failing leg hid the others |
| 1 | F1-24: doctor never emits `R-SKILL-MANIFEST-DRIFT` | a rule its examples do not support | BR-0194, AC-0003-0010-02, EX-0003-0010-02, US-0003-0010 | adopted: the drift clause removed from the US, AC, BR and EX (OQ-0198, DEC-0836); the retired pack reference dropped | user | Either withdraws a stated promise or changes the product |
| 1 | F1-25: a relocated `paths.skillsDir` | a case the rule implies that no example states | BR-0193, AC-0003-0010-01 | adopted: EX-0003-0010-03 | griller-rr-1 | BR-0193 states it |
| 1 | F1-26: BR-0193 cites an anchor that does not exist | a rule its examples do not support | BR-0193 | adopted: `#story-tree-paths` | griller-rr-1 | The reference resolved to nothing |
| 1 | F1-27: a line-ending-only difference | a case the rule implies that no example states | BR-0195, AC-0003-0011-01 | adopted: EX-0003-0011-12 | griller-rr-1 | BR-0195 compares after normalization |
| 1 | F1-28: rules and examples cite retired IDs | a rule its examples do not support | BR-0191, BR-0194 to BR-0199, AC-0003-0011-03, US-0003-0010, EX-0003-0011-04, EX-0003-0011-06 | adopted, amended: mapped from the migration record | griller-rr-1 | Traceability to undeclared IDs. Dissent: the author's arithmetic mapping |
| 1 | F1-29: BR-0198 argues from function internals | a rule its examples do not support | BR-0198 | adopted: observable outcomes | griller-rr-1 | Its examples show outcomes only |
| 1 | F1-30: the default `promptsDir` with content, with only `.gitkeep`, and absent | a case the rule implies that no example states | BR-0525, AC-0003-0004-01 | adopted: EX-0003-0004-02 to EX-0003-0004-04 | griller-rr-1 | BR-0525 states all three |
| 1 | F1-31: a configuration the loader rejects | a flow, story or criterion split the rules show to be wrong | US-0003-0001, BF-0003 | adopted, amended: AC-0003-0001-03, EX-0003-0001-07 | griller-rr-1 | The story and the flow state validity checks. The warning-only example was not appended: no input produces it (ratified in cycle 2) |
| 1 | F1-32: text `list` expected to print the rationale | an example no rule explains | EX-0003-0013-02, BR-0201, AC-0003-0013-01 | adopted, amended: the EX follows BR-0201's line | griller-rr-1 | EX-0003-0013-04 shows the fields. Dissent: finder offered widening BR-0201 |
| 1 | F1-33: an entry outside the scanned directories | a case the rule implies that no example states | BR-0200, AC-0003-0013-01 | adopted: EX-0003-0013-07 | griller-rr-1 | BR-0200 says "read only" |
| 1 | F1-34: `--keyword "SYMLINK"` against "symlink" | a case the rule implies that no example states | BR-0202, AC-0003-0014-01 | adopted: EX-0003-0014-04 | griller-rr-1 | BR-0202 states case-insensitivity |
| 1 | F1-35: default `--max`, invalid values and `--max 0` | a case the rule implies that no example states | BR-0203, AC-0003-0014-02 | adopted: EX-0003-0014-05 to EX-0003-0014-08; EX-0003-0014-02 states its fixture | griller-rr-1 | BR-0203 states the default and the refusal |
| 1 | F1-36: three rules name functions | a rule its examples do not support | BR-0204, BR-0208, BR-0209 | adopted: observable output | griller-rr-1 | No example can observe a function name |
| 1 | F1-37: `extract` ordering | a case the rule implies that no example states | BR-0209 | adopted: EX-0003-0014-09 | griller-rr-1 | BR-0209 covers `list` and `extract` |
| 1 | F1-38: two unreadable `--path` values | a case the rule implies that no example states | BR-0208, AC-0003-0016-02 | adopted: EX-0003-0016-03 | griller-rr-1 | "Every error" needs two sources |
| 1 | F1-39: `check` with warnings only; unnamed violations | a case the rule implies that no example states | BR-0205, BR-0206, AC-0003-0015-01, AC-0003-0015-02 | adopted: EX-0003-0015-03; EX-0003-0015-02 names its violations | griller-rr-1 | BR-0206's exit 0 had no warning example |
| 2 | F2-01: the product probes three stages | a rule its examples do not support | BR-0184, BR-0185, AC-0003-0006-01 | adopted: stage (3) named | griller-rr-2 | The launcher tries three stages |
| 2 | F2-02: `playwright-cli` present while `npx` resolves first | a case the rule implies that no example states | BR-0184, BR-0185, AC-0003-0006-04, EX-0003-0006-05 | adopted: EX-0003-0006-05 seeds the shim | griller-rr-2 | Its "no deprecated probe" check could not fail |
| 2 | F2-03: EX-0003-0006-01 expects an order log nothing prints | an example no rule explains | EX-0003-0006-01, BR-0184 | adopted: `details.resolvedStage` is `primary` | griller-rr-2 | No rule states an order log |
| 2 | F2-04: `config.load` can never be `warning` | a rule its examples do not support | BR-0179, AC-0003-0001-03, EX-0003-0001-07 | adopted: `config.load` is `error` | griller-rr-2 | Every loader issue is an error |
| 2 | F2-05: `--autoremediate --yes` with no skill profile | a case the rule implies that no example states | BR-0191, AC-0003-0009-01 | adopted, amended: AC-0003-0009-03, EX-0003-0009-06 | griller-rr-2 | AC-0003-0009-01's Given requires a manifest |
| 2 | F2-06: EX-0003-0009-05 cannot fail on "no install" | a case the rule implies that no example states | BR-0192, EX-0003-0009-05 | adopted: the Input names the profile | griller-rr-2 | Its test already passes one |
| 2 | F2-07: `CI` set to the empty string | a case the rule implies that no example states | BR-0192, AC-0003-0009-02 | adopted: EX-0003-0009-07 | griller-rr-2 | BR-0192 names empty as not CI |
| 2 | F2-08: an error alone under `--fail-on warning` | a case the rule implies that no example states | BR-0181, AC-0003-0012-02 | adopted, amended: AC-0003-0012-03, EX-0003-0012-03 | griller-rr-2 | AC-0003-0012-02's Given requires a warning |
| 2 | F2-09: `CLI-MANIFEST` resolves to nothing | a rule its examples do not support | BR-0193, US-0003-0010 | adopted, amended: also removed from US-0003-0009 with two retired requirement IDs | griller-rr-2 | Undeclared IDs |
| 2 | F2-10: a recorded name the package no longer ships | a case the rule implies that no example states | BR-0195, AC-0003-0011-01 | adopted: EX-0003-0011-13 | griller-rr-2 | BR-0195 says `extra` is not drift |
| 2 | F2-11: a tracked stale pack is not moved | a rule its examples do not support | BR-0189 | adopted, amended: BR-0189 narrowed; AC-0003-0008-03, EX-0003-0008-05 | griller-rr-2 | The contract body refuses the move |
| 2 | F2-12: a relative `--out` | a case the rule implies that no example states | BR-0182, AC-0003-0005-02 | adopted: EX-0003-0005-04 | griller-rr-2 | Both examples passed absolute paths |
| 2 | F2-13: `extract --format json` prints JSON | a rule its examples do not support | BR-0204, EX-0003-0014-09 | adopted: BR-0204 is limited to text | griller-rr-2 | JSON is a different output |
| 2 | F2-14: "ordered by type" names no order | a rule its examples do not support | BR-0209, EX-0003-0014-09, EX-0003-0013-06 | adopted: the order is named | griller-rr-2 | Any consistent order passed |
| 2 | F2-15: the same-type ID tie-break | a case the rule implies that no example states | BR-0209, EX-0003-0013-06, AC-0003-0013-01 | adopted: EX-0003-0013-06 states its fixture | griller-rr-2 | Its test already seeds it |
| 2 | F2-16: text `list` expected to carry the rationale | an example no rule explains | EX-0003-0013-04, BR-0200, BR-0201 | adopted: `--format json` in the Input | griller-rr-2 | Its test runs JSON |
| 2 | F2-17: `check` with an unreadable `--path` | a case the rule implies that no example states | BR-0208, BR-0206, AC-0003-0016-02 | adopted, amended: EX-0003-0016-04; AC-0003-0016-02 covers `check` | griller-rr-2 | Separates exit 2 from exit 1 |
| 2 | F2-18: which fields a keyword is matched against | a rule its examples do not support | BR-0202, EX-0003-0014-04 | adopted, amended: fields named; EX-0003-0014-10; no negative clause for the ID | griller-rr-2 | A negative promise would need its own example |

## Artifacts changed

| Layer | IDs or paths |
| ----- | ------------ |
| BF    | `BF-0003` (unchanged) |
| US    | US-0003-0006, US-0003-0009 and US-0003-0010 (Goal or Non-goals text; US-0003-0010 loses its drift sentence); no story created, split, merged or retired |
| AC    | changed: AC-0003-0002-01, AC-0003-0006-01, AC-0003-0006-02, AC-0003-0007-01, AC-0003-0010-02, AC-0003-0011-02, AC-0003-0011-03, AC-0003-0016-02; added: AC-0003-0001-03, AC-0003-0006-04, AC-0003-0008-03, AC-0003-0009-03, AC-0003-0012-03, AC-0003-0012-04 |
| EX    | changed: EX-0003-0001-01, EX-0003-0002-01, EX-0003-0005-01, EX-0003-0005-02, EX-0003-0006-01, EX-0003-0006-02, EX-0003-0006-04, EX-0003-0007-02, EX-0003-0009-01, EX-0003-0009-02, EX-0003-0010-02, EX-0003-0011-03, EX-0003-0011-04, EX-0003-0011-06, EX-0003-0011-09, EX-0003-0013-02, EX-0003-0013-04, EX-0003-0013-06, EX-0003-0014-02, EX-0003-0014-09, EX-0003-0015-02; added: 36 examples, listed in DEC-0828, DEC-0832 and DEC-0835; none removed |
| BR    | BR-0178 to BR-0182, BR-0184, BR-0185, BR-0187 to BR-0189, BR-0191 to BR-0199 and BR-0525 in `.qfai/spec/03_contract/cli/qfai-doctor.md`; BR-0200, BR-0202 to BR-0206, BR-0208 and BR-0209 in `.qfai/spec/03_contract/cli/qfai-guardrails.md`; no BR added |

## Contract executability

- Executability: none. The changes are to Markdown CLI contracts; no DB contract
  changes.

## Validation

- Command: `qfai validate --profile sdd --fail-on error --flow BF-0003`, run from
  a fresh `tsup` build of this branch.
- Result: exit 0; error 0, warning 2 (`QFAI-DCON-034`, the sample `DESIGN.md`;
  `QFAI-REVIEW-002`, no review pack), both present before this change.
- Run log: .qfai/report/run-20260926175352944 <!-- qfai:not-a-citation -->
- Other lanes: `--profile drift` reports 0 errors. `--profile tdd` reports no
  error on a BF-0003 item. The dogfood backlog guard passes for `tdd`, `full`
  and `sdd` with no pin raised. `check-mdschema.mjs --scope all`,
  `check-mermaid.mjs`, `check-doc-clarity.mjs`, markdownlint and prettier pass.
- Tests: `bf0003DoctorExamples.test.ts` and `bf0003GuardrailsExamples.test.ts`
  are new, and every test file whose annotations changed passes on its own.
  `skillManifestDrift.test.ts` no longer annotates EX-0003-0010-02, whose
  drift clause the user removed; it still tests `qfai validate`.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | test-design-analyst | finder-tda-1 | Finder, cycle 1; wrote no BR | BR-0178 to BR-0209, BR-0525, BR-0526 and their EXs | F1-01 to F1-39 | PASS |
| 2 | requirements-reviewer | griller-rr-1 | Griller, cycle 1 | the findings and the author side's answers | 35 adopted, 1 rejected, 3 to the user | PASS |
| 3 | orchestrating agent | applier | Author side; apply cycle 1; rewrite the BRs; tests | the adopted findings | story files, contracts, tests | PASS |
| 4 | test-design-analyst | finder-tda-2 | Finder, cycle 2; wrote no BR | the BRs and EXs cycle 1 changed | F2-01 to F2-18 | PASS |
| 5 | requirements-reviewer | griller-rr-2 | Griller, cycle 2; neither finder nor author | the findings and the author side's answers | 18 adopted; two cycle-1 amendments ratified | PASS |
| 6 | orchestrating agent | applier | Apply cycle 2; rewrite the BRs; tests; records | the adopted findings | story files, contracts, tests, DEC-0828 to DEC-0833, OQ-0196 to OQ-0198 | PASS |
| 7 | orchestrating agent | applier | Apply the user's answers to OQ-0196 to OQ-0198 | the user's decisions of 2026-09-26 | BR-0181, BR-0188, BR-0194, US-0003-0010, AC-0003-0010-02, AC-0003-0012-04, EX-0003-0010-02, EX-0003-0012-04, DEC-0834 to DEC-0836 | PASS |

## Reviewer results

| Reviewer | Verdict | Evidence |
| -------- | ------- | -------- |
| completion-reviewer | PENDING | The user's review of this flow's pull request approves the changes (DEC-0833) |

## Open risks

- The contract's `--out` prose says a relative path resolves against the
  process working directory, while the product resolves it against the root.
  EX-0003-0005-04 asserts only that the printed path is absolute. No finding
  covered the prose, because it is not a BR.

## Final status

- Status: `PASS`
- Reason: both cycles are recorded, every adopted change is applied under
  DEC-0833, every added or changed example is annotated by a test that asserts
  it, and the per-flow gate reports no error.
