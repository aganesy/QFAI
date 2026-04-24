# 08 Open Questions

## Purpose

Questions left intentionally open. Blocking questions MUST be resolved before Phase 4+ implementation can close.

## Questions

| OQ-ID         | Title                                             | Blocking? | Notes                                                                                                                                           |
| ------------- | ------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-0017-0001  | Playwright CLI binary discovery                   | No        | Whether `qfai prototyping prepare` should verify the `playwright-cli` binary is installed, or delegate that to the AI evaluator sub-agent. Default: delegate. |
| OQ-0017-0002  | Auth / cookie bootstrap for protected screens     | No        | Out of scope for v1.8.3. Evaluator may set up auth before running the command plan. Future work: a `prototyping.setup` hook.                    |
| OQ-0017-0003  | Multi-viewport capture (desktop vs mobile)        | No        | v1.8.3 captures one viewport per cycle. Multi-viewport deferred to a later spec.                                                                |
| OQ-0017-0004  | Evaluator review JSON schema strictness           | No        | v1.8.3 requires presence of `scores[]` with `{axisId, score, rationale, evidenceRefs}`. Additional fields allowed.                              |
| OQ-0017-0005  | Plugin path for MCP reintroduction                | No        | Future work. Not in v1.8.3 scope per DEC-0017-0002.                                                                                             |
| OQ-0017-0006  | Lighthouse re-integration                         | No        | Deferred per DEC-0017-0007.                                                                                                                     |
