# 13_Deferred

## Deferred Items

| OQ-ID | Title | Gate | Deferred-Reason | Deferred-Until | Owner | Due | Severity | Impact | Mitigation | Evidence |
|-------|-------|------|-----------------|----------------|-------|-----|----------|--------|------------|----------|
| OQ-0009 | Jina AI MCP inclusion | discussion | RAG infrastructure (vector DB, embedding stores) is explicitly out of scope for v1.8.0 (OOS-004). Jina AI MCP's value is primarily in RAG pre-processing, which requires the broader RAG infra to be useful. | v1.9.0 planning phase | agent | v1.9.0 | low | specs — no spec impact in v1.8.0; implementation — no code changes needed | Document Jina AI MCP as a future enhancement candidate in v1.9.0 planning notes | SRC-0014, OOS-004 |
| OQ-0010 | OTel integration depth | discussion | OTel native support varies significantly across CLI agents (Copilot CLI has native support, others do not). Mandating OTel in v1.8.0 would create agent-specific implementation complexity. Structured log schema provides universal baseline. | v1.9.0 planning phase | agent | v1.9.0 | medium | specs — NFR-0009 satisfied by structured logs; implementation — OTel wrapper code deferred; operations — monitoring limited to log analysis | Define structured research log schema (REQ-0010) as the v1.8.0 baseline. Document OTel as enhancement path for agents that support it natively. | NFR-0009, SRC-0001 |
