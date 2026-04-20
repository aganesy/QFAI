# Shared Skill Operating Baseline

Use this document to keep SKILL bodies compact.
Skill files should reference this baseline and only restate skill-specific additions or overrides.

## User Questions (AskUserQuestion Protocol)

- When a question to the user is needed, use AskUserQuestion if the tool is available.
- When AskUserQuestion supports structured choices, prefer structured choices over free-text input.
- If AskUserQuestion is unavailable, ask the same question in a normal message with explicit numbered choices.
- Preserve structured choice semantics when falling back.
- State why AskUserQuestion was unavailable.

## FORMAT SSOT (Mandatory)

- Before writing or editing `.qfai/**`, read the relevant README/template/sample for the target artifact.
- Do not copy templates or samples into prompt markdown.
- Generated artifacts must match README-defined structure, headings, ordering, and table columns.
- Completion requires a format self-check in evidence.

## Stage 0 - Steering completion refresh (mandatory)

Refresh these files before or during the stage when facts are missing or stale:

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`

Rules:

- Detect incomplete content such as empty sections, placeholder-only text, `<...>`, `TBD`, or stale facts.
- Fill only what is verifiable from repository evidence.
- If something cannot be verified, record an Open Question and ask the user.
- Update steering when new facts are discovered during the stage.

## Delta Rejected Guard (Mandatory)

- Do not reintroduce options marked as rejected in `09_delta.md`.
- If a rejected option must be reconsidered, create a `[RE-OPEN]` decision record that references the prior DR-ID, states what changed, and includes explicit approval.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- resolve or explicitly defer undefined or ambiguous items with rationale;
- verify every expected artifact exists and required sections are populated;
- scan generated artifacts for unresolved placeholders such as `TBD`, `TODO`, `TBA`, `TBC`, `XXX`, `???`, `OQ`, `OPEN QUESTION`, `UNDEFINED`, and `PLACEHOLDER`;
- run the smallest applicable smoke check, or state "not applicable" with a short rationale.
