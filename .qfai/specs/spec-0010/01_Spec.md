# 01 Spec

- Spec: spec-0010
- Parent: CAP-0010

## Consumer View

- Primary SSOT for execution: `spec-0010/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In:
  - `/qfai-discussion` unified discuss + require workflow
  - 15-file discussion pack generation (`01_Context.md` .. `14_Review-Request.md`, `99_delta.md`)
  - Core interview process (product concept, scope, stakeholders, constraints)
  - Inception Deck (10 questions, Mermaid diagram required)
  - Story Workshop (user stories, user flows, Mermaid diagram, HTML+CSS screen mock for UI)
  - Example Mapping with 6 mandatory perspectives (happy, negative, edge, permission, state transition, idempotency)
  - Source traceability (`SRC-XXXX` in `04_Sources.md`)
  - Requirements capture (REQ-0001 in `06_REQ.md`, NFR-0001 in `07_NFR.md`)
  - OQ Register with mandatory 11-column data model and OQ-driven exit (zero open count)
  - Deferred metadata with mandatory 11-column data model
  - Design Direction Pack (DDP) for UI-bearing projects
  - UI-bearing detection and 11-file uiux/ sidecar generation
  - Competitive Reference Registry with adopted/rejected/local_translation fields
  - Review Cycle Protocol (RCP) with 12-reviewer roster (10 standard + devils-advocate + pattern-doubler)
  - Drift Protocol enforcement
- Out:
  - Editing `.qfai/specs/**` directly (belongs to `/qfai-sdd`)
  - Writing implementation-level details
  - Leaving open blockers hidden in free text

## Applicable NFR

- NFR-0001: OQ completeness -- `Disposition: open` count is zero at completion
- NFR-0002: Pack completeness -- all 15 mandatory files exist and are populated
- NFR-0003: Diagram requirement -- `02_Inception-Deck.md` and `03_Story-Workshop.md` each include at least one Mermaid diagram
- NFR-0004: Example Mapping coverage -- 6 perspectives per BR/AC candidate
- NFR-0005: DDP completeness -- UI-bearing packs include Design Direction Summary with all 6 subsections
- NFR-0006: Competitive references -- 3+ references with adopted/rejected/local_translation fields (UI-bearing only)

## Applicable Policy

- Policy: Drift Protocol mandatory
- Discussion artifacts are logs/rationale and must not duplicate spec SSOT
- Reviewer routing is fixed by `agent-routing.yml` and `review-profiles.yml`

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md`
- Consolidates: old spec-0019 (DDP), spec-0020 (Navigation), spec-0021 (Render Critique), spec-0022 (Fidelity), spec-0025 (Design Audit)

## Relevant Requirements

- REQ-0001: Unified discussion workflow -- merge discuss and require into single 15-file pack with OQ-driven exit
- REQ-0002: Core interview -- product concept, scope, stakeholders, constraints capture
- REQ-0003: Inception Deck -- 10-question ambiguity removal with Mermaid diagram
- REQ-0004: Story Workshop -- user stories, flows, Mermaid diagram, HTML+CSS mock for UI
- REQ-0005: Example Mapping -- 6 perspectives per BR/AC candidate with seed capture
- REQ-0006: OQ Register -- 11-column data model, OQ-driven exit (zero open count)
- REQ-0007: Deferred metadata -- 11-column data model with severity, impact, mitigation
- REQ-0008: DDP authoring -- Design Direction Pack for UI-bearing projects (theme, mood, CTA hierarchy, anti-goals)
- REQ-0009: UI-bearing detection -- surface type classification (web-ui, mobile-ui, desktop-ui, mixed, non-ui)
- REQ-0010: uiux/ sidecar generation -- 11-file sidecar for UI-bearing packs
- REQ-0011: Competitive Reference Registry -- 3+ references with adopt/reject/translation fields
- REQ-0012: RCP execution -- 12-reviewer roster (10 standard + devils-advocate + pattern-doubler)
- REQ-0013: Source traceability -- SRC-XXXX identifiers in `04_Sources.md`
- REQ-0014: Functional requirements -- REQ-0001 format in `06_REQ.md`
- REQ-0015: Non-functional requirements -- NFR-0001 format in `07_NFR.md` with measurable targets

## Entry points

- US range in this spec: US-0010-0001..US-0010-0014
- Primary actors: QFAI user (product owner/developer), AI Agent (discovery-analyst, requirements-analyst)
- Notes: This is the entry point for new projects. Output feeds `/qfai-sdd`.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: discussion depth vs time must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
