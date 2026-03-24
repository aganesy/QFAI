# 09 Constraints

Discussion pack: discussion-20260325120000000
Version context: QFAI v1.7.0 "Discussion Design Hardening"
Last updated: 2026-03-25

---

## Technical Constraints

### TC-1 — Backward compatibility with v1.6.5 non-UI packs

All discussion packs that were valid under QFAI v1.6.5 and do not contain UI-bearing artifacts must remain valid under v1.7.0 without modification. The new DDS structural validators must activate only on packs classified as UI-bearing. Non-UI packs must pass the full v1.6.5 validator suite unchanged and must not receive DDS-related errors or warnings.

**Impact**: Validator entry points must gate new checks behind the UI-bearing classification result before executing.

### TC-2 — UI-bearing detection must use artifact presence, not keyword matching alone

The mechanism that classifies a discussion pack as UI-bearing must be based on the confirmed presence of UI-related artifacts in the pack's document set (e.g., declared screen specifications, wireframe file references, component inventory entries). Keyword scanning of free-text prose is insufficient on its own and may not be the sole signal used for classification. This prevents both false positives (triggering DDS requirements on non-UI packs) and false negatives (missing UI-bearing packs that happen to use atypical vocabulary).

**Impact**: The detection implementation must define an artifact schema or file-type registry against which documents are checked, not a string-match list.

### TC-3 — New validators must integrate into the existing validate.ts orchestrator

All validators introduced in v1.7.0 must be registered with and invoked through the existing `validate.ts` orchestration layer. No parallel or out-of-band validation pipelines may be introduced. New validator modules must conform to the existing validator interface (input type, return type, severity contract) so that the orchestrator can handle them without modification to its dispatch logic.

**Impact**: Validator authors must review the existing validator interface before implementation and must not introduce a new base class or runner.

### TC-4 — TypeScript 5.6.3 compatibility required

All new source files, type definitions, and test files must be compatible with TypeScript 5.6.3 as specified for the project. No TypeScript language features introduced after 5.6.3 may be used. The `tsconfig.json` target and lib settings must not be changed as part of this release.

**Impact**: Developers must verify feature availability against the TypeScript 5.6.3 changelog before use.

### TC-5 — No new runtime dependencies

v1.7.0 must not introduce any new entries under `dependencies` in `package.json`. All implementation must rely on Node built-ins (Node ≥18), TypeScript's standard library, and packages already present in the project. New `devDependencies` are permitted only if required for testing tooling and must be approved in the PR review.

**Impact**: Any utility logic (e.g., YAML parsing for the competitive reference registry, artifact detection helpers) must be implemented using existing dependencies or standard Node APIs.

---

## Operational Constraints

### OC-1 — Single PR for entire v1.7.0 release

All changes constituting v1.7.0 — new validators, DDS schema, updated template files, competitive reference registry enhancements, documentation updates, and tests — must be delivered in a single pull request targeting `main` from the `feature/v1.7.0` branch. Partial or staged merges for this release are not permitted.

**Impact**: Feature development must be coordinated so that all components are complete and passing before the PR is opened.

### OC-2 — Tests, verify-pack, and docs updated in the same changeset

Any new validator or behavioral change must be accompanied, in the same commit set within the PR, by: (a) vitest unit tests covering the new logic, (b) updates to `verify-pack` scripts or fixtures if affected, and (c) updates to relevant documentation files. A PR that adds validators without corresponding tests or documentation will not be merged.

**Impact**: Reviewers will check for test and documentation coverage as a mandatory merge criterion.

### OC-3 — No new top-level CLI commands

v1.7.0 must not introduce any new top-level CLI commands. All new functionality must be surfaced through changes to the behavior of existing commands (`/qfai-discussion`, validate, verify-pack) or through new sub-options of existing commands. The CLI surface area is frozen for this release.

**Impact**: If new user-facing control is needed (e.g., forcing or suppressing UI-bearing classification), it must be implemented as a flag or configuration key on an existing command.

---

## Legal and Compliance Constraints

No legal or compliance constraints are specific to v1.7.0. QFAI is an open-source package with no data storage changes, no authentication changes, and no processing of personal data introduced in this release. Standard open-source licensing terms continue to apply.

---

## Budget

Not applicable. QFAI is an open-source package. There are no procurement or licensing costs associated with v1.7.0 development.

---

## Timeline

v1.7.0 is part of the v1.7.x release series. It establishes the foundational DDS structural enforcement that downstream releases in the series depend upon. Specifically:

- v1.7.1 and later releases have a sequential dependency on v1.7.0: they assume the DDS schema, UI-bearing detection mechanism, and competitive reference registry structure are stable and in place.
- Instability or scope changes in v1.7.0 will directly delay v1.7.1+.
- No hard calendar deadline is imposed, but the single-PR constraint (OC-1) means the release ships as a complete unit or not at all.
