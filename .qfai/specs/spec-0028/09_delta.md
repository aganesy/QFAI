# 09 Delta (Change Log)

- Spec: spec-0028
- Parent: CAP-0028

## Adopted Decisions

| Decision ID | Title                                           | Date       | Adopted Option                                                          | Rationale                                                                                                                                                   |
| ----------- | ----------------------------------------------- | ---------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-0001    | Static-first default for prototyping            | 2026-03-29 | Restore static-first as default; runtime obligations opt-in only        | Runtime-heavy default creates phase mismatch with prototyping intent and duplicates ATDD concerns; static-first keeps the default path lightweight and safe |
| DEC-0002    | Optional capability with status enum            | 2026-03-29 | Capture status enum: captured / skipped / failed; skipped when absent   | Explicit three-state enum avoids ambiguity between "not attempted" and "attempted but failed"; skipped is the safe default for undeclared capabilities      |
| DEC-0003    | Provider abstraction with optional registration | 2026-03-29 | Minimal provider registry interface; registration is optional           | Decouples browser backend selection from core logic; fail-open when no provider is registered preserves non-web project safety                              |
| DEC-0004    | Structured findings with repair suggestions     | 2026-03-29 | Typed finding schema with severity, location, phase, repairSuggestion   | Structured output enables downstream tooling (autofix, reporting, CI gating) without parsing prose; repair suggestions give actionable next steps           |
| DEC-0005    | Standard / low-cost / full-harness tier split   | 2026-03-29 | Three expectation tiers controlling which browser QA sub-phases execute | Allows teams to choose their cost/coverage tradeoff; standard (smoke-only) is the safe default that adds no browser dependency                              |

## Rejected Options

| Decision ID | Rejected Option                                 | Reason                                                                                                                                                                          | Recurrence Prevention                                                                                                                                                                                                                       |
| ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-0001    | Maintain runtime-heavy default obligations      | Runtime-heavy default in prototyping mode re-introduces the phase mismatch that CAP-0028 exists to fix; it also duplicates ATDD obligations, creating redundant failure signals | DO NOT: revert to runtime-heavy default obligations in prototyping. Temptation: "just add one more runtime check to default" seems harmless but re-introduces phase mismatch and ATDD duplication that was the root cause of CAP-0028.      |
| DEC-0002    | Binary present/absent without capture status    | Binary status loses the distinction between "not attempted" (skipped) and "attempted but broken" (failed), making diagnostics ambiguous and support harder                      | DO NOT: use boolean flags for evidence presence. Temptation: "true/false is simpler" — but it conflates two fundamentally different states (capability not declared vs. capability broken) that require different user actions.             |
| DEC-0003    | Browser availability as default hard dependency | Making browser installation a prerequisite for the default prototyping path breaks every non-web and non-visual project; it violates the fail-open principle                    | DO NOT: make browser installation a prerequisite for default prototyping path. Temptation: browser checks give richer validation, but they break non-web projects and force unnecessary dependency installation on CI environments.         |
| DEC-0003    | Playwright-fixed backend                        | Hard-coding Playwright as the only browser backend prevents future backend diversity (Puppeteer, headless Chrome, remote services) and couples core logic to a specific library | DO NOT: hard-code Playwright as the only browser backend. Temptation: Playwright is the most mature option, but fixing it prevents future backend diversity and creates a hard dependency that violates the provider abstraction principle. |
| DEC-0004    | Prose-only findings without structure           | Unstructured prose findings cannot be parsed by downstream tooling, making autofix, CI gating, and report aggregation unreliable or impossible                                  | DO NOT: emit browser QA findings as unstructured prose. Temptation: "free-text is more expressive" — but downstream consumers need machine-readable fields to act on findings programmatically.                                             |
| DEC-0005    | Single all-or-nothing browser QA tier           | A single tier forces teams into full browser QA or nothing; teams with cost constraints or non-visual projects have no middle ground                                            | DO NOT: require all-or-nothing browser QA execution. Temptation: "one tier is simpler to configure" — but it eliminates the cost/coverage tradeoff that different teams need.                                                               |

## Rejected Visual Directions

0 items -- spec-0028 does not include UI artifacts.

## Drift Events

0 items

## Change History

| Date       | Change Type | Files Affected             | Description                                                                                                                                                                  |
| ---------- | ----------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-29 | Initial     | 09, 10                     | spec-0028 initial SDD creation for CAP-0028 Runtime & Evidence Foundation                                                                                                    |
| 2026-03-30 | Remediation | 01,02,03,04,05,06,07,09,10 | spec-0028 v1.7.6 remediation: add US-0028-0006, AC-0028-0016..0021, BR-0028-0021..0026, EX-0028-0031..0036, TC-0028-0031..0036 for browser QA structured findings (REQ-0009) |
| 2026-03-30 | Convergence | 09, 10                     | v1.7.9 terminology and public contract alignment: artifact recommends / CLI decides / report records, with honest render/browser status vocabulary                           |
| 2026-03-31 | Completion  | 02,03,04,05,06,09          | v1.7.11 completion: add US-0028-0007, AC-0028-0022..0026, BR-0028-0027..0031, EX-0028-0037..0044, TC-0028-0037..0044 for real status model + actual runners (REQ-0013..0018, DR-0103, DR-0104) |
