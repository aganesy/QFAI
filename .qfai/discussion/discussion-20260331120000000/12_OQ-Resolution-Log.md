# OQ Resolution Log

Append-only timeline of OQ dispositions for discussion pack `discussion-20260331120000000`.

---

### OQ-0001 — Old aggregator removal vs compatibility wrapper

- **Date:** 2026-03-31
- **Action:** resolved
- **Summary:** Adopted option (b) compatibility wrapper with deprecation. Complete removal (option a) risks breaking existing consumers; side-by-side indefinitely (option c) creates maintenance burden. The wrapper provides a clean migration path while preserving backward compatibility during the deprecation window.

---

### OQ-0002 — 4-axis template handling

- **Date:** 2026-03-31
- **Action:** resolved
- **Summary:** Adopted option (b) deprecation marking plus removal from defaults. Immediate deletion (option a) risks losing reference material; keeping as-is (option c) perpetuates an outdated model. Deprecation marking preserves historical reference while signaling the transition to the 3-layer model.

---

### OQ-0003 — Render evidence "requested" status

- **Date:** 2026-03-31
- **Action:** resolved
- **Summary:** Adopted option (b) removing "requested" and using only captured/skipped/failed. The "requested" status (option a) created ambiguity between intention and execution. Adding a "pending" status (option c) would further complicate the state machine. The three remaining states provide clear, unambiguous evidence tracking.

---

### OQ-0004 — Browser QA phase runner scope

- **Date:** 2026-03-31
- **Action:** resolved
- **Summary:** Adopted option (a) implementing all 4 browser QA phases (smoke, visual, interaction, accessibility). Partial implementation (option b) or foundation-only (option c) would result in dishonest reporting where phases appear available but produce no meaningful results. Full implementation ensures every reported phase reflects actual test execution.

---

### OQ-0005 — v1.7.10 skip

- **Date:** 2026-03-31
- **Action:** resolved
- **Summary:** Adopted option (b) skipping directly to v1.7.11. v1.7.10 was never released, and inserting it retroactively (option a) would create confusion in the version timeline. v1.7.11 follows v1.7.9 as the completion release that converges outstanding work.

---

### OQ-0006 — Reviewer asset routing sync with taste/trend/3-layer

- **Date:** 2026-03-31
- **Action:** deferred
- **Summary:** Deferred to v1.7.12 planning. The enhancement is desirable but not release-blocking per spec SS9.2. Existing reviewer routing remains functional. Decision point at v1.7.12 planning.

---

### OQ-0007 — Critique loop wording sync with full-harness phases

- **Date:** 2026-03-31
- **Action:** deferred
- **Summary:** Deferred to v1.7.12 planning. Minor wording inconsistency is not release-blocking per spec SS9.2. Existing wording is functional and does not impede user workflows. Decision point at v1.7.12 planning.

---

### OQ-0008 — Migration docs 4-axis to 3-layer conversion examples

- **Date:** 2026-03-31
- **Action:** deferred
- **Summary:** Deferred to v1.7.12 planning. Conversion examples are desirable for users migrating from 4-axis, but the migration validator already provides guidance. Not release-blocking per spec SS9.2. Decision point at v1.7.12 planning.
