# 04 Business Rules

## BR-0011-0001: Serial-by-Default Processing

- AC-Refs: AC-0011-0001, AC-0011-0005

- Items are processed one test at a time in `test-list.md` order by default.
- Parallel processing requires explicit user approval and delivery-planner authorization.
- On the story tree, the items are the EXs in scope that no test annotates, taken one at a time in ascending EX ID order. No ledger file records them or their order.

## BR-0011-0002: Forward-Only Lifecycle

- AC-Refs: AC-0011-0002

- Valid transitions: `todo` -> `red` -> `green` -> `refactor` -> `done`.
- Any active status -> `exception` is allowed.
- Backward transitions are prohibited.

## BR-0011-0003: Test-First Enforcement

- AC-Refs: AC-0011-0001

- A failing test MUST be written before any production code.
- Production code written before a failing test exists is rejected.

## BR-0011-0015: Independent RED and GREEN Confirmation

- AC-Refs: AC-0011-0003
- Only qa-gatekeeper confirms RED and GREEN observations; the implementation worker cannot self-certify.

## BR-0011-0004: Minimal Code Principle

- AC-Refs: AC-0011-0011

- Write the minimum production code to make the failing test pass.
- Speculative generalization is prohibited.

## BR-0011-0005: Evidence Hard Rules

- AC-Refs: AC-0011-0007

- Status-only evidence is invalid and MUST be rejected.
- Both command and result are required for RED and GREEN phases.
- Stale evidence from previous runs MUST NOT be reused.
- Empty evidence entries are rejected.

## BR-0011-0006: Reviewer Separation

- AC-Refs: AC-0011-0006

- Implementation workers cannot serve as their own reviewers.
- Both completion-reviewer and implementation-reviewer must return PASS before `done`.

## BR-0011-0008: Design System Input Determinism

- AC-Refs: AC-0011-0010

- `design-system.yaml` is the deterministic mirror of root `DESIGN.md` token tables (color / typography / radius / shadow).
- `/qfai-implement` MUST treat it as input only — it does not regenerate token tables from per-iter HTML.

## BR-0011-0009: Contracts and Gate Commands Come From the Contract Directory

- AC-Refs: AC-0011-0010, AC-0011-0012

- `/qfai-implement` reads contracts from `<paths.contractsDir>`, the key every reader of the contract directory goes through (`.qfai/contracts/cli/qfai-init.md#configuration`).
- On the story tree, the Test, Lint, Typecheck and Build commands MUST come from the Standard commands section of `<paths.contractsDir>/tech.md`, which is their only home (`.qfai/contracts/cli/qfai-init.md#the-spec-tree`). A command found in no such section is not invented.

## BR-0011-0010: A Test Exception in Force Skips an Example

- AC-Refs: AC-0011-0008, AC-0011-0013

- On the story tree, an EX named by a `decisions.md` row whose Content opens `Test exception:` is exempt from next-test selection only while that row's Status is DONE (`.qfai/contracts/cli/qfai-validate.md#rows-a-validator-reads`).
- The exception reaches only the EX IDs the row names. An ID the tree does not define exempts nothing.

## BR-0011-0011: Shipped Rule Restates the Chain Without TC or a Ledger

- AC-Refs: AC-0011-0014

- On the story tree, § 2 of the shipped rule `minimal-implementation.md` MUST restate the traceability chain of the constitution's Article V rather than spell a chain of its own, with no TC hop and no execution ledger among the obligations it keeps.

## BR-0011-0012: An Observation Is an Example Row

- AC-Refs: AC-0011-0014

- On the story tree, the shipped rule `minimal-implementation.md` MUST define an observation as an EX row in a story's `03_Example.md`, located by resolving `paths.specsDir` from `qfai.config.yaml`, in place of a test-case row in `<paths.specsDir>/spec-*/06_Test-Cases.md`.

## BR-0011-0013: Scoped Validate Gate Per Business Flow

- AC-Refs: AC-0011-0015

- On the story tree, the scoped validate run of `/qfai-implement` at a checkpoint and at completion MUST be `qfai validate --profile tdd --fail-on error --flow BF-NNNN`, scoped to the flow the invocation owns (`.qfai/contracts/cli/qfai-validate.md#story-tree-layout`).
- `--spec` exits 2 on the story tree, so the skill MUST NOT use it there.

## BR-0011-0014: Next-test Findings Require a Fresh TDD Result

- AC-Refs: AC-0011-0008

- The skill MUST read `validate.flow-<ids>.json` only if it exists, its
  `generatedAt` is no earlier than the validate run and its `profile` is `tdd`.
- Otherwise it MUST stop, report the validate command, exit code and output,
  and MUST NOT report "nothing to do".

## BR-0011-0016: Consume the Producer-Owned Prototype Handoff

- AC-Refs: AC-0011-0016

- `/qfai-implement` MUST read `finalArtifact` and `extractedDesignSystem` from the current DCON-008 `prototype-handoff.yaml`.
- DCON-008 owns the handoff fields, including `imageSources[]`; BR-0012-0033 owns recording image-source provenance. Implementation MUST NOT impose the retired exactly-four-field set or require `mustPreserve`, `mayAdapt` or `mustNotCopy`.
