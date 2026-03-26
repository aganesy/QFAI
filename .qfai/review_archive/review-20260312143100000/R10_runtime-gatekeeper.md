# R10_runtime-gatekeeper

## Verdict: PASS

## Checklist

- [x] Operational readiness: Cross-platform filesystem operations are identified and addressed
- [x] Runtime risk controls: Windows symlink failure is handled with explicit error + halt (OQ-0004, REQ-0009)
- [x] Platform-specific behavior documented: `fs.symlink()` type parameter for Windows (TC-02)
- [x] Git configuration safety: `git config core.symlinks true` only in Git repository context (AC-0008)
- [x] Idempotency: REQ-0011 ensures repeated `qfai init` does not corrupt state
- [x] Migration path: `--force` option for transitioning from old wrapper files to symlinks (OC-01, REQ-0008)
- [x] Relative path strategy: REQ-0010 specifies relative symlink targets to avoid machine-specific breakage (TC-03)
- [x] Rollback considerations: Addressed via `--force` prune of old files and symlink re-creation
- [x] Error messaging: NFR-0004 requires Developer Mode activation instructions in error output
- [x] No runtime service dependencies: All operations are local filesystem, no external service calls

## Findings

### Positive Findings

1. **Windows failure mode is well-defined**: OQ-0004 resolved that on Windows without Developer Mode, the tool will display a clear error message and halt rather than attempting fallback mechanisms (junctions, file copies). This prevents half-configured states and is the safest approach. The rejected alternatives (junction fallback, error-and-continue) are documented with rationale.

2. **Idempotency requirement is explicit**: REQ-0011 mandates that `qfai init` detects existing correct symlinks and skips them, only re-creating broken symlinks. This prevents filesystem churn and supports safe repeated execution.

3. **Relative path requirement prevents portability issues**: REQ-0010 mandates relative paths for symlink targets (e.g., `../../.qfai/assistant/skills/qfai-*`), preventing breakage when the repository is cloned to a different absolute path.

4. **Prune strategy for migration**: REQ-0008 extends `pruneStaleQfaiWrappers()` to handle not just old commands/prompts but also old non-symlink skill directories, ensuring clean migration.

### Minor Observations (non-blocking)

1. **Broken symlink detection at runtime**: REQ-0011 mentions re-creating broken symlinks, but the discussion does not detail how broken symlinks are detected (e.g., `fs.lstat()` + `fs.stat()` comparison, or `fs.readlink()` target validation). This is an implementation detail appropriate for the SDD/TDD phase.

2. **Partial failure scenario**: If symlink creation fails midway through the 36+ skill symlinks (e.g., disk full, permission revoked), the discussion implies halt-on-error (from OQ-0004 Windows context), but does not explicitly define behavior for non-Windows partial failures. The SDD phase should clarify whether the tool attempts all symlinks and reports failures, or halts at first failure on all platforms.

3. **`git config` scope**: REQ-0005 states `git config core.symlinks true` will be executed, but does not specify the config scope (local vs global). The SDD should confirm this is local scope (`--local`) to avoid affecting other repositories on the same machine.

## Notes

The discussion adequately addresses the key runtime and operational concerns for a filesystem-level architecture change:

- **Platform matrix**: macOS/Linux (no special requirements) and Windows (Developer Mode required) are both covered.
- **Failure modes**: The halt-on-error approach for Windows is conservative and correct for a development tool -- partial symlink states would be confusing.
- **Rollback**: Since `qfai init --force` can prune and re-create, it effectively serves as both the migration and recovery mechanism.
- **Git integration**: Setting `core.symlinks` ensures `git checkout` correctly materializes symlinks rather than creating text files containing the target path.

The minor observations (broken symlink detection method, partial failure on non-Windows, git config scope) are implementation details that should be addressed in the SDD specification but do not block the discussion phase from passing.
