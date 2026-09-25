# 06 Test Cases

## TC-0011-0001: Full TDD Cycle Completion

- EX-Ref: EX-0011-0001
- AC-Refs: AC-0011-0001
- Verify that an unannotated EX gets a test and runs RED, GREEN and refactor with evidence, without ledger status.

## TC-0011-0002: Backward Transition Produces Error

- EX-Ref: EX-0011-0002
- AC-Refs: AC-0011-0002
- Verify that green -> red transition produces the expected error message.

## TC-0011-0003: QA Gatekeeper Authority

- EX-Ref: EX-0011-0017
- AC-Refs: AC-0011-0003
- Verify that only qa-gatekeeper confirms RED/GREEN observations.

## TC-0011-0004: Exception Missing DR-ID Error

- EX-Ref: EX-0011-0003
- AC-Refs: AC-0011-0004
- Verify that exception without DR-ID produces the expected error.

## TC-0011-0005: Parallel Dispatch Deny Conditions

- EX-Ref: EX-0011-0005
- AC-Refs: AC-0011-0005
- Verify that writing the same shared fixture/mock file, or mutating the same
  fixture instance, blocks parallel dispatch, while a read-only shared fixture
  module does not.

## TC-0011-0006: 10-Point Gate Enforcement

- EX-Ref: EX-0011-0018
- AC-Refs: AC-0011-0006
- Verify test-first, phase evidence, qa-gatekeeper confirmation, both reviewer PASS and checkpoint verification before completion.

## TC-0011-0007: Fresh Evidence Required

- EX-Ref: EX-0011-0004
- AC-Refs: AC-0011-0007
- Verify that stale and status-only evidence is rejected.

## TC-0011-0008: All Done Reports Nothing To Do

- EX-Ref: EX-0011-0019
- AC-Refs: AC-0011-0008
- Verify that a current scoped TDD validation with every EX annotated or excepted produces "nothing to do".

## TC-0011-0009: Minimal Code For The One Failing Test

- EX-Ref: EX-0011-0006
- AC-Refs: AC-0011-0011
- Verify that Phase Green asks for the minimum production code that makes the
  failing test pass, that it is written after the failure has been watched
  rather than before, and that it refuses a generalization no test yet asks
  for.

## TC-0011-0010: Reviewer Separation Before `done`

- EX-Ref: EX-0011-0007
- AC-Refs: AC-0011-0006
- Verify that the item is reviewed by `completion-reviewer` and
  `implementation-reviewer`, and that `done` is reachable only once every
  required reviewer has passed.

## TC-0011-0012: Design System Mirror Byte-Equivalence

- EX-Ref: EX-0011-0009
- AC-Refs: AC-0011-0010
- Verify `/qfai-implement` reads `design-system.yaml` token tables that are byte-equivalent to root `DESIGN.md` token tables after parse normalization, and surfaces drift through the design contract validators.

## TC-0011-0013: Gate Commands Come Only From tech.md

- EX-Ref: EX-0011-0010
- AC-Refs: AC-0011-0012
- Level: integration
- Verify that, on the story tree, `/qfai-implement` takes its Test, Lint, Typecheck and Build commands only from the Standard commands section of `<paths.contractsDir>/tech.md`, and that it does not invent a command the section does not list.

## TC-0011-0014: A DONE Test Exception Skips the Example, a WIP One Does Not

- EX-Ref: EX-0011-0011
- AC-Refs: AC-0011-0013
- Level: integration
- Verify that, on the story tree, an unannotated EX named by a `Test exception:` row of `decisions.md` is skipped by next-test selection while that row is DONE, and is selected like any other unannotated EX while the row is TODO or WIP.

## TC-0011-0015: The Next Test Is the Lowest Unannotated Example

- EX-Ref: EX-0011-0012
- AC-Refs: AC-0011-0001
- Level: integration
- Verify that, on the story tree, `/qfai-implement` selects the unannotated EX with the lowest ID, writes a test for it carrying `QFAI:EX-NNNN-NNNN-NN`, and writes no ledger status.

## TC-0011-0016: The Shipped Rule Restates Article V Without TC or a Ledger

- EX-Ref: EX-0011-0013
- AC-Refs: AC-0011-0014
- Level: integration
- Verify that § 2 of the shipped rule `minimal-implementation.md` restates the constitution's Article V chain for the story tree with no TC hop, and names no execution ledger among the obligations it keeps.

## TC-0011-0017: The Shipped Rule Defines an Observation as an Example Row

- EX-Ref: EX-0011-0014
- AC-Refs: AC-0011-0014
- Level: integration
- Verify that, for the story tree, the shipped rule `minimal-implementation.md` defines an observation as an EX row in a story's `03_Example.md` located through `paths.specsDir`, not as a test-case row in `06_Test-Cases.md`.

## TC-0011-0018: The Scoped Validate Gate Runs Per Business Flow

- EX-Ref: EX-0011-0015
- AC-Refs: AC-0011-0015
- Level: integration
- Verify that, for a project on the story tree, the `qfai-implement` skill runs `qfai validate --profile tdd --fail-on error --flow BF-NNNN` at its checkpoint verification and its completion gate, scoped to the flow the invocation owns, and names no `--spec` validation for that tree.

## TC-0011-0019: Missing, Stale or Wrong-profile Results Stop Selection

- EX-Ref: EX-0011-0016
- AC-Refs: AC-0011-0008
- Level: integration
- Verify separately that a missing `validate.flow-<ids>.json`, a `generatedAt` before the scoped validate run and a profile other than `tdd` each stop `/qfai-implement`, report the validate command, exit code and output, and do not report "nothing to do".

## TC-0011-0020: Current Prototype Handoff Consumption

- EX-Ref: EX-0011-0020
- AC-Refs: AC-0011-0016
- Level: integration
- Verify that `/qfai-implement` reads `finalArtifact` and `extractedDesignSystem` from a DCON-008 `prototype-handoff.yaml` that includes `imageSources[]`, without requiring an exactly-four-field schema or the retired `mustPreserve`, `mayAdapt` and `mustNotCopy` fields.
