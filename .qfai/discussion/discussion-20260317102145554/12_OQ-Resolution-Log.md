# OQ Resolution Log

## Timeline

### 2026-03-17 — Initial Discussion

- **OQ-0001** (Should old skills be deprecated or removed?): **Resolved** — Remove completely. Clean break prevents confusion. Per SRC-0001 §2.2.
- **OQ-0002** (Where should test-list.md live?): **Resolved** — Under spec directory (`spec-XXXX/tdd/test-list.md`). Co-location with spec artifacts. Per SRC-0001 §5.1.
- **OQ-0003** (How strict should Phase 1 validator be?): **Resolved** — Phase 1 structural only. Content validation deferred to v1.6.1. Per SRC-0001 §6.
- **OQ-0004** (Should sub-agent roster be formalized?): **Deferred** to v1.6.2. Skill body description sufficient for now. Per SRC-0001 §7.
- **OQ-0005** (Should parallel execution be allowed?): **Resolved** — Serial default with independent-slice exception. Per SRC-0001 §8.
- **OQ-0006** (TC coverage hardening scope): **Deferred** to v1.6.1. Not needed for structural migration. Per SRC-0001 §6.3.
- **OQ-0007** (Exception DR-ID enforcement): **Deferred** to v1.6.1. Requires decision record infrastructure. Per SRC-0001 §6.3.
