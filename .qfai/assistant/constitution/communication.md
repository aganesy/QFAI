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

## Writing quality bar

Applies to every text an agent produces: pull request and issue titles and
bodies, source-code comments, and Markdown files — inside the current change
only, never beyond its diff.

- No issue or pull-request numbers, ticket identifiers, or names only this
  project understands, anywhere in source code or Markdown files. Those belong
  in the pull request, the commit message and the changelog.
- No account of how the work went. State the current behaviour and why it is
  that way; the history is already in the git log and the pull request.
- Cut what is self-evident, repeated, or wordy.
- Ordinary vocabulary, one claim per sentence, lines short enough to scan.
- Bullet lists and tables for parallel items.
- Re-read every changed line afterwards. Text that reads as a literal
  translation is a defect in any language pair — rewrite it the way someone
  writing natively in that language would.

Full rule: `.agents/rules/documentation-clarity.md`.

## AskUserQuestion Protocol

When an agent needs to ask the user a question, the following rules apply (see also Constitution Article X):

1. **MUST use AskUserQuestion** when the tool is available in the current environment.
   **No question is exempt**, and availability is judged for **this question in this
   invocation**: a tool the mode withholds, and one that cannot carry the answer's
   shape, are both unavailable for that question and take rule 3. A mode that
   permits no question at all is rule 4's and is read before this one — there is
   no question there whose availability to judge.
   `.agents/rules/user-questions.md` owns the form and states the whole of it.
2. **MUST prefer structured choices** (radio/multi-select) over free-text input where the question
   has choices and the tool supports them.
   Where the answer is genuinely open — no listable set of candidates — the tool's
   free-text path carries it; that is an answer shape, not an exception. A name, a
   number or a sentence is usually open and is not open by type.
3. **Fallback**: If AskUserQuestion is unavailable for this question, the agent MUST present the same
   question as a normal message, in the shape its answer has: explicit numbered choices where there
   are choices, and a plain request for the value where the answer has no listable set of candidates.
   Inventing options to fit an open answer into a list is not the fallback.
   Where there are choices the agent SHOULD preserve structured choice semantics (enumerated
   options, selection constraints). The reason for unavailability MUST be stated.
4. **`--auto` consistency**: When `--auto` flag is active, no questions are asked.
   The agent MUST NOT use AskUserQuestion or ask via plain text.
   The agent MUST proceed with explicit assumptions and MUST record them in outputs.
5. **Exhaustion is not `--auto`**: spending the Article VI clarification budget enters clarification-exhausted mode,
   where rule 4 does not apply — mandatory approvals and the `hard-required` inputs that invocation actually
   consumes MUST still be asked. A user's `proceed` / `done` answer enters that same mode and is likewise
   not `--auto`; rule 4 is activated by the `--auto` flag alone.
6. **A grilling session under `--auto` opens what it could not settle**: rule 4 silences its questions like any
   others, and each decision left over MUST be opened as a question in the register the stage reads, so the stage
   cannot complete over it. Where a document requires the field to hold something, write the defaulted value and
   label it an assumption beside that open question. Rule 4's assumptions are the defaultable ones; an assumption
   with no open question against it is not one of them.

All SKILL.md files MUST include a
`## User Questions (AskUserQuestion Protocol)` section with MUST-level wording.
SSOT: the skill templates shipped inside the QFAI package.
Deployed copy (updated by `npx qfai init`): `.qfai/assistant/skills/*/SKILL.md`.

## Error handling

- Do not hide errors. Explain impact, scope, and recovery steps.
- Avoid dumping excessive logs; show the minimum relevant excerpt.
