# 10 Policy

## Purpose

Policies governing the v1.7.11 release process, migration strategy, runtime behavior, testing, documentation, and security. Policies are binding rules that must be followed throughout the release lifecycle.

---

### POL-001: Release Policy

The v1.7.11 release claim is limited to: **"completes remaining convergence work left incomplete in v1.7.9"**. No additional claims are permitted. Marketing, changelog, steering, and documentation must not overstate the scope of this release. This is a completion/correction/integration release, not a feature release.

---

### POL-002: Migration Policy

Old 4-axis assets are deprecated with explicit marking (e.g., `deprecated: true` metadata or diagnostic warnings). Migration guidance must be provided before any hard-fail occurs. Legacy artifacts are not immediately deleted; they remain in place with deprecation markers until the next major version boundary. The migration path must be:

1. Detect legacy artifacts during validation.
2. Emit warning-level diagnostic with specific remediation steps.
3. Allow the user to complete migration at their own pace.
4. Hard-fail only after the defined transition period expires.

---

### POL-003: Honesty Policy

Runtime status vocabulary is restricted to: **captured**, **skipped**, and **failed**. The term "requested" is not a valid completion status. A status of "captured" requires actual execution evidence (output artifacts, logs, or screenshots). A status of "skipped" must include a reason. A status of "failed" must include error details. No status may misrepresent what actually occurred during execution.

---

### POL-004: Testing Policy

All source changes must have corresponding test coverage. No production code path may be introduced or modified without at least one test exercising it. Old test fixtures must be updated to reflect canonical expectations (3-layer model, strong schema format). The test count must not decrease as a result of migration. Test names and TC-Refs must follow the traceability chain (REQ -> Spec -> Code -> Test) as defined in CLAUDE.md.

---

### POL-005: Documentation Policy

State vocabulary must be used consistently across all documents. The permitted terms and their meanings are:

- **implemented** — The feature is fully coded, tested, and integrated into the production path.
- **partial** — The feature is partially coded or tested but not yet fully integrated.
- **deferred** — The feature is intentionally postponed to a future release with documented rationale.

No other state terms (e.g., "planned", "in progress", "done") may be used in steering, changelog, or specification documents. If a contradiction is found between documents, it must be resolved before release.

---

### POL-006: Security Policy

No command injection, cross-site scripting (XSS), or other OWASP Top 10 vulnerabilities may be introduced in new code. Specific requirements:

- All user-supplied input must be validated and sanitized before use in shell commands, file paths, or HTML output.
- No `eval()`, `Function()`, or equivalent dynamic code execution on user input.
- Dependencies must not introduce known high/critical CVEs at time of release.
- File path handling must prevent directory traversal attacks.
