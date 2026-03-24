# 04_Sources

## Source Registry

| SRC-ID   | Title                                                                         | Type        | Location                                                                               | Retrieved  | Notes                                                                                                              |
| -------- | ----------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| SRC-0001 | qfai_v1.7x_roadmap_overview.md                                                | primary     | `.qfai/specs/roadmap/qfai_v1.7x_roadmap_overview.md`                                  | 2026-03-25 | Roadmap document defining v1.7.0 objectives, deliverables, and design decisions for Discussion Design Hardening   |
| SRC-0002 | QFAI v1.6.5 codebase — existing discussion validators                         | primary     | `packages/qfai/src/core/validators/`                                                   | 2026-03-25 | QFAI-DDP-001..018, QFAI-DPACK-001..010, QFAI-VIS-001..002; baseline validator set that v1.7.0 extends            |
| SRC-0003 | QFAI v1.6.5 codebase — discussionPack.ts, ddpValidation.ts, discussionVisuals.ts | primary  | `packages/qfai/src/core/validators/discussionPack.ts`, `ddpValidation.ts`, `discussionVisuals.ts` | 2026-03-25 | Core validator implementations; UI-bearing detection logic and competitive ref validation already partially in place |
| SRC-0004 | QFAI operating principles — minimal tools, maximal consistency                | primary     | `.qfai/assistant/instructions/constitution.md`                                         | 2026-03-25 | Guiding principles: no external dependencies, structural validation only, consistent enforcement                   |
| SRC-0005 | User design decision session 2026-03-25                                       | primary     | Current conversation thread (interview results)                                        | 2026-03-25 | Authoritative source for all design decisions: UI-bearing only gate, error severity for all new structural checks, DDS in 03_Story-Workshop.md, mandatory competitive ref fields |
| SRC-0006 | QFAI v1.5 discussion unification design                                       | secondary   | `.qfai/discussion/discussion-20260315080059347/`                                       | 2026-03-25 | Prior discussion unification work; context for 15-file pack structure and validator integration patterns           |
| SRC-0007 | review-roster.yml                                                             | primary     | `.qfai/assistant/steering/review-roster.yml`                                           | 2026-03-25 | Reviewer gate definitions; determines which roles review UI-bearing structural checks in v1.7.0                    |

## Source Types

- **primary**: Directly authoritative — decisions, code, or configuration that drives requirements
- **secondary**: Contextual — prior art, design history, or supplemental reference material
- **conversation**: Interview result captured in the current discussion thread

## Traceability

| SRC-ID   | Drives REQs                                              | Drives NFRs                  |
| -------- | -------------------------------------------------------- | ---------------------------- |
| SRC-0001 | REQ-0001..REQ-0014                                       | NFR-0001..NFR-0005           |
| SRC-0002 | REQ-0001, REQ-0003, REQ-0004, REQ-0005, REQ-0009        | NFR-0001, NFR-0002, NFR-0004 |
| SRC-0003 | REQ-0001, REQ-0003, REQ-0004, REQ-0005, REQ-0009        | NFR-0001, NFR-0002, NFR-0004 |
| SRC-0004 | REQ-0009, REQ-0012, REQ-0013, REQ-0014                  | NFR-0002, NFR-0003, NFR-0005 |
| SRC-0005 | REQ-0001..REQ-0014                                       | NFR-0001..NFR-0005           |
| SRC-0006 | REQ-0001, REQ-0013                                       | NFR-0002                     |
| SRC-0007 | REQ-0010, REQ-0011                                       | NFR-0005                     |

## Competitive Reference Registry (UI-bearing packs)

For UI-bearing discussion packs, each competitive reference must include the following mandatory fields. These fields are validated by QFAI-DDP-021 at error severity.

| SRC-ID   | Competitor / Reference | adopted_points | rejected_points | local_translation |
| -------- | ---------------------- | -------------- | --------------- | ----------------- |
| SRC-0008 | Linear (landing page narrative) | Progressive disclosure layout; editorial split with hero illustration offset; single-CTA dominance | Full-width hero with vague tagline; dark-mode-first as default | Adopt editorial split for DDS documentation view; translate CTA prominence to amber pill in nav-right position |
| SRC-0009 | Stripe (developer docs) | Structured sidebar + content pane; code-first examples with inline explanation; clean typography hierarchy | Card-heavy marketing sections; multi-color accent system | Adopt sidebar navigation pattern for 15-file pack browsing; translate code-first layout to validator-result-first presentation |
| SRC-0010 | Vercel (dashboard) | Minimal chrome; high information density without clutter; status-first display pattern | Modal-heavy workflows; dark theme as only option | Adopt status-first pattern for validation report display; translate minimal chrome principle to pack detail view |

### Field Definitions

- **adopted_points**: Design elements, patterns, or approaches from the reference that will be adopted in this project. Must include at least one concrete pattern.
- **rejected_points**: Design elements, patterns, or approaches from the reference that were considered but explicitly rejected. Must include the reason for rejection.
- **local_translation**: How adopted points are translated to the local project context, accounting for constraints, target users, and technical limitations.

### Validation Rules

- UI-bearing packs must have at least 3 competitive references with all 3 fields populated (configurable via `uiux.competitive_refs_min`, default: 3).
- Empty or placeholder values in any of the 3 fields trigger QFAI-DDP-021 as error.
- `source_url` and `relevance_score` are optional and not validated.

## Traceability Rules

- All REQ and NFR entries must reference at least one SRC-ID in their Source column
- Multiple sources are cited as comma-separated SRC-IDs (e.g., SRC-0001, SRC-0005)
- SRC-0005 (user design decision session) is authoritative for all priority and severity decisions
- Competitive references (SRC-0008+) drive REQ-0005 and are cross-referenced from 03_Story-Workshop.md DDS section
