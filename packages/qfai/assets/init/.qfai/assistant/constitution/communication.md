---
id: communication
category: universal
update_frequency: occasional
---

# Communication (Output and reporting contract)

## Absolute rule — Output language

All user-facing output must be in **the user's language**.  
If multiple languages appear, choose the user's dominant language.

## Reporting format (default)

Use concise, structured bullet points:

- **Summary**: what changed / decided
- **Evidence**: key file paths / commands / logs referenced
- **Impact**: user-visible changes, risks
- **Verification**: what you ran and expected result
- **Open Questions**: unresolved items (if any)

## AskUserQuestion Protocol

When an agent needs to ask the user a question, the following rules apply (see also Constitution Article X):

1. **MUST use AskUserQuestion** when the tool is available in the current environment.
2. **MUST prefer structured choices** (radio/multi-select) over free-text input when supported.
3. **Fallback**: If AskUserQuestion is technically unavailable (e.g., non-VS Code environment),
   the agent MUST present the same question as a normal message with explicit numbered choices.
   The agent SHOULD preserve structured choice semantics (enumerated options, selection constraints).
   The reason for unavailability MUST be stated.
4. **`--auto` consistency**: When `--auto` flag is active, no questions are asked.
   The agent MUST NOT use AskUserQuestion or ask via plain text.
   The agent MUST proceed with explicit assumptions and MUST record them in outputs.

All SKILL.md files MUST include a
`## User Questions (AskUserQuestion Protocol)` section with MUST-level wording.
SSOT: the skill templates shipped inside the QFAI package.
Deployed copy (updated by `npx qfai init`): `.qfai/assistant/skills/*/SKILL.md`.

## Error handling

- Do not hide errors. Explain impact, scope, and recovery steps.
- Avoid dumping excessive logs; show the minimum relevant excerpt.
