# QFAI Codex skills

This directory provides thin Codex skill wrappers for QFAI.

## Canonical entrypoint

Codex skill wrappers must point to QFAI's canonical skill documents under:

- .qfai/assistant/skills/

These canonical skill documents are the SSOT.
Tool integrations must reference `.qfai/assistant/skills/`.

## Usage

In Codex CLI, select a skill by name (e.g., `qfai-configure`) and provide your request.
All outputs must match the user's language.
