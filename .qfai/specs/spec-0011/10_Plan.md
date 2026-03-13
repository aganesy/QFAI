# 10 Plan

- Spec: spec-0011
- Parent: CAP-0011

## Implementation Strategy

This plan covers How to implement SDP (Spec Diff Protocol). What is already defined in 01_Spec.md and related artifacts. Phasing follows DR-0009: Common Protocol first, then atdd, then prototyping.

### Phase 1: Common Preflight Diff Protocol

Define the shared Preflight Diff Protocol section that both `/qfai-atdd` and `/qfai-prototyping` will reference. This is the foundation for all incremental behavior.

**Steps:**

1. Author a reusable "Preflight Diff Protocol" section covering the 3-source detection algorithm:
   - Source A: `git diff --name-only {last_commit_sha}..HEAD` on `.qfai/specs/` (BR-0011-0002)
   - Source B: `last_run_timestamp` vs spec file mtime comparison (BR-0011-0003)
   - Source C: `09_delta.md` parse for change_context (BR-0011-0004)
2. Define the union logic: `changed_specs = union(A, B)`, `change_context = C` (BR-0011-0005, DR-0006)
3. Define Diff Summary output format for human-readable presentation (BR-0011-0006, NFR-0005)
4. Define fallback rules: evidence absent or Diff Context missing triggers full scan (BR-0011-0007, BR-0011-0024, NFR-0003, NFR-0004)
5. Define `--full` flag behavior: skip Preflight Diff, force full scan (BR-0011-0017)
6. Define `_policies/` change detection: all specs become changed + user confirmation (BR-0011-0018, DR-0011)
7. Define git-unavailable graceful degradation: skip Source A, warn, continue with Source B only (BR-0011-0023)
8. Define Implementation State Analysis (ISA) classification algorithm:
   - Annotation scan for `QFAI:SPEC-XXXX:*` markers in test/skeleton files (BR-0011-0008)
   - 4-state classification: implemented, missing, stale, unchanged (BR-0011-0009)
   - Stale only for Primary=Behavior or Primary=Initial specs (BR-0011-0010, DR-0010)

**AC coverage:** AC-0011-0001 through AC-0011-0007, AC-0011-0014, AC-0011-0015, AC-0011-0020, AC-0011-0021, AC-0011-0022

**Placement:** The common protocol will be authored as a self-contained section within each SKILL.md (atdd, prototyping) rather than a separate shared file, since SKILL.md files are standalone prompt documents. Both will contain identical protocol text to maintain consistency.

### Phase 2: /qfai-atdd Incremental Mode

Add an "Incremental Mode" section to the `/qfai-atdd` SKILL.md that invokes the Preflight Diff Protocol and routes specs by ISA state.

**Steps:**

1. Insert Preflight Diff Protocol section (from Phase 1) into qfai-atdd SKILL.md
2. Add ISA-driven routing logic:
   - missing: generate new acceptance tests (BR-0011-0020)
   - stale: update existing tests to match changed spec (BR-0011-0021)
   - unchanged: skip entirely (BR-0011-0022)
3. Add `--full` flag documentation to argument-hint
4. Document that incremental mode is default when evidence with Diff Context exists
5. Ensure `/qfai-verify` exclusion note: verify always full scan, no Preflight Diff (BR-0011-0019, DR-0007)

**AC coverage:** AC-0011-0017, AC-0011-0018, AC-0011-0019

### Phase 3: /qfai-prototyping Incremental Mode

Add an "Incremental Mode" section to the `/qfai-prototyping` SKILL.md that invokes the Preflight Diff Protocol and processes only changed specs.

**Steps:**

1. Insert Preflight Diff Protocol section (from Phase 1) into qfai-prototyping SKILL.md
2. Add incremental processing logic:
   - changed_specs: full skeleton update, Tags scoped to changed specs only (BR-0011-0011, BR-0011-0013)
   - unchanged: Runtime Gate check only (compile/startup verification) (BR-0011-0012)
3. Add `--full` flag documentation to argument-hint
4. Update the current "all-spec stage" preamble to acknowledge incremental mode as the default when evidence exists, with full mode as fallback

**AC coverage:** AC-0011-0008, AC-0011-0009, AC-0011-0010

### Phase 4: Evidence Schema Extension

Define the Diff Context section that skills must write into evidence output files after execution.

**Steps:**

1. Document the Diff Context schema in both SKILL.md evidence output sections:
   - `last_commit_sha`: current git HEAD SHA at execution time (BR-0011-0014)
   - `last_run_timestamp`: ISO 8601 timestamp (BR-0011-0015)
   - `changed_specs`: list of processed spec IDs (BR-0011-0016)
   - `execution_mode`: "incremental" or "full" (BR-0011-0016)
2. Specify backward compatibility: absence of Diff Context in existing evidence is not an error (NFR-0004)
3. Add evidence output examples showing the Diff Context section

**AC coverage:** AC-0011-0011, AC-0011-0012, AC-0011-0013

## File Changes

| # | File | Operation | Description | Phase |
|---|------|-----------|-------------|-------|
| 1 | `.qfai/assistant/skills/qfai-atdd/SKILL.md` | Modify | Add Preflight Diff Protocol section, ISA routing, Incremental Mode, `--full` flag, Evidence Diff Context output | P1+P2+P4 |
| 2 | `.qfai/assistant/skills/qfai-prototyping/SKILL.md` | Modify | Add Preflight Diff Protocol section, Incremental Mode, changed/unchanged routing, `--full` flag, Evidence Diff Context output | P1+P3+P4 |
| 3 | `.qfai/assistant/skills/qfai-verify/SKILL.md` | Modify (minimal) | Add explicit note that verify always uses full scan and does not invoke Preflight Diff (DR-0007, REQ-0013) | P2 |

**No TypeScript changes** (DR-0008, NFR-0002). All modifications are SKILL.md prompt-level only.

## Test Strategy

### Verification Approach

Since SDP is a SKILL.md-only change (prompt-level, no runtime code), traditional unit/integration tests do not apply. Verification is through structured manual and E2E skill execution.

### L-struct: Structure Validation (qfai validate)

| Validation Item | Rule | Target |
|----------------|------|--------|
| spec-0011 required fileset exists | E_SPEC_MISSING_FILESET | All spec files |
| All AC have corresponding TC | E_SPEC_AC_WITHOUT_TC | AC-0011-0001 ~ AC-0011-0022 |
| All BR have corresponding EX | E_SPEC_BR_WITHOUT_EX | BR-0011-0001 ~ BR-0011-0025 |

### L5 E2E: Skill Execution Tests

Execute skills on a test project with controlled spec changes and verify incremental behavior.

| Test Scenario | TC Refs | Verification Method |
|---------------|---------|-------------------|
| Run `/qfai-atdd` with known spec change | TC-0011-0021, TC-0011-0022, TC-0011-0023 | Confirm only changed spec tests are generated/updated, unchanged skipped |
| Run `/qfai-prototyping` with known spec change | TC-0011-0012, TC-0011-0013, TC-0011-0014 | Confirm only changed spec skeletons updated, unchanged gets Gate only |
| Run `/qfai-prototyping --full` | TC-0011-0018 | Confirm all specs processed, execution_mode=full |
| Run skill with no evidence (first run) | TC-0011-0007 | Confirm full scan fallback |
| Run skill after `_policies/` change | TC-0011-0019 | Confirm all specs flagged + confirmation message |
| Run `/qfai-verify` with evidence | TC-0011-0020 | Confirm full scan, no Preflight Diff |
| Run skill with git unavailable | TC-0011-0024 | Confirm Source A skipped, warning logged |
| Run skill with old evidence (no Diff Context) | TC-0011-0025 | Confirm graceful fallback to full scan |

### L3 Integration: Evidence Schema Compliance

| Test Scenario | TC Refs | Verification Method |
|---------------|---------|-------------------|
| Verify evidence contains `last_commit_sha` | TC-0011-0015 | Read evidence JSON, check SHA matches git HEAD |
| Verify evidence contains `last_run_timestamp` | TC-0011-0016 | Read evidence JSON, check ISO 8601 format |
| Verify evidence contains `changed_specs` + `execution_mode` | TC-0011-0017 | Read evidence JSON, check spec list and mode |

### Manual Review Checklist

- [ ] Preflight Diff Protocol section is identical in both atdd and prototyping SKILL.md
- [ ] 3-source algorithm (git diff, timestamp, delta.md) is clearly documented
- [ ] Union logic is unambiguous: `changed_specs = union(A, B)`
- [ ] ISA 4-state classification is complete (implemented, missing, stale, unchanged)
- [ ] Stale criteria explicitly limited to Primary=Behavior/Initial (DR-0010)
- [ ] `--full` flag documented in argument-hint and behavior section
- [ ] Policy change detection triggers all-spec + confirmation
- [ ] verify exclusion is explicit (DR-0007)
- [ ] Evidence Diff Context schema is documented in output section
- [ ] Backward compatibility for missing Diff Context is stated
- [ ] Diff Summary format is human-readable (NFR-0005)
- [ ] No TypeScript code references or dependencies (NFR-0002)

## Risk Mitigation

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Diff detection misses a changed spec (false negative) | High | Low | 3-source union ensures any single source detecting a change is sufficient (NFR-0001, BR-0011-0025). Fallback to full scan on any ambiguity. |
| Prompt instructions are ambiguous, causing LLM to skip incremental logic | High | Medium | Use explicit step-by-step protocol with numbered instructions. Include concrete examples in SKILL.md. Validate via E2E execution. |
| Evidence schema change breaks existing workflows | Medium | Low | Backward compatibility is enforced: missing Diff Context triggers full scan, never an error (NFR-0004, BR-0011-0024). |
| git unavailable in CI/sandboxed environments | Medium | Medium | Source A graceful degradation: skip and warn, use Source B only (BR-0011-0023, NFR-0003). |
| Policy change not detected, partial spec processing | High | Low | Explicit `_policies/` path check in Source A. Conservative response: all specs + user confirmation (DR-0011, BR-0011-0018). |
| SKILL.md prompt drift between atdd and prototyping | Medium | Medium | Common Preflight Diff Protocol section authored once and copied identically. Diff the two sections during review to confirm parity. |
| `--full` flag forgotten, stale incremental results | Low | Low | Document `--full` prominently. First-run without evidence automatically triggers full scan. |

## Rollback Plan

All changes are SKILL.md-only prompt modifications. Rollback is straightforward:

1. **Git revert**: `git revert <commit-sha>` to undo the SKILL.md changes. Since no TypeScript or runtime code is modified, revert has zero risk of breaking builds or tests.
2. **Granular rollback**: If only one skill's incremental mode is problematic, revert only that SKILL.md file while keeping the other.
3. **`--full` escape hatch**: Even without reverting, users can bypass incremental mode entirely by passing `--full` to any skill invocation. This provides an immediate workaround without code changes.
4. **Evidence cleanup**: If evidence Diff Context data is causing issues, deleting or clearing the evidence file triggers automatic full-scan fallback (BR-0011-0007). No manual schema migration is needed.

## Dependencies

- spec-0011 has no hard dependency on other in-flight specs
- `/qfai-verify` is explicitly excluded from incremental support (DR-0007) and requires only a minimal note addition
- Evidence schema extension is additive and backward-compatible, so no coordination with existing evidence consumers is required
