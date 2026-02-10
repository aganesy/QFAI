<!--
Deprecated alias workflow stub.
Canonical workflow: .qfai/assistant/skills/qfai-sdd-refinement/SKILL.md
-->

---

name: qfai-spec
title: QFAI Spec (Deprecated Alias)
description: "Deprecated alias. Forward to qfai-sdd-refinement."
argument-hint: "<spec-id-or-name> [--auto]"
allowed-tools: [Read, Glob, TodoWrite, Bash]
roles: [Planner, Architect, RequirementsAnalyst]
mode: approval-gated

---

# /qfai-spec (Deprecated Alias)

This workflow is a compatibility alias.
Use `/qfai-sdd-refinement` for active work.

## Stage 0 — Steering completion refresh (mandatory)

Before forwarding to `/qfai-sdd-refinement`, refresh:

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`

If data is incomplete, fill what can be verified and raise Open Questions for unknowns.

## CRITICAL CONSTRAINTS (Read First)

- Do NOT treat this file as SSOT for refinement behavior.
- The canonical workflow is: `.qfai/assistant/skills/qfai-sdd-refinement/SKILL.md`.
- If this file conflicts with the canonical workflow, the canonical workflow wins.
- Ensure `case-catalogue.md` is table-based (category sections + `Case title` column) when executing the canonical workflow.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- Execute `/qfai-sdd-refinement` and follow its workflow entirely.
- Produce outputs and evidence required by the canonical workflow.
- Run the canonical quality gate command defined there.

## Evidence (MANDATORY)

- Evidence requirements are defined by the canonical workflow:
  `.qfai/assistant/skills/qfai-sdd-refinement/SKILL.md`.

## FINAL CHECKLIST (Check Last)

- [ ] I used `/qfai-sdd-refinement` as the authoritative workflow.
- [ ] I followed canonical constraints, process, and gate commands.
- [ ] I did not edit this deprecated alias as a source of truth.

