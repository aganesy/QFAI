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

### Story-tree layout

This spec introduces no architectural element. At P7 the guardrail loader
changes where it looks, and nothing else about it changes.

- **Where.** With no `--paths`, `loadDecisionGuardrails` in
  `packages/qfai/src/core/decisionGuardrails.ts` scans the Markdown under
  `<paths.specsDir>/01_policy/` and under `<paths.contractsDir>/`, both
  resolved through `config.ts#resolvePath`. That replaces the literal default
  glob `.qfai/specs/**/18_delta.md` (BR-0007-0001, EX-0007-0012,
  TC-0007-0012).
- **Who passes the directories.** The loader has three callers:
  `packages/qfai/src/cli/commands/guardrails.ts`, which passes no directory
  today and so falls back to the literal glob, and `core/doctor.ts` and
  `core/report.ts`, which pass `specsRoot`. At P7 each passes both resolved
  directories through the options object the loader already takes, so the
  doctor guardrail check and the report's guardrail section read the same
  files as `qfai guardrails`.
- **What is not changed.** The entry grammar stays the one the parser reads
  today: `DG-NNNN` entries under a "Decision Guardrails" heading. BR-0007-0001
  speaks of RFC 2119 keywords instead, and which grammar the story tree uses is
  OQ-0180, due before the P7 cutover. Keeping the scan roots apart from the
  parser means an answer to OQ-0180 changes the parser alone.

Alternative considered: settle the grammar in this change. Rejected by ruling
G3 C1; the mismatch predates the story tree and is deferred as OQ-0180.

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

### Story-tree layout

TC-0007-0012 is an L3 integration case in
`packages/qfai/tests/integration/guardrailsSpec0007.test.ts`. It lays out a
story tree in a `mkdtemp` directory with one guardrail entry in a Markdown file
under `<paths.specsDir>/01_policy/` and one under `<paths.contractsDir>/`,
then runs `runGuardrails` with `list` and no `--paths`.

The case asserts one entry from each directory, each with its source file. An
assertion on the count alone would pass on an empty listing, which is what a
reader scanning the wrong directory returns.

## Dependencies

| Dependency           | Content                                                   |
| -------------------- | --------------------------------------------------------- |
| spec-0003 (init)     | init creates \_policies/ and specs/ that guardrails scans |
| spec-0004 (validate) | guardrails check shares Issue format with validate        |

## Implementation Order

All functionality is already implemented. This spec documents existing behavior.

## NFR approach

How this spec meets its floors on the story-tree layout, and what shows a breach:

- **NFR-0040 (message quality).** Every listed guardrail names the file and
  line it came from, so a reader can find it in the story tree. Breach:
  TC-0007-0012 finds an entry without its source file.

## Risk mitigation

| Risk                                                                                                                        | Likelihood / impact | Mitigation                                                                                                                       | Trigger to act                                                |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `check` shares the `Issue` shape with `validate`, so a test asserting "an issue was returned" passes for the wrong severity | med / med           | Error and warning have separate cases (see Test approach); the shared shape is an interoperability decision, not a test shortcut | A single case is proposed to cover both severities            |
| Keyword filtering is case-insensitive, so a guardrail is matched by a substring of an unrelated word                        | low / med           | `filterDecisionGuardrailsByKeyword()` is unit-covered with a near-miss term rather than only a hit                               | A filter change lands with only positive cases                |
| `extract` output is consumed by an LLM, so a format change silently degrades a downstream prompt                            | med / med           | `formatGuardrailsForLlm()` is a named function with its own cases, so the format is a fixture rather than an incidental string   | The extract format changes without a fixture update           |
| This file documents shipped behavior and drifts as the implementation moves                                                 | med / med           | The function table names real symbols, so a rename breaks a reader's search rather than reading as still-true prose              | A function named in the table no longer resolves under `src/` |

### Story-tree layout

| Risk                                                                                                                                                                             | Likelihood / impact | Mitigation                                                                                                                      | Trigger to act                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| The policy and contract files carry no block the parser reads, so `qfai guardrails list` on a migrated project prints `- (none)` and every case built on an empty listing passes | high / med          | TC-0007-0012 asserts one entry per directory, each with its source file                                                         | TC-0007-0012 passes on a fixture with no guardrail entry, or OQ-0180 is still open when the P7 commit lands |
| OQ-0180 is answered with the RFC 2119 grammar after the P7 scan roots land, and the reader has to change again                                                                   | med / low           | The P7 change touches the scan roots only, so the answer rewrites the parser and TC-0007-0012's fixture, not the file discovery | OQ-0180 is answered with a grammar other than `DG-NNNN`                                                     |
