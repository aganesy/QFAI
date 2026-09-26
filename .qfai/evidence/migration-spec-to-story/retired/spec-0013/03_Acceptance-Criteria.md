# 03 Acceptance Criteria

## AC-0013-0003: Usable-Source Preflight Stop

```gherkin
Scenario: No usable source stops SDD
  Given no discussion pack, import-lite input, or explicit user requirement is usable
  When SDD starts
  Then it stops and guides the operator to /qfai-discussion

Scenario: An incomplete discussion pack remains provenance
  Given a discussion pack exists but is incomplete, contradictory, or carries a blocking open question
  When SDD starts
  Then it continues using that pack as non-normative reference material
  And it records the discrepancy in SDD-owned decisions, questions, or evidence
  And it does not edit the discussion pack to clear the discrepancy
```

## AC-0013-0007: Validate Gate error=0

```gherkin
Scenario: Validate Gate error=0
  Given SDD completion
  When `qfai validate --fail-on error` runs
  Then error count is 0.
```

## AC-0013-0008: Missing Markdown Blocks Preflight

```gherkin
Scenario: Missing Markdown Blocks Preflight
  Given a discussion-pack with missing required markdown files
  When SDD preflight runs
  Then SDD is blocked with the missing markdown listed in blockers.
```

## AC-0013-0009: Optional Side Artifact Does Not Block Preflight

```gherkin
Scenario: Optional Side Artifact Does Not Block Preflight
  Given a discussion-pack whose required markdown is complete but optional side artifacts are absent or malformed
  When SDD preflight runs
  Then side artifact state alone does not block SDD.
```

## AC-0013-0014: Validate Pipeline Validator Registration Integrity

```gherkin
Scenario: Validate Pipeline Validator Registration Integrity
  Given a traceability validator declared in `packages/qfai/src/core/validators/`
  When the validate pipeline (`packages/qfai/src/core/validate.ts`) is loaded
  Then the validator's registration MUST hold end-to-end as a single registration-integrity outcome. Partial wiring (one half present, the other missing) is treated as a single failure mode at AC granularity, not as 2 independent facets — internal decomposition of the registration contract (export presence under canonical name, import + invocation in `validate.ts`) is intentionally kept at the lower (rule) layer rather than at AC layer, so the AC stays outside the compound-AC facet-level gap class.
```

## AC-0013-0015: SDD Phase 0 DESIGN.md sha256 Lock

```gherkin
Scenario: SDD Phase 0 DESIGN.md sha256 Lock
  Given root `DESIGN.md` exists at `/qfai-sdd` Phase 0 entry in the spec-pack layout, or at the 03-contract step on the story tree,
  When Phase 0 completes in the spec-pack layout, or the 03-contract step completes on the story tree,
  Then `<paths.contractsDir>/design/DESIGN.md.lock.yaml` exists with `sha256: <hex>` matching `sha256(DESIGN.md bytes)` and a `lockedAt` ISO 8601 timestamp.
  And Missing root `DESIGN.md` halts Phase 0 and surfaces as an error-severity finding in the design contract validator family owned by spec-0004. On the story tree it halts the 03-contract step with the same finding.
```

## AC-0013-0016: Legacy Design Contracts Removed

```gherkin
Scenario: Legacy Design Contracts Removed
  Given a fresh `/qfai-sdd` run,
  When `_policies/05_Contracts.md` Active Contract Sets / Design Contracts is read,
  Then `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, `reference-pool.yaml`, and `brand-design.yaml` are NOT present in the active rows. History-only annotations remain permitted in `09_delta.md`.
```

## AC-0013-0017: Active Design Contract Index = {design-system, prototype-handoff, DESIGN.md, DESIGN.md.lock.yaml, mirror validator}

```gherkin
Scenario: Active Design Contract Index = {design-system, prototype-handoff, DESIGN.md, DESIGN.md.lock.yaml, mirror validator}
  Given the post-decomposition contract index,
  When the active design-contract entries are listed,
  Then the set is exactly `{design-system.yaml, prototype-handoff.yaml, DESIGN.md, DESIGN.md.lock.yaml, design-system mirror validator}`.
```

## AC-0013-0018: UI contract template carries `primary_tasks: []` slot

- US-Refs: US-0013-0011

```gherkin
Scenario: UI contract template carries `primary_tasks: []` slot
  Given the shipped UI contract template `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml`,
  When the template is read at `qfai init` time or by `/qfai-sdd` during contract authoring,
  Then every entry in `screens[]` carries a `primary_tasks: []` slot AND the requirements-analyst agent guide (under `.qfai/assistant/agents/requirements-analyst.md` or equivalent) instructs authoring ≥ 1 primary_task per screen.
```

## AC-0013-0019: validate lane blocks `/qfai-prototyping` when `primary_tasks` empty

- US-Refs: US-0013-0011

```gherkin
Scenario: validate lane blocks `/qfai-prototyping` when `primary_tasks` empty
  Given a newly authored `.qfai/contracts/ui/<screen>.yaml` whose `screens[].primary_tasks` is empty (`[]`) on any entry,
  When the new validate lane (QFAI-AUD-001 aligned) runs as part of `qfai validate --fail-on error`,
  Then the lane FAILS at severity error naming the offending screen ID and the empty-`primary_tasks` violation, AND `/qfai-prototyping` MUST NOT proceed past its preflight gate until each `screens[]` entry has ≥ 1 primary_task; non-empty `primary_tasks` passes the lane silently.
```

## AC-0013-0020: Active discussion pack resolved via single helper over `state.json`

- US-Refs: US-0013-0012

```gherkin
Scenario: Active discussion pack resolved via single helper over `state.json`
  Given downstream `/qfai-sdd` skills need the active discussion pack,
  When the pack is resolved,
  Then it is read through one helper from `.qfai/state.json#discussion.currentId` (the SSOT written by `/qfai-discussion`, spec-0010) and is NOT inferred from filesystem mtime.
```

## AC-0013-0021: Ambiguous active pointer surfaces recovery guidance

- US-Refs: US-0013-0012

```gherkin
Scenario: Ambiguous active pointer surfaces recovery guidance
  Given `.qfai/state.json#discussion.currentId` is absent OR resolves to a missing/duplicate pack,
  When the helper resolves the active pack,
  Then it raises an error naming the candidate `discussion-*` dirs and the recovery command (`qfai discussion use <id>`).
```

## AC-0013-0024: `primary_tasks` count band documented and named in warning

- US-Refs: US-0013-0014

```gherkin
Scenario: `primary_tasks` count band documented and named in warning
  Given the `ui-spec.yaml` template comments and `references/ui-contract-guide.md`,
  When they are read,
  Then the recommended `primary_tasks` count band 3..7 (DR-0267) is documented, and the `QFAI-AUD-020` warning text names the band; below 3 or above 7 emits the warning.
```

## AC-0013-0025: `primary_tasks` accepts string-only and structured shapes

- US-Refs: US-0013-0014

```gherkin
Scenario: `primary_tasks` accepts string-only and structured shapes
  Given a UI contract whose `primary_tasks` entries are string-only (legacy) OR structured `{id, label, acceptance}` (all-required, closed schema per DR-0268),
  When `auditProfile.ts` evaluates them during the deprecation window,
  Then both shapes are accepted (string-only continues to PASS); a structured item missing any of `id` / `label` / `acceptance`, or carrying extra keys, is rejected.
```

## AC-0013-0028: Concrete-First Order On The Story Tree

- US-Refs: US-0013-0001

```gherkin
Scenario: Concrete-First Order On The Story Tree
  Given a project whose specification is the story tree,
  When `/qfai-sdd` writes the specification,
  Then it writes `01_policy/`, then `02_business-flow/`, then the stories with their US, AC and EX, and then `03_contract/` with its BRs. No Contracts-first phase runs, and no BR cites an EX that is not yet written.
```

## AC-0013-0029: Story-Tree Files Follow Their Templates

- US-Refs: US-0013-0001

```gherkin
Scenario: Story-Tree Files Follow Their Templates
  Given the story tree,
  When `/qfai-sdd` writes a file of the tree,
  Then the file follows its paired `qfai-sdd` template, a story directory holds exactly `01_User-story.md`, `02_Acceptance-Criteria.md` and `03_Example.md` and no subdirectory, each `business-flow.md` carries a Mermaid `flowchart` or `sequenceDiagram`, and every contract file under `<paths.contractsDir>` has a row in `contracts.md`.
```

## AC-0013-0030: Records Go To The Two Tables

- US-Refs: US-0013-0001

```gherkin
Scenario: Records Go To The Two Tables
  Given the story tree,
  When `/qfai-sdd` records a triage decision, a change request, a retired story, a rejected option or an open question,
  Then each of the first four is a row of `decisions.md` and the open question is a row of `open-questions.md`. Every row carries exactly the cells ID, Content, Approach and Status, with a Status from its table's vocabulary. Nothing is written under `.qfai/decisions/`, no `01_Spec-retired` file is written, and a row already in a table changes only its Status.
```

## AC-0013-0031: The Five Merged Files State Each Fact Once

- US-Refs: US-0013-0001

```gherkin
Scenario: The Five Merged Files State Each Fact Once
  Given the story tree,
  When `/qfai-sdd` writes `objective.md`, `initiative.md` or `principle.md` under `<paths.specsDir>/01_policy/`, or `tech.md` or `structure.md` under `<paths.contractsDir>`,
  Then each fact is stated in one of the five files only, and the quality-gate commands appear only in the Standard commands section of `tech.md`.
```

## AC-0013-0032: IDs Are The Highest In Their Scope Plus One

- US-Refs: US-0013-0001

```gherkin
Scenario: IDs Are The Highest In Their Scope Plus One
  Given the story tree,
  When `/qfai-sdd` allocates a BF, US, AC, EX, BR, DEC or OQ ID,
  Then the ID is the highest number its scope already names plus one. An empty scope starts at `0001`, or at `01` for the AC and EX tail. An ID whose item was retired is never reissued, and a new flow or story directory is named after its ID.
```

## AC-0013-0033: Business Rules Are Written Inside Contracts

- US-Refs: US-0013-0001

```gherkin
Scenario: Business Rules Are Written Inside Contracts
  Given the story tree,
  When `/qfai-sdd` writes a business rule at the 03-contract step,
  Then the rule sits inside the contract file that enforces it, in that file type's form, with an ID, a statement and at least one EX. No separate rules file is written, and a rule that several contracts rely on is defined once and referenced by ID from the others.
```

## AC-0013-0034: Story-Tree Required Edges

- US-Refs: US-0013-0005

```gherkin
Scenario: Story-Tree Required Edges
  Given the story tree,
  When `/qfai-sdd` gates it with `qfai validate --profile sdd --fail-on error`,
  Then every EX names exactly one AC in its `AC-Ref` cell, every AC has at least one EX, every BR cites at least one EX, and every EX is cited by at least one BR. A missing or broken edge fails the gate, naming the ID and its file.
```

## AC-0013-0035: qfai-sdd Cites Assistant Documents Where They Live

- US-Refs: US-0013-0001

```gherkin
Scenario: qfai-sdd Cites Assistant Documents Where They Live
  Given the `rule/ skill/ agent/ prompt/` assistant tree,
  When the `qfai-sdd` skill cites the change-classification or the requirements-decomposition document,
  Then it cites `.qfai/assistant/rule/change-classification.md` and `<paths.skillsDir>/qfai-sdd/references/requirements-decomposition.md`, and each citation resolves to a file that exists.
```

## AC-0013-0036: Scoped Completion Gate Per Business Flow

- US-Refs: US-0013-0006

```gherkin
Scenario: Scoped Completion Gate Per Business Flow
  Given the story tree,
  When `/qfai-sdd` gates the business flows it wrote or changed before completion,
  Then it runs `qfai validate --profile sdd --fail-on error --flow BF-NNNN` for each of those flows, so that a parallel worker gates only on its own flow, and it does not pass `--spec <spec-id>`.
```
