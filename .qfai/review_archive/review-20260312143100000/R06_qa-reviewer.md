# R06_qa-reviewer

## Verdict: PASS

## Checklist

- [x] Testability: all 11 REQs have measurable acceptance criteria that can be verified programmatically
- [x] Edge cases are identified in Example Seeds (03_Story-Workshop) for all 4 user stories
- [x] Failure-path coverage: Windows Developer Mode OFF failure is covered (US-0003, AC-0009, OQ-0004)
- [x] Failure-path coverage: non-Git-repo scenario identified (US-0003 example seed: "git config is skipped with warning")
- [x] Idempotency testing is explicitly required (REQ-0011, US-0001/0002/0003 example seeds)
- [x] Migration testing path is defined (--force flag, REQ-0008, OC-01)
- [x] Cross-platform test requirements are documented (10_Policy: macOS + Windows, NFR-0002)
- [x] Open/deferred items: zero open OQs, zero deferred items -- discussion exit criteria met
- [x] OQ register exit condition (open count = 0) is satisfied
- [x] Deferred items file (13_Deferred.md) correctly shows no deferred items with explanation
- [x] Success criteria (05_Scope) are quantifiable: 36 skill symlinks, all agent symlinks, per-platform success rates

## Findings

### F-R06-01: Missing example seed for broken/dangling symlink scenario (Severity: Medium)

The Example Seeds in US-0001 and US-0002 cover happy path, negative path, edge cases, and idempotency, but do not include a scenario where an existing symlink points to a target that no longer exists (dangling symlink). This is a realistic scenario when a canonical skill is renamed or removed between QFAI versions. REQ-0011 says "recreate only broken symlinks," but what constitutes "broken" (dangling? wrong target? not-a-symlink?) is not elaborated.

**Recommendation:** Add an example seed: "Existing symlink points to a deleted canonical skill directory -> qfai init should remove the dangling symlink and not recreate it (since canonical no longer exists)." Also clarify in the SDD whether "broken" means dangling, wrong-target, or both.

### F-R06-02: No explicit test requirement for non-QFAI file preservation (Severity: Medium)

OQ-0003 resolves that pr-fix/pr-merge skills are out of scope, and OQ-0005 resolves that README.md files remain as regular files. However, there is no explicit test scenario ensuring that `qfai init --force` does NOT delete or overwrite non-QFAI files in the integration directories. Given that the prune logic walks directories and removes entries, a regression test ensuring non-`qfai-*` entries survive is important.

**Recommendation:** Add a test scenario: "`.claude/skills/pr-fix/` exists as a regular directory -> after `qfai init --force`, pr-fix directory is untouched." Similarly for README.md files. This should be captured as an acceptance criterion or explicit test case in the SDD/ATDD phase.

### F-R06-03: Windows test matrix not fully specified (Severity: Low)

NFR-0002 requires cross-platform compatibility and 10_Policy mentions "macOS + Windows cross-platform testing." However, the test matrix is underspecified:

- Windows with Developer Mode ON + `core.symlinks=true` (happy path)
- Windows with Developer Mode OFF (failure path per OQ-0004)
- Windows with Developer Mode ON but `core.symlinks=false` (edge: git config not yet set)
- Linux (not explicitly mentioned in 10_Policy but implied by NFR-0002 "macOS, Linux, Windows")

**Recommendation:** In the ATDD phase, define a complete platform x configuration test matrix. Ensure Linux is explicitly included (not just implied).

### F-R06-04: Prune scope expansion (REQ-0008) needs negative test (Severity: Low)

REQ-0008 extends pruning to "old skill directories that are not symlinks." This needs a negative test: "A qfai-\* directory that IS a correct symlink should NOT be pruned." The current prune logic in init.ts uses `entry.isDirectory()` checks -- after the change, it must distinguish between regular directories and symlinks (using `lstat` instead of `stat`).

**Recommendation:** Add explicit test case: "`.agents/skills/qfai-atdd` is a valid symlink -> prune does NOT remove it." The implementation must use `lstat()` (not `stat()`) to detect symlinks vs directories. Flag this as a critical implementation detail in the SDD.

### F-R06-05: copilot-instructions.md update (REQ-0007) has no regression test seed (Severity: Low)

AC-0011 states the `.github/prompts/` reference must be updated to `.github/skills/`. There is no example seed or test scenario verifying this update occurs correctly. The US-0004 example seeds are minimal.

**Recommendation:** Add a test scenario: "After `qfai init`, `.github/copilot-instructions.md` contains `.github/skills/` and does NOT contain `.github/prompts/`."

## Notes

- The discussion pack is thorough and well-structured. All 5 OQs are resolved, no items are deferred, and the exit condition for the discussion gate is cleanly met.
- The Example Seeds in 03_Story-Workshop provide good coverage for the happy path and basic negative scenarios. The findings above are incremental improvements for edge-case completeness, not structural gaps.
- The cross-platform concern (Windows symlink creation) is the highest-risk area from a QA perspective. The decision to halt on failure (OQ-0004 -> Option C) is QA-friendly because it prevents partial/inconsistent states that are hard to diagnose.
- The `lstat` vs `stat` distinction (F-R06-04) is the most implementation-critical QA finding. Using `stat()` would follow symlinks and incorrectly classify them as directories, causing valid symlinks to be pruned. This must be caught in the SDD/TDD phases.
- No blocking findings. All findings are addressable in the SDD/ATDD phases without requiring discussion rework.
