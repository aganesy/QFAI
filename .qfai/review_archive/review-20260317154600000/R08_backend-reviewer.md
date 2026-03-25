# Review: Backend Reviewer

## Target

- Pack: `.qfai/discussion/discussion-20260317153106326/`
- Scope: discussion
- Version: v1.6.1

## Verdict: PASS

## Checklist

- [x] Backend/API/data consistency reviewed
- [x] Operational/reliability concerns assessed

## Findings

1. **Data consistency is well-addressed.** The 8-column schema for `test-list.md` is defined consistently across 06_REQ (REQ-0008), 05_Scope (item 3), and the template source (SRC-0005). No contradictions found between the column contract in the validator, template, and documentation artifacts.

2. **Error code taxonomy is clean.** Five new error codes (TDDLIST_TC_NOT_COVERED, TDDLIST_EXCEPTION_MISSING_DR, TDDLIST_TEST_FILE_MISSING, TDDLIST_DUPLICATE_ID, TDDLIST_INVALID_ID) are consistently named, each maps to a single failure mode, and none overlap with existing Phase 1 codes. CON-T002 explicitly protects Phase 1 codes from modification.

3. **Path resolution design is sound.** OQ-0001 resolved that test file paths are project-root-relative. CON-T004 addresses Windows backslash normalization. CON-T003 mandates `fs.access` for portability. This is a coherent backend decision chain with no gaps.

4. **Backwards compatibility is clearly scoped.** NFR-0001 ensures specs without `test-list.md` remain at warning level (TDDLIST_MISSING). POL-M001 and POL-M002 define the migration boundary: warning for missing file, error for opted-in specs with wrong schema. CON-O003 reinforces this. No risk of silent data corruption on upgrade.

5. **Operational concern: CI pipeline impact.** CON-O002 addresses the key operational risk -- existing `qfai validate --fail-on error` pipelines. The new Phase 2 checks are all error severity (REQ-0013), so projects upgrading to v1.6.1 with old 6-column test-list.md files will see new failures. This is intentional per POL-M002, and Risk #3 in the Inception Deck acknowledges the migration burden with mitigation (clear error messages, DR-ID/Evidence can start empty for non-exception rows).

6. **No data migration tool needed.** POL-M003 explicitly calls out manual column addition. For a CLI-only tool with markdown-based data, this is appropriate -- automated migration of markdown tables risks data loss.

## Notes

- The discussion pack demonstrates strong traceability from failure modes (F-6101--F-6105) through requirements (REQ-0001--REQ-0015) to constraints and policies. Each decision has a clear rationale chain.
- NFR-0002 sets a reasonable performance target (< 2x wall time). The five new checks involve file I/O (test file existence) and cross-file parsing (TC coverage), which could be hot spots. The verification approach (benchmark before/after) is appropriate for the discussion phase.
