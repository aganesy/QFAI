# prompts.local

## Purpose

`prompts.local/` allows **minimal overrides** of canonical prompts when project constraints cannot be expressed via steering.

## Rules

- Keep diffs minimal and focused.
- File name must match the canonical prompt name (e.g. `qfai-atdd.md`).
- Do not copy the entire canonical prompt into this folder.
- Overrides MUST still respect: README-as-SSOT for formatting.

## Override template (excerpt)

```md
# Override: <prompt>

## Delta
- <what changes>

## Rationale
- <why steering cannot cover this>

## Additional constraints
- <any extra constraints>
```
