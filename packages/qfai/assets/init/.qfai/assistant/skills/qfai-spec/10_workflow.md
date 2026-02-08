<!--
Deprecated alias workflow stub.
Canonical workflow: .qfai/assistant/skills/qfai-sdd-refinement/10_workflow.md
-->

---

id: qfai-spec
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

## CRITICAL CONSTRAINTS (Read First)

- Do NOT treat this file as SSOT for refinement behavior.
- The canonical workflow is: `.qfai/assistant/skills/qfai-sdd-refinement/10_workflow.md`.
- If this file conflicts with the canonical workflow, the canonical workflow wins.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- Execute `/qfai-sdd-refinement` and follow its workflow entirely.
- Produce outputs and evidence required by the canonical workflow.
- Run the canonical quality gate command defined there.

## Evidence (MANDATORY)

- Evidence requirements are defined by the canonical workflow:
  `.qfai/assistant/skills/qfai-sdd-refinement/10_workflow.md`.

## FINAL CHECKLIST (Check Last)

- [ ] I used `/qfai-sdd-refinement` as the authoritative workflow.
- [ ] I followed canonical constraints, process, and gate commands.
- [ ] I did not edit this deprecated alias as a source of truth.
