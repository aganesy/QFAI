---
name: "qfai-sdd"
description: "QFAI: qfai-sdd (Agents/Codex skill wrapper)"
---

# qfai-sdd

This skill is a thin wrapper that forwards to the canonical QFAI skill in this repository:

- .qfai/assistant/skills/qfai-sdd/SKILL.md

Scope reminder checklist (`/qfai-sdd`):
- No argument means ALL specs from `.qfai/specs/_policies/03_Capabilities.md` (stable `spec-0001..N` mapping).
- Contracts-first and `_policies` outline run once per batch.
- Slice/Plan/Delta are delegated in parallel per spec.
- `qfai validate` and RCP review run once at batch tail after integration.
- Follow `.qfai/assistant/steering/test-layers.md` for test-layer obligations.

Instructions:

1. Read the skill document above and follow it precisely.
2. Use the repository as the source of truth (tools, frameworks, directory structure).
3. Ensure all outputs match the user's language.
