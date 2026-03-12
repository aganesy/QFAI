---
agent: "agent"
description: "QFAI: qfai-sdd"
---

You are operating in a repository that uses QFAI.

1. Open and follow the canonical QFAI skill:

- .qfai/assistant/skills/qfai-sdd/SKILL.md

Scope reminder checklist (`/qfai-sdd`):

- No argument means ALL specs from `.qfai/specs/_policies/03_Capabilities.md` (stable `spec-0001..N` mapping).
- Contracts-first and `_policies` outline run once per batch.
- Slice/Plan/Delta are delegated in parallel per spec.
- `qfai validate` and RCP review run once at batch tail after integration.
- Follow `.qfai/assistant/steering/test-layers.md` for test-layer obligations.

2. Use the repository as the source of truth (tools, frameworks, directory structure).
3. Ask the user for missing inputs only when necessary.
4. Do not modify files not required by the canonical skill.
5. All outputs must match the user's language.

User notes: ${input:notes:Optional}
