# 10 Plan

## Implementation approach

1. TDD micro-cycle engine: Red -> Green -> Refactor -> Done lifecycle
2. test-list.md parser: 8-column table with status tracking
3. Status transition validator: forward-only enforcement, exception with DR-ID
4. Sub-agent roster: 6 agents with handoff contracts
5. Completion gate: 10-point checklist enforcement
6. Evidence contract: per-item fresh evidence validation
7. Parallelization policy: independence check, worktree separation, integration verify

### Story-tree layout

Every row of this change lands at P7, the cutover step that also carries the
skill rewrites. The change is text: the `qfai-implement` skill under
`packages/qfai/assets/init/.qfai/assistant/skill/qfai-implement/` and the
shipped rule `packages/qfai/assets/init/root/.agents/rules/minimal-implementation.md`.
No source module changes. The work is done in this order:

1. **Next-test selection** in `SKILL.md`. The skill runs
   `qfai validate --profile tdd --flow BF-NNNN` and takes the test-obligation
   findings for EX IDs in `validate.flow-<ids>.json` as its candidates, lowest
   ID first. It reads that file only when it exists, its `generatedAt` is no
   earlier than this validate run, and its `profile` is `tdd`. If any check
   fails, the skill stops and reports the validate command, exit code and
   output. It never treats an absent or stale result as "nothing to do".
   Open EX obligations are errors, so the run that has candidates is the run
   that exits non-zero. That family already leaves out an EX some test annotates and an
   EX a `Test exception:` row at DONE exempts, and lists the exempted ones at
   info (`qfai-validate.md#rows-a-validator-reads`). So the skill states no
   second copy of the predicate (BR-0011-0001, BR-0011-0010, EX-0011-0011,
   EX-0011-0012). The test it writes carries `QFAI:EX-NNNN-NNNN-NN`, and no
   ledger status is written. With no candidate left, the skill reports
   "nothing to do" (AC-0011-0008).
2. **Gate commands.** `SKILL.md` and the references it links take the Test,
   Lint, Typecheck and Build commands from the Standard commands section of
   `<paths.contractsDir>/tech.md` and from no other file. A command the
   section does not list is not invented (BR-0011-0009, EX-0011-0010).
   Contracts, including `design/design-system.yaml`, are read under
   `<paths.contractsDir>` (AC-0011-0010).
3. **The scoped validate gate.** `SKILL.md`,
   `references/checkpoint-verification.md` and `references/final-checklist.md`
   replace `--spec <spec-id>` with `--flow BF-NNNN` for the flow the invocation
   owns (BR-0011-0013, EX-0011-0015).
4. **The REMOVE row.** The skill text describing the execution ledger, its
   lifecycle status and the exception-with-DR-ID items goes. The ledger gate
   itself leaves with spec-0004's REMOVE row. The ledger rows the REMOVE row
   retires are tombstoned in the same commit.
5. **The shipped rule.** § 2 of `minimal-implementation.md` restates the
   constitution's Article V chain instead of spelling its own, with no TC hop
   and no execution ledger (BR-0011-0011, EX-0011-0013). An observation becomes
   an EX row in a story's `03_Example.md`, found by resolving
   `paths.specsDir` (BR-0011-0012, EX-0011-0014). The master is linked into
   this repository at `.agents/rules/` and `.claude/rules/`, so the rewrite
   governs this repository's own agents as soon as it lands. It is committed
   after the P7 commit that migrates this repository, and with or after the
   Article V rewrite (spec-0001).

**Architectural elements.** This spec introduces none. It consumes `--flow`
and the test-obligation family, which land at P3 under spec-0004.

**Alternatives rejected.**

- Ledger-driven selection: retired by the user-approved REMOVE row.
- The skill restating the "unannotated and not exempted" predicate: the
  validator already computes it, and two statements of one predicate drift.
- A command that prints the next test: not asked for, and validate's findings
  already answer the question.

## Test approach

- Unit tests: status lifecycle transitions, evidence validation, backward transition rejection
- Integration tests: full TDD cycle from todo to done, exception handling, parallel dispatch rules
- E2E tests: end-to-end implement workflow with test-list.md processing

### Story-tree layout

Every new case is L3 (Integration) and reads a shipped artifact. No case lands
at L1, L2 or L4. The E2E story rows (TDD-0013 to TDD-0020) stay as they are.

| Case         | Reads                                                          | Asserts                                                                                                      |
| ------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| TC-0011-0013 | `SKILL.md` and the references it links                         | Commands come from `<paths.contractsDir>/tech.md` only; no `package.json` fallback                           |
| TC-0011-0014 | `SKILL.md`                                                     | A DONE exception skips its EX; a TODO or WIP one does not                                                    |
| TC-0011-0015 | `SKILL.md`                                                     | Lowest unannotated EX first, the written test carries `QFAI:EX-…`, no ledger status                          |
| TC-0011-0016 | `minimal-implementation.md` § 2                                | Article V restated, no TC hop, no execution ledger                                                           |
| TC-0011-0017 | `minimal-implementation.md` § 2                                | An observation is an EX row under `paths.specsDir`, not a row in `06_Test-Cases.md`                          |
| TC-0011-0018 | `SKILL.md`, `checkpoint-verification.md`, `final-checklist.md` | `--flow BF-NNNN` at each checkpoint and at completion; no `--spec` for the story tree                        |
| TC-0011-0019 | `SKILL.md` and a story-tree validate fixture                   | Missing, stale and wrong-profile results each stop selection with the validate command, exit code and output |

The finding set itself — which EX a DONE, WIP or TODO exception leaves in the
test-obligation family — is proven by spec-0004's cases for that family
(EX-0004-0077, EX-0004-0078). These cases prove the skill reads it.

Boundary cases that get their own case, not a shared one:

- an exception at DONE, and one at TODO or WIP
- an exception naming an EX the tree does not define, which exempts nothing
- every EX annotated or exempted, which ends in "nothing to do"
- a missing result, a result predating validate and a result with the wrong profile, each of which stops selection
- a `tech.md` with no Build command beside a `package.json` that has one

The tests that pin today's wording change in the same P7 commit as the text
they read: `tests/integration/agentsRulesSurface.test.ts` and
`tests/assets/prototypingScopeFloorHome.test.ts` for the rule,
`tests/assets/implementCheckpointVerification.test.ts` and
`tests/assets/perSpecGateScope.test.ts` for the gate, and
`tests/integration/implementSkillSpec0011.test.ts`.

## NFR approach

For a project on the story tree:

- **NFR-0001 serial execution.** One EX at a time, in ascending ID order.
  Skipping an exempted EX does not change the order of the rest. Breach
  measurement: TC-0011-0015 finds the skill taking more than one EX per cycle,
  or any order other than ascending ID.
- **NFR-0002 forward-only lifecycle.** On the story tree there is no ledger
  status to move backwards. The NFR is restated at landing as "no ledger
  status moves backwards". An EX leaves the candidate set once a test
  annotates it. Breach measurement: TC-0011-0015 finds a ledger status write
  for the story tree.
- **NFR-0003 to NFR-0005.** Unchanged. Fresh evidence, gatekeeper authority
  and reviewer independence do not depend on where the next test comes from.
  Breach measurement: the existing cases TC-0011-0007, TC-0011-0003 and
  TC-0011-0010 fail after the P7 rewrite.

## Dependencies

- Requires: spec artifacts from `/qfai-sdd` (test-list.md populated by SDD)
- Consumed by: `/qfai-verify` for validation gate

### Story-tree layout

- Requires, from P3: `--flow` and the test-obligation and exempted-item
  families (spec-0004), and the `decisions.md` row keywords they read.
- Requires, from P6: the `skill/` directory of the assistant tree.
- Requires, at P7: the Article V rewrite in `rule/constitution.md`
  (spec-0001), and `tech.md` under `<paths.contractsDir>` (spec-0001
  template, spec-0003 seed).

## Risk mitigation

- Complex agent orchestration may be difficult to test in isolation
- Mitigation: stop immediately on failed first delegation and return concrete remediation steps for unsupported or misconfigured subagent environments

### Story-tree layout

| Risk                                                                                                                              | Likelihood / impact | Mitigation                                                                                                                  | Trigger to act                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The rule is rewritten before this repository migrates, so it governs this repository's own work with a chain it does not have yet | med / high          | Commit the rule rewrite after the P7 commit that migrates this repository                                                   | The rule diff appears in a commit before this repository's migration commit                    |
| The rule restates Article V while `rule/constitution.md` still carries the TC hop                                                 | low / med           | Land the Article V rewrite (spec-0001) in the same commit or an earlier one                                                 | TC-0011-0016 passes while Article V in `rule/constitution.md` still names TC                   |
| The skill's selection disagrees with validate's exempted-item family                                                              | low / med           | The skill takes its candidates from validate's findings instead of restating the predicate                                  | An EX the skill selects is listed by validate as exempted                                      |
| A test pinning the old rule sentence or the `--spec` gate is left on the old wording                                              | high / low          | The pinned tests listed under Test approach change in the commit that changes the text                                      | `agentsRulesSurface.test.ts` or `prototypingScopeFloorHome.test.ts` fails on the rule commit   |
| The new `todo` integration cases and E2E rows raise `QFAI-ATDD-111` and `QFAI-ATDD-112` on this repository's dogfood lanes        | high / med          | No pin (user answer P3-C1). This change also runs `/qfai-atdd` and `/qfai-implement`, and their tests land before it merges | A dogfood lane reports either code for spec-0011 when the change is made ready to merge        |
| The ledger's `Owning module` cells name `skill/` paths, which exist only from P6                                                  | high / low          | Cells name the path the module has when the row's work lands. The P6 rename commit repoints the older `skills/` cells       | `grep -rn "assistant/skills/" .qfai/specs/*/tdd/test-list.md` is non-empty after the P6 commit |
