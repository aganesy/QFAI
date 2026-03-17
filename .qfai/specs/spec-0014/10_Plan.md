# 10 Implementation Plan — spec-0014 (Implementation Phase Unification)

> **How-only.** What and Why live in 01_Spec.md. This file is the single source of truth for implementation order, test strategy, and risk mitigation.

---

## 1. Implementation Strategy

All changes are delivered in a single PR (OC-10: 1 version = 1 PR). Steps are ordered by technical dependency; each step must be complete before the next begins unless explicitly noted as parallelizable.

### Step 1: Create `qfai-implement` skill body (SKILL.md)

**Path**: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md`

**Covers**: REQ-0001, REQ-0002, REQ-0006, REQ-0012, REQ-0013

**Details**:

- Author the SKILL.md with embedded TDD micro-cycle instructions (Red/Green/Refactor per item).
- Include all required keywords per BR-0014-0005: `"one test at a time"`, `"failing test"`, `"watch it fail"`, `"watch it pass"`, `"test-list.md"`.
- Exclude all prohibited keywords per BR-0014-0006: `"qfai-tdd-red"`, `"qfai-tdd-green"`, `"qfai-tdd-refactor"`, `"write all tests first"`, `"implement later"`.
- Document sub-agent role descriptions (REQ-0012, Should).
- Document parallelization policy: serial by default, parallel only for independent slices (BR-0014-0009, REQ-0013, Should).
- Define status transition enforcement logic: todo->red->green->refactor->done; any active->exception (BR-0014-0003, BR-0014-0004).
- Define `test-list.md` reading/updating protocol for the skill runtime.

**Depends on**: nothing (first step).

---

### Step 2: Create `test-list.md` template

**Path**: `packages/qfai/assets/init/.qfai/specs/spec-XXXX/tdd/test-list.md`

**Covers**: REQ-0003, REQ-0009

**Details**:

- Create directory `packages/qfai/assets/init/.qfai/specs/spec-XXXX/tdd/`.
- Create `test-list.md` with header row containing all 6 required columns (BR-0014-0001): `TDD-ID`, `TC-Refs`, `Layer`, `Test file`, `Selector`, `Status`.
- Include separator row and zero data rows (template only).
- Ensure `qfai init` picks up this template via the existing init asset copy mechanism.

**Depends on**: nothing (parallelizable with Step 1).

---

### Step 3: Implement Phase 1 validator

**Path**: `packages/qfai/src/core/validators/tddList.ts` (new file)

**Covers**: REQ-0004, REQ-0005

**Details**:

- Export `validateTddList(root: string, specDir: string): Promise<Issue[]>`.
- Implement 5 sequential checks per BR-0014-0008 (early exit on predecessor failure):
  1. **File existence** — check `{specDir}/tdd/test-list.md` exists. Error code: `TDDLIST_MISSING`.
  2. **Table existence** — parse Markdown, find pipe-delimited table. Error code: `TDDLIST_TABLE_MISSING`.
  3. **Required columns** — verify header row contains all 6 columns (BR-0014-0001). Error code: `TDDLIST_REQUIRED_COLUMN_MISSING` with missing column name in detail.
  4. **Status enum** — validate each data row's Status value against `{todo, red, green, refactor, done, exception}` (BR-0014-0002). Error code: `TDDLIST_INVALID_STATUS` with invalid value in detail.
  5. **TC reference existence** — cross-reference TC-Refs values against known TC IDs from `06_Test-Cases.md`. Error code: `TDDLIST_UNKNOWN_REF` with unknown TC ID in detail.
- Emit informational warning `"No active items"` for header-only tables (EX-0014-0014).
- Guarantee idempotency: read-only, no file mutations (TC-0014-0020).
- Performance: complete within 5 seconds per spec (NFR-0001).
- Register in `packages/qfai/src/core/validators/index.ts`.
- Wire into `packages/qfai/src/core/validate.ts` (`validateProject()`).

**Depends on**: nothing (parallelizable with Steps 1-2).

---

### Step 4: Update `spec_required_files.json`

**Path**: `.qfai/assistant/manifest/spec_required_files.json` (or location resolved via `specLayout.ts`)

**Covers**: REQ-0011

**Details**:

- Add `"tdd/test-list.md"` to the required files manifest.
- Ensure the existing `specLayout.ts` file-existence checks pick up the new entry.
- Confirm that `qfai validate` reports missing `tdd/test-list.md` for specs that lack it.

**Depends on**: Step 2 (template must exist before mandating the file).

---

### Step 5: Remove old skill bodies

**Paths to delete**:

- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-tdd-red/SKILL.md`
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-tdd-green/SKILL.md`
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-tdd-refactor/SKILL.md`
- `.qfai/assistant/skills/qfai-tdd-red/SKILL.md`
- `.qfai/assistant/skills/qfai-tdd-green/SKILL.md`
- `.qfai/assistant/skills/qfai-tdd-refactor/SKILL.md`

**Covers**: REQ-0001, REQ-0008

**Details**:

- Delete all 6 files (3 asset templates + 3 local skill bodies).
- Remove parent directories if empty after deletion.
- Remove any skill registry entries for the 3 old skills.

**Depends on**: Step 1 (replacement skill must exist before removing old ones).

---

### Step 6: Update all wrappers (.agents, .claude, .codex)

**Covers**: REQ-0007, REQ-0008

**Details**:

- **Add** `qfai-implement` entry to each wrapper layer:
  - `.agents/` wrapper configuration
  - `.claude/commands/` wrapper configuration
  - `.codex/` wrapper configuration
  - Corresponding asset templates under `packages/qfai/assets/init/`
- **Remove** old entries from each wrapper layer:
  - `qfai-tdd-red`, `qfai-tdd-green`, `qfai-tdd-refactor`
- Ensure atomic update per BR-0014-0010: all 3 layers updated in the same commit.
- Handle missing wrapper directories: create with correct content (AC-0014-0018, EX-0014-0018).

**Depends on**: Step 5 (old skill bodies removed; new skill body available).

---

### Step 7: Update workflow documentation and qfai-atdd handoff

**Covers**: REQ-0010

**Details**:

- Update `packages/qfai/assets/init/.qfai/assistant/instructions/workflow.md`: replace references to the 3 old skills with `qfai-implement`.
- Update `.qfai/assistant/instructions/workflow.md` (local instance): same changes.
- Update `.qfai/README.md` and `packages/qfai/assets/init/.qfai/README.md`: replace old skill references.
- Update `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/SKILL.md`: update handoff instructions from old TDD skills to `qfai-implement`.
- Update `.qfai/assistant/skills/qfai-atdd/SKILL.md` (local instance): same changes.
- Update `packages/qfai/README.md` and root `README.md` if they reference old skills.

**Depends on**: Step 6 (wrappers must be updated before documentation reflects the change).

---

### Step 8: Orphan reference sweep

**Covers**: REQ-0008 (BR-0014-0011, AC-0014-0009)

**Details**:

- Execute full-text grep across the repository for: `qfai-tdd-red`, `qfai-tdd-green`, `qfai-tdd-refactor`.
- Target canonical assets: `packages/`, `.qfai/assistant/`, `.qfai/specs/`, `.agents/`, `.claude/`, `.codex/`, `scripts/`, `tests/`.
- Exclude from enforcement: `CHANGELOG.md`, `.qfai/discussion/`, `.qfai/specs/spec-0014/` (spec-0014's own documentation references old skill names descriptively).
- Fix any remaining references found.
- Confirm grep hit count = 0 in canonical assets (NFR-0002).

**Depends on**: Steps 5-7 (all deletions and updates must be complete).

---

### Step 9: Run all tests and fix regressions

**Covers**: NFR-0003, NFR-0004, NFR-0005

**Details**:

- Run full test suite: `npm test` / `vitest run`.
- Run `scripts/verify-pack.mjs` to confirm pack integrity.
- Run `qfai validate` to confirm no new validation errors.
- Fix any test regressions caused by:
  - Old skill name references in test fixtures (`packages/qfai/tests/assets/assets.test.ts`, `packages/qfai/tests/cli/init.test.ts`).
  - Missing `tdd/test-list.md` in existing spec directories (may need template backfill or test fixture updates).
- Confirm assets test detects re-introduction of old skill references (NFR-0003).
- Confirm non-implementation skill tests pass unchanged (NFR-0004).

**Depends on**: Steps 1-8 (all implementation complete).

---

## 2. Test Strategy

### 2.1 Layer assignment

Per `test-layers.md` conventions:

| Layer          | Count  | Scope                                                    | Location                                                          |
| -------------- | ------ | -------------------------------------------------------- | ----------------------------------------------------------------- |
| L1/L2 Unit     | 19 TCs | Validator logic, keyword checks, status transitions      | `packages/qfai/tests/core/`                                       |
| L3 Integration | 3 TCs  | Wrapper sync, orphan detection, init template generation | `packages/qfai/tests/core/` or `packages/qfai/tests/integration/` |
| L4 API         | 0      | Not applicable (CLI tool internal changes only)          | —                                                                 |
| L5 E2E         | 0      | Not needed for v1.6.0 (add later if required)            | —                                                                 |

### 2.2 Unit test file mapping (L1/L2)

| Test file               | TCs covered                                           | Module under test                                                       |
| ----------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `tddList.test.ts`       | TC-0014-0001–TC-0014-0009, TC-0014-0015, TC-0014-0020 | `validators/tddList.ts`                                                 |
| `tddListStatus.test.ts` | TC-0014-0010–TC-0014-0012, TC-0014-0019               | Status transition logic (within `tddList.ts` or extracted)              |
| `skillKeywords.test.ts` | TC-0014-0013, TC-0014-0014                            | Keyword check functions (within `validators/skillsIntegrity.ts` or new) |
| `tddListSerial.test.ts` | TC-0014-0021, TC-0014-0022                            | Serial execution / skip logic                                           |

### 2.3 Integration test file mapping (L3)

| Test file             | TCs covered                | Scope                                                                               |
| --------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `wrapperSync.test.ts` | TC-0014-0016, TC-0014-0017 | 3-layer wrapper sync: add `qfai-implement`, remove old entries, create missing dirs |
| `orphanCheck.test.ts` | TC-0014-0018               | Full-repo grep for old skill names, verify zero hits in canonical assets            |

### 2.4 Annotation schema

All test files carry `QFAI:SPEC-0014:TC-0014-XXXX` annotations for L1/L2/L3:

```typescript
// QFAI:SPEC-0014:TC-0014-0001
// QFAI:SPEC-0014:TC-0014-0002
describe("validateTddList — required columns", () => { ... });
```

If L5 E2E tests are added later, use `QFAI:SPEC-0014:US-0014-XXXX` annotations:

```typescript
// QFAI:SPEC-0014:US-0014-0001
describe("E2E: qfai-implement full cycle", () => { ... });
```

### 2.5 Fixture strategy

- Test fixtures use inline Markdown strings (no external fixture files).
- Temporary directories created via `mkdtemp` in `os.tmpdir()` (existing `withTempRoot` pattern).
- TC-0014-0020 (idempotency): run validator twice on same input, assert identical `Issue[]` output and no file mutation.
- TC-0014-0007 (unknown TC ref): create a mock `06_Test-Cases.md` with known IDs, then reference a non-existent value in TC-Refs.

### 2.6 Coverage obligations

- Every TC-0014-0001 through TC-0014-0022 must appear in at least one test file annotation.
- No test file may reference a TC-ID not defined in `06_Test-Cases.md`.

---

## 3. Risk & Mitigation

### Risk 1: Breaking change — old skill removal

**Risk**: Removing 3 old skills simultaneously could break users mid-workflow who have muscle memory for `/qfai-tdd-red` etc.

**Mitigation**: This is by design (REQ-0001: abolish, not deprecate). The spec explicitly requires immediate removal (US-0014-0003). No compatibility shim is provided. The CHANGELOG documents the breaking change. Assets tests (NFR-0003) prevent re-introduction.

### Risk 2: Wrapper sync incompleteness

**Risk**: A wrapper layer is missed during manual updates, leaving orphan references to old skills.

**Mitigation**:

- Step 6 updates all 3 layers atomically.
- Step 8 (orphan reference sweep) performs automated grep to catch any missed references.
- TC-0014-0016 and TC-0014-0017 validate the sync programmatically.
- `packages/qfai/tests/assets/assets.test.ts` already validates asset consistency; extend if needed.

### Risk 3: Orphan reference leaks

**Risk**: Old skill names persist in documentation, comments, or test fixtures after migration.

**Mitigation**:

- Step 8 performs full-text search before merge.
- BR-0014-0011 defines the exclusion list (CHANGELOG, historical code comments).
- TC-0014-0018 provides automated orphan detection as a regression guard.
- CI pipeline runs `verify-pack.mjs` which will surface structural issues.

### Risk 4: `spec_required_files.json` backward compatibility

**Risk**: Adding `tdd/test-list.md` to required files causes validation failures for existing specs that predate v1.6.0.

**Mitigation**:

- The `tdd/test-list.md` requirement applies only to specs created under v1.6.0+.
- Existing specs can be backfilled via `qfai init` template generation or exempted via version-gated validation.
- Confirm behavior in Step 9 test regression pass.

### Risk 5: Validator performance

**Risk**: Phase 1 validator exceeds the 5-second budget (NFR-0001) on large specs with many TC references.

**Mitigation**:

- The validator performs at most 5 sequential checks with simple string/regex operations.
- TC reference resolution reads a single `06_Test-Cases.md` file per spec.
- No filesystem globbing or deep tree traversal required.
- Performance is trivially within budget for any realistic spec size.

---

## 4. Dependencies

### 4.1 External dependencies

None. No new npm packages required. All functionality uses existing Node.js built-ins (`fs/promises`, `path`) and existing patterns from the validator infrastructure.

### 4.2 Internal dependencies

| Dependency                          | Usage                                                            | Already exists                                     |
| ----------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| `Issue[]` return contract           | All validators return `Issue[]`                                  | Yes (`packages/qfai/src/core/validators/utils.ts`) |
| `validators/index.ts` barrel export | Register new validator                                           | Yes                                                |
| `validate.ts` `validateProject()`   | Wire new validator into pipeline                                 | Yes                                                |
| Init asset copy mechanism           | Copy `test-list.md` template during `qfai init`                  | Yes                                                |
| `specLayout.ts` required files      | Add `tdd/test-list.md` to manifest                               | Yes                                                |
| `assets.test.ts`                    | Extend to verify `qfai-implement` presence and old skill absence | Yes                                                |

### 4.3 Cross-spec dependencies

- No dependency on other in-flight specs.
- spec-0012 (ATDD) references old TDD skills in handoff documentation; Step 7 updates these references.

---

## 5. Delivery

- **Single PR**: all 9 steps in one atomic PR per OC-10 (1 version = 1 PR).
- **Branch**: `feature/v1.6.0` (current branch).
- **Pre-merge gates**: `npm test` pass, `verify-pack.mjs` pass, `qfai validate` pass, orphan grep = 0.
- **Post-merge verification**: confirm `qfai init` generates `tdd/test-list.md`, confirm `/qfai-implement` is available in all wrapper layers, confirm old skills are absent.

---

## 6. New/Modified File Summary

### New files

| File                                                                       | Step | Purpose                                                                                  |
| -------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------- |
| `packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md` | 1    | Unified implementation skill body                                                        |
| `packages/qfai/assets/init/.qfai/specs/spec-XXXX/tdd/test-list.md`         | 2    | Execution ledger template                                                                |
| `packages/qfai/src/core/validators/tddList.ts`                             | 3    | Phase 1 validator                                                                        |
| `packages/qfai/tests/core/tddList.test.ts`                                 | 9    | Unit tests for Phase 1 validator (TC-0014-0001–TC-0014-0009, TC-0014-0015, TC-0014-0020) |
| `packages/qfai/tests/core/tddListStatus.test.ts`                           | 9    | Unit tests for status transitions (TC-0014-0010–TC-0014-0012, TC-0014-0019)              |
| `packages/qfai/tests/core/skillKeywords.test.ts`                           | 9    | Unit tests for keyword checks (TC-0014-0013, TC-0014-0014)                               |
| `packages/qfai/tests/core/tddListSerial.test.ts`                           | 9    | Unit tests for serial execution (TC-0014-0021, TC-0014-0022)                             |
| `packages/qfai/tests/core/wrapperSync.test.ts`                             | 9    | Integration tests for wrapper sync (TC-0014-0016, TC-0014-0017)                          |
| `packages/qfai/tests/core/orphanCheck.test.ts`                             | 9    | Integration test for orphan detection (TC-0014-0018)                                     |

### Modified files

| File                                                                  | Step | Change                                          |
| --------------------------------------------------------------------- | ---- | ----------------------------------------------- |
| `packages/qfai/src/core/validators/index.ts`                          | 3    | Export `validateTddList`                        |
| `packages/qfai/src/core/validate.ts`                                  | 3    | Wire `validateTddList` into `validateProject()` |
| `.qfai/assistant/manifest/spec_required_files.json`                   | 4    | Add `tdd/test-list.md`                          |
| `.agents/*`, `.claude/commands/*`, `.codex/*` + asset counterparts    | 6    | Add `qfai-implement`, remove old entries        |
| `packages/qfai/assets/init/.qfai/assistant/instructions/workflow.md`  | 7    | Replace old skill refs                          |
| `.qfai/assistant/instructions/workflow.md`                            | 7    | Replace old skill refs                          |
| `.qfai/README.md`, `packages/qfai/assets/init/.qfai/README.md`        | 7    | Replace old skill refs                          |
| `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/SKILL.md` | 7    | Update handoff to `qfai-implement`              |
| `.qfai/assistant/skills/qfai-atdd/SKILL.md`                           | 7    | Update handoff to `qfai-implement`              |
| `packages/qfai/README.md`, `README.md`                                | 7    | Replace old skill refs                          |
| `packages/qfai/tests/assets/assets.test.ts`                           | 9    | Update expectations for new/removed skills      |
| `packages/qfai/tests/cli/init.test.ts`                                | 9    | Update expectations for `tdd/test-list.md`      |

### Deleted files

| File                                                                          | Step |
| ----------------------------------------------------------------------------- | ---- |
| `packages/qfai/assets/init/.qfai/assistant/skills/qfai-tdd-red/SKILL.md`      | 5    |
| `packages/qfai/assets/init/.qfai/assistant/skills/qfai-tdd-green/SKILL.md`    | 5    |
| `packages/qfai/assets/init/.qfai/assistant/skills/qfai-tdd-refactor/SKILL.md` | 5    |
| `.qfai/assistant/skills/qfai-tdd-red/SKILL.md`                                | 5    |
| `.qfai/assistant/skills/qfai-tdd-green/SKILL.md`                              | 5    |
| `.qfai/assistant/skills/qfai-tdd-refactor/SKILL.md`                           | 5    |
