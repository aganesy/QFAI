# 07 Non-Functional Requirements

## Purpose

Non-functional requirements for QFAI v1.7.11 (completion/correction/integration release). Each NFR defines a measurable quality attribute that must be satisfied for release.

## NFR Register

### NFR-0001: Backward Compatibility

- **Title:** Backward Compatibility
- **Description:** Legacy 4-axis projects must receive migration guidance, not hard failures, during the transition period. The migration check validator must detect legacy artifacts and emit actionable upgrade guidance before any hard-fail occurs. Users with existing v1.7.x projects must have a clear, non-destructive path forward.
- **Measurable Target:** Migration check emits guidance (warning-level diagnostic with remediation steps) before hard-fail. No legacy project triggers an unhandled error during `qfai validate`.
- **Source:** SRC-0007

---

### NFR-0002: Validation Performance

- **Title:** Validation Performance
- **Description:** The UIX validation budget must remain within acceptable bounds to ensure responsive CLI feedback. The `UIUX_VALIDATION_BUDGET_MS` constant must be enforced as an upper bound on validation execution time for UI/UX sidecar artifacts.
- **Measurable Target:** `UIUX_VALIDATION_BUDGET_MS` constant enforced at 2000ms. No single validation pass exceeds this budget under normal conditions.
- **Source:** SRC-0008

---

### NFR-0003: Test Coverage

- **Title:** Test Coverage
- **Description:** All new and modified code paths introduced or changed in v1.7.11 must have corresponding test coverage. No production code path may exist without at least one test exercising it.
- **Measurable Target:** No untested production code paths. Every new/modified function or branch has at least one corresponding test case in the test suite.
- **Source:** CLAUDE.md project rules

---

### NFR-0004: Honesty Rule

- **Title:** Honesty Rule
- **Description:** Runtime status must never report "captured" when no actual capture occurred. The status vocabulary is restricted to values that accurately reflect what happened during execution. A "captured" status requires actual execution evidence (e.g., output artifacts, logs, or screenshots).
- **Measurable Target:** "captured" status requires actual execution evidence. No false-positive capture statuses in any validator or phase runner output.
- **Source:** SRC-0007

---

### NFR-0005: Source/Packaged Asset Parity

- **Title:** Source/Packaged Asset Parity
- **Description:** Source assets (in the repository source tree) and packaged assets (used by `qfai init` for project scaffolding) must always be updated simultaneously. Drift between these two asset sets constitutes a release-blocking defect.
- **Measurable Target:** Diff between source and init templates is empty for all canonical files. A CI check or manual verification confirms parity before release.
- **Source:** SRC-0007

---

### NFR-0006: Error Handling

- **Title:** Error Handling
- **Description:** Every async code path must have explicit error handling. No promise may be left unhandled, and no async function may silently swallow errors. All error paths must produce actionable diagnostics.
- **Measurable Target:** No unhandled promise rejections during any `qfai` command execution. Static analysis confirms every async path has explicit error handling (try/catch or .catch()).
- **Source:** CLAUDE.md

---

### NFR-0007: Release Truth

- **Title:** Release Truth
- **Description:** Documentation, steering files, changelog, and inline comments must use consistent state vocabulary. The terms "implemented", "partial", and "deferred" must mean the same thing everywhere they appear. No contradictory maturity claims may exist across documents within the same release.
- **Measurable Target:** No contradictory maturity claims across documents. A single grep/search for state vocabulary terms produces consistent usage across all repo layers (docs, steering, changelog, inline comments).
- **Source:** SRC-0007
