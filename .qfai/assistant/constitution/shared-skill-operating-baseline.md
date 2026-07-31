# Shared Skill Operating Baseline

Use this document to keep SKILL bodies compact.
Skill files should reference this baseline and only restate skill-specific additions or overrides.

## SKILL.md Authoring Shape (Mandatory)

A `SKILL.md` states the contract and points at the file that carries the detail.
It is not where the detail lives.

- **Keep in `SKILL.md`**: what the skill is for, its non-goals, its hard
  constraints, the phase/step order, and the gate conditions. Enough for an
  agent to know what it must do and when it is done.
- **Move out**: command sets, table schemas, field-by-field contracts, worked
  procedures, checklists and rationale. These go under the skill's own
  directory:
  - `references/` — normative detail the skill body cites (`references/<topic>.md`)
  - `templates/` — artifacts the skill produces, as fillable skeletons
  - `examples/` — worked instances that illustrate, and bind, nothing
- **One topic per file.** Do not replace an oversized `SKILL.md` with an
  oversized `references/everything.md`; that is the same problem one directory
  down. Split by topic and keep each file readable on its own — a reader who
  followed one pointer should not have to scan past three unrelated subjects to
  reach the one they came for.
- **Every pointer resolves.** A `SKILL.md` line that moves detail out must name
  the file (and anchor, when the file covers more than one topic) so the reader
  is never left guessing where the rule went.

A hard line ceiling backs this up in the asset tests, but it is a backstop, not
the rule. A skill approaching it is a signal to move a section out.

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

- `.qfai/assistant/catalog/manifest.md`
- `.qfai/assistant/catalog/product.md`
- `.qfai/assistant/catalog/structure.md`
- `.qfai/assistant/catalog/tech.md`

Rules:

- Detect incomplete content such as empty sections, placeholder-only text, `<...>`, `TBD`, or stale facts.
- Fill only what is verifiable from repository evidence.
- If something cannot be verified, record an Open Question and ask the user.
- Update steering when new facts are discovered during the stage.

## Delta Rejected Guard (Mandatory)

- Do not reintroduce options marked as rejected in `09_delta.md`.
- If a rejected option must be reconsidered, create a `[RE-OPEN]` decision record that references the prior DR-ID, states what changed, and includes explicit approval.

## Gate Failure Autorepair Protocol

When validate, doctor, test, lint, typecheck, build, capture, or report gates fail:

- inspect exit code, logs, `validate.json`, and cited files before reporting;
- classify each finding as skill-owned artifact, upstream spec/contract, code/test defect, environment/tooling, or user decision;
- fix skill-owned artifacts and code/test defects autonomously when the fix is local and non-destructive;
- rerun the same failing gate after each fix batch;
- do not weaken profiles, lower `--fail-on`, waive errors, invent evidence, or skip required reviewers;
- stop only for destructive changes, ambiguous product/spec decisions, missing permissions/tools, or repeated no-progress failures.

When stopping, report: cause, attempted fixes, remaining blocker, user action, and retry gate.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- resolve or explicitly defer undefined or ambiguous items with rationale;
- verify every expected artifact exists and required sections are populated;
- scan generated artifacts for unresolved placeholders such as `TBD`, `TODO`, `TBA`, `TBC`, `XXX`, `???`, `OQ`, `OPEN QUESTION`, `UNDEFINED`, and `PLACEHOLDER`;
- run the smallest applicable smoke check, or state "not applicable" with a short rationale.
