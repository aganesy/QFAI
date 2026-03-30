# 06 REQ (Functional Requirements)

## Requirements Table

| REQ-ID   | Title                                        | Source            | Priority | Status |
| -------- | -------------------------------------------- | ----------------- | -------- | ------ |
| REQ-0001 | Remove 4-axis completion conditions           | SRC-0007          | must     | draft  |
| REQ-0002 | Add 3-layer completion conditions (UI)        | SRC-0001,SRC-0007 | must     | draft  |
| REQ-0003 | Maintain non-ui path exemption                | SRC-0007          | must     | draft  |
| REQ-0004 | Add canonical template files                  | SRC-0001,SRC-0007 | must     | draft  |
| REQ-0005 | Update 00_index.md references                 | SRC-0007          | must     | draft  |
| REQ-0006 | Deprecate old 4-axis family files             | SRC-0007          | must     | draft  |
| REQ-0007 | Complete Trend Scan schema                    | SRC-0004,SRC-0007 | must     | draft  |
| REQ-0008 | Strong YAML schema for strategy               | SRC-0004,SRC-0007 | must     | draft  |
| REQ-0009 | Strong YAML schema for contracts              | SRC-0004,SRC-0007 | must     | draft  |
| REQ-0010 | Create canonical validator entrypoint          | SRC-0007,SRC-0008 | must     | draft  |
| REQ-0011 | Wire entrypoint into validateProject()         | SRC-0007,SRC-0008 | must     | draft  |
| REQ-0012 | Demote old validator aggregator                | SRC-0006,SRC-0007 | must     | draft  |
| REQ-0013 | Remove "requested" render status               | SRC-0006,SRC-0007 | must     | draft  |
| REQ-0014 | Implement real render status model              | SRC-0007          | must     | draft  |
| REQ-0015 | Require actual capture for captured status      | SRC-0006,SRC-0007 | must     | draft  |
| REQ-0016 | Wire phase runners into runBrowserQa()          | SRC-0006,SRC-0007 | must     | draft  |
| REQ-0017 | Enforce honest empty findings                   | SRC-0006,SRC-0007 | must     | draft  |
| REQ-0018 | Remove foundation-only comments                 | SRC-0006,SRC-0007 | should   | draft  |
| REQ-0019 | Align prototyping wording                       | SRC-0005,SRC-0007 | should   | draft  |
| REQ-0020 | Consistent routing conditions                   | SRC-0007,SRC-0009 | should   | draft  |
| REQ-0021 | Normalize maturity claims                       | SRC-0003,SRC-0007 | should   | draft  |
| REQ-0022 | Update test fixtures to 3-layer                 | SRC-0007,SRC-0008 | must     | draft  |
| REQ-0023 | Add validateProject() integration tests         | SRC-0007,SRC-0008 | must     | draft  |

---

## Workstream A: Discussion Canonical

### REQ-0001: Remove 4-axis completion conditions from qfai-discussion SKILL.md

- **Description**: Remove the legacy 4-axis (Strategy, Interaction, Visual, Content) completion condition block from the qfai-discussion skill definition. The 4-axis model is superseded by the canonical 3-layer architecture.
- **Source**: SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. SKILL.md no longer contains any reference to 4-axis completion conditions.
  2. No regression in non-ui discussion flow.

### REQ-0002: Add canonical 3-layer completion conditions for UI-bearing path

- **Description**: Add completion conditions that teach and enforce the canonical 3-layer architecture (Structure Layer, Behavior Layer, Presentation Layer) for UI-bearing discussion packs.
- **Source**: SRC-0001, SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. SKILL.md contains 3-layer completion conditions referencing Structure, Behavior, and Presentation layers.
  2. Completion conditions are gated on UI-bearing surface type.
  3. Each layer's conditions are verifiable by the validator.

### REQ-0003: Maintain non-ui path exemption from UI-bearing conditions

- **Description**: Ensure that non-ui surface type discussion packs are exempt from UI-bearing completion conditions (3-layer checks, trend scan, competitive registry).
- **Source**: SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. Non-ui packs skip all UI-bearing completion gates.
  2. Non-ui packs still enforce common completion conditions (sources, scope, REQ).

---

## Workstream B: Template Replacement

### REQ-0004: Add 6 new canonical template files to templates/uiux/

- **Description**: Create the 6 canonical template files for the 3-layer UI/UX family. These templates replace the old 4-axis family and provide the standard structure for UI-bearing discussion packs.
- **Source**: SRC-0001, SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. Six new template files exist in templates/uiux/.
  2. Templates align with the 3-layer architecture (Structure, Behavior, Presentation).
  3. Templates are syntactically valid markdown with proper YAML frontmatter where applicable.

### REQ-0005: Update 00_index.md to reference canonical family

- **Description**: Update 00_index.md to list and reference all 6 canonical template files, replacing references to the old 4-axis family.
- **Source**: SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. 00_index.md references all 6 canonical template files.
  2. No dangling references to removed files.

### REQ-0006: Deprecate old 4-axis family files with explicit marking

- **Description**: Mark old 4-axis family template files as deprecated with explicit deprecation notices. Do not delete them in this release to maintain backward compatibility.
- **Source**: SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. Each deprecated file contains a clear deprecation notice at the top.
  2. Deprecation notice points to the canonical replacement.
  3. Deprecated files are not referenced from 00_index.md as active templates.

---

## Workstream C: Sources Schema

### REQ-0007: Complete 04_Sources.md Trend Scan schema with freshness/confidence/translation fields

- **Description**: Extend the 04_Sources.md template to include Trend Scan schema fields: freshness (retrieval date / staleness indicator), confidence (source reliability score), and translation (how external findings are adapted for this project).
- **Source**: SRC-0004, SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. 04_Sources.md template includes freshness, confidence, and translation fields for trend sources.
  2. Field definitions are documented with expected value ranges.
  3. Validator can check for presence of these fields in UI-bearing packs.

---

## Workstream D: Strategy Strong Schema

### REQ-0008: Implement strong YAML schema for 10_strategy.md with decision/options/rationale

- **Description**: Define and implement a strong YAML schema for 10_strategy.md that requires structured decision records with: decision statement, evaluated options (with pros/cons), selected option, and rationale.
- **Source**: SRC-0004, SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. 10_strategy.md template enforces YAML frontmatter or code blocks with decision/options/rationale structure.
  2. Validator rejects strategy files missing required schema fields.
  3. Schema is documented in the template file itself.

---

## Workstream E: Contracts Strong Schema

### REQ-0009: Implement strong YAML schema for 40_contracts.md with per-screen objects

- **Description**: Define and implement a strong YAML schema for 40_contracts.md that requires per-screen contract objects with: screen ID, inputs, outputs, state transitions, and validation rules.
- **Source**: SRC-0004, SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. 40_contracts.md template enforces YAML schema with per-screen contract objects.
  2. Each screen object includes: screen_id, inputs, outputs, state_transitions, validation_rules.
  3. Validator rejects contracts files missing required per-screen fields.

---

## Workstream F: Validator Truth-Path

### REQ-0010: Create runCanonicalUixValidators() entrypoint

- **Description**: Create a new canonical entrypoint function runCanonicalUixValidators() that orchestrates all UI/UX validation in the correct order, replacing the ad-hoc aggregation in the old path.
- **Source**: SRC-0007, SRC-0008
- **Priority**: must
- **Acceptance Criteria**:
  1. runCanonicalUixValidators() exists as an exported function.
  2. It invokes all required UI/UX validators in dependency order.
  3. It returns a structured validation result.

### REQ-0011: Wire canonical entrypoint into validateProject()

- **Description**: Update validateProject() to call runCanonicalUixValidators() as the sole UI/UX validation path for UI-bearing packs.
- **Source**: SRC-0007, SRC-0008
- **Priority**: must
- **Acceptance Criteria**:
  1. validateProject() delegates UI/UX validation to runCanonicalUixValidators().
  2. No direct calls to individual UI/UX validators remain in validateProject().
  3. Non-ui packs skip UI/UX validation entirely.

### REQ-0012: Demote or remove old runAllUixValidators() aggregator

- **Description**: Demote runAllUixValidators() to a deprecated internal function or remove it entirely. It must not be callable from the main validation path.
- **Source**: SRC-0006, SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. runAllUixValidators() is no longer called from validateProject().
  2. If retained, it is marked as deprecated with a doc comment.
  3. No test relies on runAllUixValidators() as the primary validation path.

---

## Workstream G: Render Evidence

### REQ-0013: Remove "requested" status from render evidence path

- **Description**: Eliminate the "requested" status from the render evidence state machine. This status allowed evidence to be marked as done without actual execution.
- **Source**: SRC-0006, SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. No code path produces or accepts "requested" as a render evidence status.
  2. Type definitions do not include "requested" in the status union.

### REQ-0014: Implement captured/skipped/failed real status model

- **Description**: Replace the render evidence status model with three honest states: captured (evidence actually captured), skipped (explicitly skipped with reason), and failed (capture attempted but failed).
- **Source**: SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. Status union type is exactly: "captured" | "skipped" | "failed".
  2. Each status requires associated metadata (timestamp, reason for skip, error for failure).
  3. All render evidence producers use the new status model.

### REQ-0015: Require actual capture for captured status

- **Description**: Ensure that the "captured" status can only be set when an actual capture operation has been executed and produced an artifact (screenshot, recording, etc.).
- **Source**: SRC-0006, SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. Setting "captured" status requires a non-empty artifact reference.
  2. Attempting to set "captured" without an artifact throws a validation error.
  3. Unit test verifies the guard condition.

---

## Workstream H: Browser QA

### REQ-0016: Wire actual phase runners into runBrowserQa()

- **Description**: Replace placeholder or stub phase runners in runBrowserQa() with actual implementations that perform real browser-based checks.
- **Source**: SRC-0006, SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. runBrowserQa() invokes real phase runner implementations.
  2. Phase runners return structured finding objects.
  3. No stub or placeholder runners remain in the execution path.

### REQ-0017: Enforce honest empty findings

- **Description**: Ensure that runBrowserQa() reports empty findings only when the QA phases have actually executed and found nothing. Prevent false-clean reports.
- **Source**: SRC-0006, SRC-0007
- **Priority**: must
- **Acceptance Criteria**:
  1. Empty findings array is only returned after all phases have executed.
  2. If any phase is skipped or fails, the result reflects that status.
  3. A "no findings" result includes execution metadata proving phases ran.

### REQ-0018: Remove foundation-only comments

- **Description**: Remove comments that indicate code is "foundation-only" or "to be implemented later". All code in the QA path must be functional.
- **Source**: SRC-0006, SRC-0007
- **Priority**: should
- **Acceptance Criteria**:
  1. No TODO/FIXME/foundation-only comments remain in browser QA modules.
  2. Code review confirms all functions have real implementations.

---

## Workstream I: Prototyping Contracts

### REQ-0019: Align prototyping/full-harness wording with actual behavior

- **Description**: Review and correct all documentation, skill definitions, and code comments that describe prototyping vs. full-harness behavior. Wording must match what the code actually does.
- **Source**: SRC-0005, SRC-0007
- **Priority**: should
- **Acceptance Criteria**:
  1. Skill definitions accurately describe prototyping scope and full-harness scope.
  2. No misleading claims about capabilities that are not implemented.
  3. Steering documents reflect actual routing behavior.

### REQ-0020: Ensure standard to full-harness routing conditions are consistent

- **Description**: Verify and fix routing conditions that determine when a project uses standard prototyping vs. full-harness mode. Conditions must be consistent across skill definitions, validators, and runtime code.
- **Source**: SRC-0007, SRC-0009
- **Priority**: should
- **Acceptance Criteria**:
  1. Routing condition logic is defined in one canonical location.
  2. All consumers of routing conditions reference the canonical definition.
  3. No contradictory routing logic exists across different modules.

---

## Workstream J: Docs/Tests Normalization

### REQ-0021: Normalize maturity claims in steering/changelog/release notes

- **Description**: Ensure that maturity level claims (alpha, beta, stable, etc.) are consistent across steering documents, CHANGELOG.md, and release notes. Remove any conflicting or outdated maturity assertions.
- **Source**: SRC-0003, SRC-0007
- **Priority**: should
- **Acceptance Criteria**:
  1. All documents agree on the current maturity level.
  2. Historical maturity transitions are accurately recorded in changelog.
  3. No document claims a higher maturity than the project has achieved.

### REQ-0022: Update test fixtures to canonical 3-layer expectations

- **Description**: Update all test fixtures that reference the old 4-axis model to use canonical 3-layer expectations. Resolve the old/new test split.
- **Source**: SRC-0007, SRC-0008
- **Priority**: must
- **Acceptance Criteria**:
  1. No test fixture references the old 4-axis model as the expected structure.
  2. All UI/UX test fixtures validate against the 3-layer architecture.
  3. Test suite passes with zero skipped or xfail tests related to the model transition.

### REQ-0023: Add validateProject() integration tests for canonical path

- **Description**: Add integration tests that exercise validateProject() end-to-end through the canonical runCanonicalUixValidators() path, covering both UI-bearing and non-ui surface types.
- **Source**: SRC-0007, SRC-0008
- **Priority**: must
- **Acceptance Criteria**:
  1. Integration test for UI-bearing pack validates all 3-layer checks fire.
  2. Integration test for non-ui pack validates UI/UX checks are skipped.
  3. Integration test for malformed pack validates proper error reporting.

---

## Priority Legend

- `must`: Required for this release. Blocks release if not complete.
- `should`: Important but deferrable to a patch release.
- `could`: Nice-to-have.
- `wont`: Explicitly excluded from current scope.

## Rules

- Each REQ must have at least one Source (SRC-ID) reference.
- Status: `draft` -> `reviewed` -> `approved`.
