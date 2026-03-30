# 05 Scope

## In Scope

### Workstream A: Discussion Canonical

- Remove legacy 4-axis completion conditions from qfai-discussion SKILL.md.
- Add canonical 3-layer completion conditions for the UI-bearing path.
- Maintain non-ui path exemption from UI-bearing conditions.

### Workstream B: Template Replacement

- Add 6 new canonical template files to templates/uiux/ for 3-layer UI/UX family.
- Update 00_index.md to reference the canonical family.
- Deprecate old 4-axis family files with explicit marking.

### Workstream C: Sources Schema

- Complete 04_Sources.md Trend Scan schema with freshness, confidence, and translation fields.

### Workstream D: Strategy Strong Schema

- Implement strong YAML schema for 10_strategy.md with decision/options/rationale structure.

### Workstream E: Contracts Strong Schema

- Implement strong YAML schema for 40_contracts.md with per-screen objects.

### Workstream F: Validator Truth-Path

- Create runCanonicalUixValidators() entrypoint.
- Wire canonical entrypoint into validateProject().
- Demote or remove old runAllUixValidators() aggregator.

### Workstream G: Render Evidence

- Remove "requested" status from render evidence path.
- Implement captured/skipped/failed real status model.
- Ensure captured status requires actual capture execution.

### Workstream H: Browser QA

- Wire actual phase runners into runBrowserQa().
- Enforce honest empty findings (only when truly nothing found).
- Remove foundation-only comments.

### Workstream I: Prototyping Contracts

- Align prototyping/full-harness wording with actual behavior.
- Ensure standard to full-harness routing conditions are consistent.

### Workstream J: Docs/Tests Normalization

- Normalize maturity claims in steering, changelog, and release notes.
- Update test fixtures to canonical 3-layer expectations.
- Add validateProject() integration tests for canonical path.

## Out of Scope (Anti-Goals)

- **New feature addition**: No new user-facing features are introduced in this release.
- **Architecture re-discussion**: The 3-layer architecture is settled; this release implements it, not debates it.
- **Full-harness default activation**: full-harness remains opt-in; no change to default routing.
- **Reviewer science advancement**: No improvements to review scoring or review heuristics.
- **Recurrence prevention system implementation**: Systemic recurrence prevention tooling is deferred to a future release.

## Constraints

- Technical constraints: All changes must maintain backward compatibility with existing discussion packs generated under v1.7.9.
- Operational constraints: Changes must not require users to re-run init on existing projects.
- Testing constraints: Old/new test split must be resolved; all tests must pass on a single canonical path.

## Success Criteria

| Criterion | Measurement                                                                | Target                                    | Priority |
| --------- | -------------------------------------------------------------------------- | ----------------------------------------- | -------- |
| SC-001    | qfai-discussion completion criteria teaches canonical 3-layer architecture | SKILL.md references 3-layer model         | must     |
| SC-002    | init/packaged assets generate 3-layer UI/UX family                         | 6 canonical templates present and indexed | must     |
| SC-003    | validateProject() calls canonical validator entrypoint                     | runCanonicalUixValidators() wired         | must     |
| SC-004    | 10_strategy.md and 40_contracts.md have strong schema                      | YAML schema validation passes             | must     |
| SC-005    | 04_Sources.md has trend source translation schema                          | freshness/confidence/translation fields   | must     |
| SC-006    | Render evidence uses captured/skipped/failed real path                     | No "requested" status in evidence output  | must     |
| SC-007    | Browser QA returns actual findings                                         | Honest empty findings only when true      | must     |
| SC-008    | Docs/steering/changelog are consistent                                     | Maturity claims normalized across files   | should   |
| SC-009    | Tests pass with old/new split resolved                                     | All tests green on canonical path         | must     |

## Phasing

### Phase 1: Truth-Path Blockers (Workstreams A, B, D, F)

Foundation layer. These workstreams establish the canonical truth-path that all subsequent phases depend on. Discussion skill conditions, template family, strategy schema, and validator entrypoint must be in place first.

### Phase 2: Runtime (Workstreams G, H, I)

Runtime behavior layer. With the truth-path established, render evidence, browser QA, and prototyping contracts can be aligned to produce honest, real outputs.

### Phase 3: Normalization (Workstream J)

Cleanup layer. Documentation, steering, changelog, and test normalization. Also includes Workstreams C and E which are schema completions that do not block runtime.

## Assumptions

- The canonical 3-layer architecture as defined in SRC-0001 is the accepted target model.
- v1.7.9 convergence work is complete and merged; this release addresses only remaining gaps.
- No external dependency updates are required for this release.
