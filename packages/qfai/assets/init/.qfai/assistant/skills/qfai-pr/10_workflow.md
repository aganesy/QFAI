<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

id: qfai-pr
title: QFAI PR (Draft PR Description)
description: "Draft a PR description aligned with the repository PR template and include evidence."
argument-hint: "[--auto]"
allowed-tools: [Read, Glob, Write, Task]
roles: [Planner, QAEngineer, DevOpsCIEngineer, CodeReviewer]
mode: doc-focused

---

# /qfai-pr - Draft PR Description

## FORMAT SSOT (Mandatory)

- **Before writing or editing any `.qfai/**` artifact\*\*, read and follow the relevant directory README template and sample:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- **Do NOT copy** templates/samples into this prompt or into other prompt markdown.
- The generated artifacts must match the README-defined structure (headings, ordering, table columns).
- Completion requires a **Format Self-Check** in the evidence: list each artifact and confirm "matches README template".

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: `.qfai/specs/<spec-id>/delta.md` (Decision Records; if no spec yet, state "not applicable")
- P4: other artifacts (spec.md, scenario.feature, contracts, evidence)

## Delta Rejected Guard (Mandatory)

- Do NOT reintroduce options marked as rejected in delta.md.
- If a rejected option must be reconsidered, create a **[RE-OPEN]** Decision Record in delta.md that references the prior DR-ID, states what changed + new criteria, and includes explicit approval (user or instructions/steering).

## CRITICAL CONSTRAINTS (Read First)

- Use the repository PR template as the SSOT.
- Do NOT invent test results or evidence.
- If `qfai-verify` was run, include its evidence and command outputs.
- Output must match the user's language.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ", "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in the user's language. Resolve or explicitly defer; do not leave silent placeholders.
- Smoke check (if applicable): when the prompt produces runnable code/tests/configs, execute the smallest command that proves basic run/start/operate and record evidence. If not applicable, state "not applicable" with a short rationale.

## Goal

Draft a PR description that matches the repository template and enables fast, correct review.

## Non-goals

- Editing source code or tests.
- Changing the PR template itself.

## Mandatory Outputs

- A PR description draft aligned with the repository template
- Evidence summary (commands + results) or explicit note if unavailable

## Evidence (MANDATORY)

- List the executed commands and their results.
- If evidence is unavailable, state why and what remains.

## FINAL CHECKLIST (Check Last)

- [ ] PR template sections are present and complete.
- [ ] Evidence is included or explicitly marked as unavailable.
- [ ] No unverified claims are included.
