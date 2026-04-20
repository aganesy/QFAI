# 99_delta

## Change Log

### Initial Creation

| Change-ID | Date       | Change Type     | Description                                                                                                  | Affected Files                                                     | Decision Basis                                                                        |
| --------- | ---------- | --------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| CHG-001   | 2026-03-28 | Creation        | Initial discussion pack generated from deep research report (SRC-0001) on CLI agent web research enhancement | All 15 files                                                       | Input report analysis + QFAI v1.8.0 scope definition                                  |
| CHG-002   | 2026-03-28 | Scope Decision  | Apify MCP deferred to post-v1.8.0 due to SSE transport deprecation (2026-04-01)                              | 05_Scope.md (OOS-007), 11_OQ-Register.md (OQ-0003), 13_Deferred.md | Risk: integration instability during transport migration                              |
| CHG-003   | 2026-03-28 | Scope Decision  | Jina AI MCP deferred to v1.9.0 — RAG infrastructure out of scope                                             | 11_OQ-Register.md (OQ-0009), 13_Deferred.md                        | Dependency: requires RAG infra (OOS-004)                                              |
| CHG-004   | 2026-03-28 | Scope Decision  | OTel integration deferred to v1.9.0 — structured log schema as v1.8.0 baseline                               | 11_OQ-Register.md (OQ-0010), 13_Deferred.md                        | Cross-agent compatibility gap                                                         |
| CHG-005   | 2026-03-28 | Design Decision | Moderate sanitization scope selected (control chars + DOM hidden elements)                                   | 11_OQ-Register.md (OQ-0004), 06_REQ.md (REQ-0005)                  | Balances coverage vs implementation complexity; aligns with Copilot CLI filterMapping |
| CHG-006   | 2026-03-28 | Design Decision | Tool-agnostic evaluation metrics — QFAI defines metrics, not mandates tools                                  | 11_OQ-Register.md (OQ-0005), 06_REQ.md (REQ-0011, REQ-0012)        | Avoids vendor lock-in in evaluation infrastructure                                    |
| CHG-007   | 2026-03-28 | Design Decision | Conservative sub-agent defaults (max_threads=2, max_depth=2)                                                 | 11_OQ-Register.md (OQ-0006), 06_REQ.md (REQ-0009)                  | Cost control: prevents uncontrolled API call multiplication                           |
| CHG-008   | 2026-03-28 | Design Decision | Risk-based HITL gates (auto-approve low-risk, gate high-risk)                                                | 11_OQ-Register.md (OQ-0008), 06_REQ.md (REQ-0013)                  | Usability: per-fetch approval is impractical for developers                           |

## Rejected Options

| Reject-ID | Related OQ/CHG | Rejected Option                                            | Rejection Reason                                                             | Recurrence Prevention                                                |
| --------- | -------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| REJ-001   | OQ-0001        | Google Custom Search JSON API as search backend            | API unavailable to new customers; migration deadline 2027-01-01              | Document in CON-L003; monitor SRC-0017 for updates                   |
| REJ-002   | OQ-0003        | Apify MCP inclusion in v1.8.0                              | SSE transport deprecated 2026-04-01; integration instability                 | Re-evaluate when streamable HTTP is stable (SRC-0013)                |
| REJ-003   | OQ-0004        | Comprehensive ML-based injection detection                 | Excessive complexity for v1.8.0; moderate scope sufficient for known vectors | Re-evaluate if new attack vectors emerge beyond OWASP baseline       |
| REJ-004   | OQ-0006        | Aggressive sub-agent defaults (max_threads=5, max_depth=5) | Cost explosion risk from parallel API calls                                  | Default remains conservative; advanced users can override explicitly |
| REJ-005   | OQ-0008        | Per-fetch HITL approval                                    | Impractical UX — developers would disable gates entirely                     | Risk-based approach preserves both safety and usability              |
