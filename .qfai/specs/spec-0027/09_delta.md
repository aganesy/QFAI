# 09 Delta (Change Log)

- Spec: spec-0027
- Parent: CAP-0027

## Adopted Decisions

| Decision ID | Title                                   | Date       | Adopted Option                                              | Rationale                                                                                                                            |
| ----------- | --------------------------------------- | ---------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| DEC-001     | Sidecar validation default severity     | 2026-03-29 | Option B: Warning default + config flag                     | Balances immediate user feedback with non-breaking upgrade path; strict mode available via config for teams ready to enforce         |
| DEC-002     | Legacy sidecar migration strategy       | 2026-03-29 | Option B: Migration guidance only, no auto-refresh          | Avoids scope creep in v1.7.4; auto-refresh tooling deferred to a future release where it can be properly designed and tested         |
| DEC-003/005 | Validation rule ID naming convention    | 2026-03-29 | Option B: Semantic rule IDs (UIX-VAL-SIDECAR-MISSING style) | Semantic IDs are self-documenting, reduce need for lookup tables, and scale without collision risk as new rules are added            |
| DEC-004     | Strict mode configuration key           | 2026-03-29 | Option A: uiux.migration.strict boolean config key          | Boolean keeps configuration simple and discoverable; a single key under the existing uiux namespace avoids config fragmentation      |
| DEC-006     | Critical narrative field minimum length | 2026-03-29 | 20-char minimum for critical narrative fields               | Prevents trivially empty or placeholder content from passing validation while remaining lenient enough for concise but valid entries |
| DEC-007     | UI-bearing spec detection strategy      | 2026-03-30 | Explicit surface classification primary + fallback signals  | Aligns validator behavior with DR-0081 and prevents content heuristics from overriding declared surface intent                       |
| DEC-008     | Phase 1 exit criterion                  | 2026-03-29 | 30 days post-release or 1+ strict adoption                  | Provides a concrete, measurable gate that avoids indefinite Phase 1 status while allowing early exit on real-world adoption signal   |
| DEC-009     | Validator implementation order          | 2026-03-29 | 8-step dependency-ordered implementation                    | Dependency ordering ensures each validator can build on the outputs of its predecessors, reducing rework and integration risk        |
| DEC-010     | CHANGELOG test count correction         | 2026-03-29 | Correct count from 25 to 26                                 | Factual accuracy in release documentation; the extra test was confirmed present in the test suite                                    |

## Rejected Options

| Decision ID | Rejected Option                                            | Reason                                                                                                                                                                 | Recurrence Prevention                                                                                                                                                                                                             |
| ----------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-001     | (A) Immediate error in v1.7.4                              | Hard errors on upgrade break existing users who have not yet created sidecar files, causing CI failures with no graceful migration window                              | DO NOT: default to error severity for new validations in a minor release. Temptation: "errors enforce quality faster" — but they also break every existing project on upgrade.                                                    |
| DEC-001     | (C) Warning-only until v1.8                                | Deferring the strict option entirely removes user agency and delays adoption feedback; teams ready for enforcement would have no path                                  | DO NOT: withhold a strict-mode opt-in when the validation infrastructure already supports it. Temptation: "keep it simple, just warn" — but power users need the escape hatch now.                                                |
| DEC-002     | (A) Auto-refresh CLI in v1.7.4                             | Auto-refresh modifies user files without sufficient UX design, test coverage, or rollback strategy; high risk of data loss or corruption                               | DO NOT: ship file-mutating CLI commands without a dedicated design cycle and dry-run mode. Temptation: "auto-fix saves users time" — but silent file rewrites in a validation release are a trust violation.                      |
| DEC-003/005 | (A) Sequential UIX-VAL-001 numbering                       | Sequential IDs are opaque, require a registry to decode, and create merge conflicts when two contributors add rules concurrently                                       | DO NOT: use sequential numeric IDs for extensible rule sets. Temptation: "numbers are shorter and sort naturally" — but they convey no meaning and collide under parallel development.                                            |
| DEC-003/005 | (C) QFAI-UIX-001 prefix                                    | Adding the QFAI product prefix to every rule ID is redundant within the QFAI tool context and increases verbosity without disambiguation benefit                       | DO NOT: embed the product name in internal rule IDs. Temptation: "namespacing prevents future conflicts" — but within a single product the extra prefix is noise, not signal.                                                     |
| DEC-004     | (B) String severity value (e.g., "error"/"warn"/"off")     | Three-state string config adds parsing complexity, documentation burden, and ambiguous edge cases (e.g., typos, case sensitivity) for a feature that only needs on/off | DO NOT: use string enums where a boolean suffices. Temptation: "strings are more expressive" — but the third state (off) undermines the validation feature entirely.                                                              |
| DEC-004     | (C) Separate validators namespace                          | A separate top-level namespace fragments configuration, forces users to look in two places, and complicates config merging logic                                       | DO NOT: create new top-level config namespaces for features that belong under an existing section. Temptation: "separate namespace keeps validators independent" — but config discoverability matters more than module isolation. |
| DEC-006     | No minimum threshold (any non-empty passes)                | Allowing single-character or trivially short content (e.g., "x", "TBD") defeats the purpose of narrative validation and lets placeholder text pass                     | DO NOT: accept any non-empty string as valid narrative content. Temptation: "non-empty is good enough to start" — but placeholder values like "TODO" slip through and rot indefinitely.                                           |
| DEC-007     | Content signals as primary detection model                 | Declared surface intent would be overridden by heuristics, recreating doc/implementation drift and false positives/negatives                                           | DO NOT: let content signals override explicit surface classification. Temptation: "infer from content because it is already there" — but fallback heuristics are not the canonical SSOT.                                          |
| DEC-009     | Arbitrary implementation order without dependency tracking | Implementing validators in an arbitrary order risks building on incomplete foundations, causing integration failures and rework cycles                                 | DO NOT: implement interdependent validators without mapping and respecting their dependency graph. Temptation: "start with the easiest one first" — but ease of implementation does not equal correct sequencing.                 |

## Rejected Visual Directions

0 items — spec-0027 does not include UI artifacts.

## Drift Events

0 items

## Change History

| Date       | Change Type | Files Affected         | Description                                                                                                                                                |
| ---------- | ----------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-29 | Initial     | All 10 files           | spec-0027 initial SDD creation from discussion-20260329120000000                                                                                           |
| 2026-03-30 | Remediation | 01, 03, 04, 05, 06, 09 | UI-bearing detection updated to surface-primary / fallback-only model; strategy and screen-contract validator expectations aligned with master design spec |
| 2026-03-30 | Convergence | 09, 10                 | production validate path への canonical validator registration と truthful completion claim を v1.7.9 correction release に合わせて明記                    |
| 2026-03-31 | Enhancement | 01, 02, 03, 04, 05, 06 | v1.7.11 WS-F — canonical registration for UIX-VAL validators                                                                                              |

---

## Change Summary (DELTA-0027-003)

- Change ID: DELTA-0027-003
- Date: 2026-03-31
- Primary: v1.7.11 WS-F — canonical registration for UIX-VAL validators
- Tags: CAP-0027, v1.7.11, canonical-registration, validator-api
- Summary: v1.7.11 WS-F — canonical registration for UIX-VAL validators (US-0027-0007, AC-0027-0022, BR-0027-0028, EX-0027-0049..0050, TC-0027-0049..0050)

## Rationale (DELTA-0027-003)

- 全 UIX-VAL バリデータが canonical registration API を使用するように統一する
- DR-0101 に基づき、旧 registration path を廃止して single entrypoint に収束させる

## Candidates Considered (DELTA-0027-003)

1. All UIX-VAL validators use canonical registration API (adopted)
2. Maintain dual registration paths (rejected)

## Adopted (DELTA-0027-003)

- Adopted: All UIX-VAL validators use canonical registration API (DR-0101)
- Why: Single registration path により、バリデータの発見・管理・テストが統一され、保守コストが削減される

## Rejected (DELTA-0027-003)

- Candidate: Maintain dual registration paths
- Reason: 新旧両方の API で登録を許容すると、どちらが canonical か曖昧になり、バリデータの動作が不確定になる
- DO NOT: register validators through both old and new APIs
- Temptation: gradual migration

## Impact (DELTA-0027-003)

- Affects: packages/qfai/src/core/validators/ (UIX-VAL series), spec-0027/02〜06 (US-0027-0007, AC-0027-0022, BR-0027-0028, EX-0027-0049..0050, TC-0027-0049..0050)
- Validation: qfai validate --fail-on error must pass

## Follow-ups (DELTA-0027-003)

- 旧 registration path の deprecation warning 追加
- Owner: aganesy
- Due: v1.7.11 release
