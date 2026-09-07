# 10 Plan

- Spec: spec-0007
- Parent: CAP-0007

## Implementation approach

### Primary Source Files

| File                                           | Responsibility                                            |
| ---------------------------------------------- | --------------------------------------------------------- |
| `packages/qfai/src/cli/commands/guardrails.ts` | CLI entry point. runGuardrails() with action routing      |
| `packages/qfai/src/core/decisionGuardrails.ts` | Core engine: load, normalize, sort, filter, format, check |

### Key Functions (implemented)

| Function                              | Responsibility                                                          |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `runGuardrails()`                     | CLI orchestrator: validate action, load, dispatch to list/extract/check |
| `loadDecisionGuardrails()`            | Load guardrail entries from specified paths                             |
| `normalizeDecisionGuardrails()`       | Normalize entries for consistent processing                             |
| `sortDecisionGuardrails()`            | Sort entries by ID/source                                               |
| `filterDecisionGuardrailsByKeyword()` | Keyword-based case-insensitive filtering                                |
| `formatGuardrailsForLlm()`            | Format entries for LLM consumption (extract)                            |
| `formatGuardrailsList()`              | Format entries as Markdown list (list)                                  |
| `checkDecisionGuardrails()`           | Check entries for consistency, return errors/warnings                   |

## Test approach

| Layer       | Where                                                        | What it proves                                                                 |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| unit        | `packages/qfai/tests/core/decisionGuardrails.test.ts`        | Load, normalize, sort, keyword filter, and the two formatters                  |
| cli         | `packages/qfai/tests/cli/guardrails.test.ts`                 | Action routing (`list` / `extract` / `check`) and rejection of unknown actions |
| integration | `packages/qfai/tests/integration/guardrailsSpec0007.test.ts` | The engine over a real `_policies` / specs tree                                |
| e2e         | `packages/qfai/tests/e2e/phraseGuardrails.test.ts`           | Guardrail phrases surviving the whole pipeline rather than the unit boundary   |

The case that must not be shared is `check`: it returns errors and warnings in
the same `Issue` shape `validate` uses, so a single assertion on "some issue was
returned" passes for either severity. Error and warning need separate cases.

## Dependencies

| Dependency           | Content                                                   |
| -------------------- | --------------------------------------------------------- |
| spec-0003 (init)     | init creates \_policies/ and specs/ that guardrails scans |
| spec-0004 (validate) | guardrails check shares Issue format with validate        |

## Implementation Order

All functionality is already implemented. This spec documents existing behavior.

## Risk mitigation

| Risk                                                                                                                        | Likelihood / impact | Mitigation                                                                                                                       | Trigger to act                                                |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `check` shares the `Issue` shape with `validate`, so a test asserting "an issue was returned" passes for the wrong severity | med / med           | Error and warning have separate cases (see Test approach); the shared shape is an interoperability decision, not a test shortcut | A single case is proposed to cover both severities            |
| Keyword filtering is case-insensitive, so a guardrail is matched by a substring of an unrelated word                        | low / med           | `filterDecisionGuardrailsByKeyword()` is unit-covered with a near-miss term rather than only a hit                               | A filter change lands with only positive cases                |
| `extract` output is consumed by an LLM, so a format change silently degrades a downstream prompt                            | med / med           | `formatGuardrailsForLlm()` is a named function with its own cases, so the format is a fixture rather than an incidental string   | The extract format changes without a fixture update           |
| This file documents shipped behavior and drifts as the implementation moves                                                 | med / med           | The function table names real symbols, so a rename breaks a reader's search rather than reading as still-true prose              | A function named in the table no longer resolves under `src/` |
