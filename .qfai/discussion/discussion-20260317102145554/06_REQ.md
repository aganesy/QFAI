# 06 Functional Requirements

## Document Info

| Field | Value |
|---|---|
| Discussion | discussion-20260317102145554 |
| Subject | QFAI v1.6.0 -- Implementation phase redesign |
| Date | 2026-03-17 |

## Requirements

### REQ-0001 Single implementation entry point

- **Description:** `/qfai-implement` shall be the sole user-facing skill for unit/component implementation. Old skills (`qfai-tdd-red`, `qfai-tdd-green`, `qfai-tdd-refactor`) shall be removed.
- **Source:** SRC-0001 §1-3
- **Priority:** Must

### REQ-0002 Strict TDD micro-cycle

- **Description:** `qfai-implement` shall enforce Red->Green->Refactor cycle for one test at a time. Production code shall not be written before a failing test is observed.
- **Source:** SRC-0001 §4.2
- **Priority:** Must

### REQ-0003 test-list.md introduction

- **Description:** Each spec shall have `spec-XXXX/tdd/test-list.md` as execution ledger tracking TDD items with columns: TDD-ID, TC-Refs, AC-Refs, BR-Refs, Layer, SUT, Test file, Selector, Status, DR-ID, Evidence, Notes.
- **Source:** SRC-0001 §5
- **Priority:** Must

### REQ-0004 Phase 1 validator

- **Description:** Validator shall check: test-list.md existence, markdown table existence, required columns (TDD-ID, TC-Refs, Layer, Test file, Selector, Status), valid status enum, TC reference existence.
- **Source:** SRC-0001 §6
- **Priority:** Must

### REQ-0005 Error codes

- **Description:** Validator shall emit error codes: TDDLIST_MISSING, TDDLIST_TABLE_MISSING, TDDLIST_REQUIRED_COLUMN_MISSING, TDDLIST_INVALID_STATUS, TDDLIST_UNKNOWN_REF.
- **Source:** SRC-0001 §6.2
- **Priority:** Must

### REQ-0006 Skill body keywords

- **Description:** `qfai-implement/SKILL.md` shall contain: "one test at a time", "failing test", "watch it fail", "watch it pass", "test-list.md". Shall NOT contain: "qfai-tdd-red", "qfai-tdd-green", "qfai-tdd-refactor", "write all tests first", "implement later".
- **Source:** SRC-0001 §4.3
- **Priority:** Must

### REQ-0007 Wrapper synchronization

- **Description:** All wrapper layers (.agents, .claude, .codex) shall reference qfai-implement and shall not reference abolished skills.
- **Source:** SRC-0001 §9.4
- **Priority:** Must

### REQ-0008 Orphan reference elimination

- **Description:** No reference to old skill names shall remain in any canonical asset, wrapper, README, test, or documentation file.
- **Source:** SRC-0001 §10.8
- **Priority:** Must

### REQ-0009 Init template for test-list.md

- **Description:** `qfai init` shall generate `spec-XXXX/tdd/test-list.md` from template with correct structure.
- **Source:** SRC-0001 §9.2
- **Priority:** Must

### REQ-0010 Workflow documentation update

- **Description:** `workflow.md`, `.qfai/README.md`, and `qfai-atdd` handoff shall reference `qfai-implement` instead of old skills.
- **Source:** SRC-0001 §9.1
- **Priority:** Must

### REQ-0011 spec_required_files.json update

- **Description:** `spec_required_files.json` shall include `tdd/test-list.md` as required spec file.
- **Source:** SRC-0001 §9.1
- **Priority:** Must

### REQ-0012 Sub-agent role documentation

- **Description:** `qfai-implement` skill body shall describe internal role separation: cycle manager, implementor, red/green auditor, spec alignment checker, code quality reviewer. No formal roster registration required.
- **Source:** SRC-0001 §7
- **Priority:** Should

### REQ-0013 Parallelization policy documentation

- **Description:** `qfai-implement` skill body shall document: serial by default, parallel only for independent slices (different SUT, different test file, no shared state).
- **Source:** SRC-0001 §8
- **Priority:** Should
