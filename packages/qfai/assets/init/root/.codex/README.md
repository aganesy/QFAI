# QFAI Codex skills

This directory provides thin Codex skill wrappers for QFAI.

## Canonical entrypoint

Codex skill wrappers must point to QFAI's canonical skill documents under:

- .qfai/assistant/skills/

In v1.3.x, these canonical skill documents may still forward to the underlying prompt body.
However, **tool integrations must reference `.qfai/assistant/skills/`**, not `.qfai/assistant/prompts/`.

## Usage

In Codex CLI, select a skill by name (e.g., `qfai-configure`) and provide your request.
All outputs must match the user's language.
