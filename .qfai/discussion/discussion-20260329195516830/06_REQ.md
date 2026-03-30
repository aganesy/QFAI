# 06 REQ (Functional Requirements)

## Requirements Table

| REQ-ID   | Title                             | Description                                                                                                                                                      | Source                       | Priority | Status |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- | ------ |
| REQ-0001 | Static-first prototyping default  | Rewrite qfai-prototyping skill contract to make default completion static-first; runtime-heavy validation must be opt-in                                         | SRC-0001, SRC-0003           | must     | draft  |
| REQ-0002 | Full-harness dedicated entrypoint | Create dedicated skill and CLI entrypoint for /qfai-prototyping-full-harness with explicit evidence/reviewer policy                                              | SRC-0001, SRC-0005           | must     | draft  |
| REQ-0003 | Prototyping mode definitions      | Define low-cost, standard, full-harness modes explicitly in skill contract with completion criteria per mode                                                     | SRC-0001, SRC-0003           | must     | draft  |
| REQ-0004 | 3-layer evaluation reconciliation | Converge evaluation architecture to 3-layer model (invariant, trend-derived, product-specific) or formally document alternative                                  | SRC-0001, SRC-0004           | must     | draft  |
| REQ-0005 | Strategy artifact upgrade         | Upgrade UI/UX Implementation Strategy to include selection_required, candidate_options, chosen_option, verification_expectations, and none-as-legitimate-outcome | SRC-0001, SRC-0004           | must     | draft  |
| REQ-0006 | Screen contract schema upgrade    | Refactor screen contract to include route/screen identity, actor, purpose, primary tasks, required states, transitions, observable outcomes                      | SRC-0001, SRC-0004           | must     | draft  |
| REQ-0007 | UI-bearing detection unification  | Enforce explicit surface classification as primary SSOT; content signals as fallback heuristics only                                                             | SRC-0001, SRC-0006           | must     | draft  |
| REQ-0008 | Render evidence end-to-end        | Wire internal render evidence implementation through to CLI/skill flow or downgrade public claim                                                                 | SRC-0001, SRC-0008, SRC-0009 | must     | draft  |
| REQ-0009 | Browser QA structured findings    | Implement actual phase execution and structured findings in browser QA runner                                                                                    | SRC-0001, SRC-0007           | must     | draft  |
| REQ-0010 | CLI mode exposure                 | Add explicit mode flags (low-cost/standard/full-harness) to CLI command surface with per-mode evidence/reviewer expectations                                     | SRC-0001, SRC-0005           | must     | draft  |
| REQ-0011 | Repo state normalization          | Normalize changelog, steering docs, source comments, and deferred markers for v1.7.6 consistency                                                                 | SRC-0001, SRC-0010           | should   | draft  |
| REQ-0012 | Internal module workflow docs     | Add usage docs, entrypoint docs, mode relationship docs, and failure behavior docs for critique, calibration, observability, handoff, detection modules          | SRC-0001, SRC-0002           | should   | draft  |
| REQ-0013 | Migration and upgrade support     | Implement stale asset detection, upgrade guidance, compatibility messaging, and explicit migration path                                                          | SRC-0001, SRC-0010           | should   | draft  |

## Priority Legend

- `must`: Required for MVP / first release.
- `should`: Important but deferrable.
- `could`: Nice-to-have.
- `wont`: Explicitly excluded from current scope.

## Rules

- Each REQ must have at least one Source (SRC-ID) reference.
- Status: `draft` → `reviewed` → `approved`.
