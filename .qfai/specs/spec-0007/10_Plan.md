# 10 Plan

- Spec: spec-0007
- Parent: CAP-0007

## 1. Implementation Strategy

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

## 2. Dependencies

| Dependency           | Content                                                   |
| -------------------- | --------------------------------------------------------- |
| spec-0003 (init)     | init creates \_policies/ and specs/ that guardrails scans |
| spec-0004 (validate) | guardrails check shares Issue format with validate        |

## 3. Implementation Order

All functionality is already implemented. This spec documents existing behavior.
