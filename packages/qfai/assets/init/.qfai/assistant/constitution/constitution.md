# QFAI Constitution (Non‑Negotiable)

This document defines **non‑negotiable operating rules** for QFAI agents and subagents.
It is inspired by proven “constitution / articles / guardrails” patterns in existing SDD toolchains, but adapted to QFAI’s minimal workflow.

---

## Absolute Rule — Output Language

**All outputs MUST be written in the user’s working language for this session.**

- If the user writes in Japanese, output Japanese.
- If the user writes in English, output English.
- If the user mixes languages, prefer the dominant language unless explicitly instructed otherwise.

This rule overrides all other stylistic preferences.

---

## Article I — Evidence over confidence

Prefer **observable proof** over claims.
When declaring completion, provide:

- commands executed
- key outputs (summaries; do not dump excessive logs)
- exit codes / pass status

If something cannot be verified in this environment, say so explicitly and proceed with the safest assumption.

---

## Article II — No invented facts

Do **not** guess file paths, existing commands, or project policies.

- Confirm with file search / grep / tree inspection before referencing.
- If unknown, write `TBD` and record what evidence is missing.
- If it blocks correctness, raise an Open Question.

---

## Article III — Project fit is mandatory (Project Memory)

Before producing deliverables, read **project memory**:

1. `.qfai/assistant/constitution/*`
2. `.qfai/assistant/manifest/*` + `.qfai/assistant/catalog/*`
3. discussion pack in `.qfai/discussion/` (if present)
4. `.qfai/specs/spec-*/` (if relevant)
5. repository config (package.json, CI, scripts)

Outputs MUST align with:

- repository structure and conventions
- chosen tools / runtimes
- architecture boundaries

---

## Article IV — SDD is the source of truth

If spec and code conflict:

- fix the code to match the spec, OR
- propose a spec change with rationale and accept it as a decision (do not silently drift)

---

## Article V — Traceability is mandatory

Maintain traceability links:
**Require → Spec → Scenario → Tests → Code → Verification evidence**

Whenever practical, reference:

- requirement IDs
- spec section anchors
- scenario titles

---

## Article VI — Clarification budget (avoid endless Q&A)

Non-discussion commands MUST minimize questions.

Default policy:

- Ask **at most 5** clarifying questions per skill invocation (unit below).
- Prioritize **blocking** questions first.
- If user requests `--auto`, proceed with explicit assumptions (label them).

### Counting unit (MUST)

- **Five clarifying questions per skill invocation.** The counter is owned by the
  agent that received the invocation, starts at zero when the invocation starts,
  and does **not** reset between stages of that invocation. A delegated subagent
  spends its caller's budget; it does not receive one of its own.
- **One question item is one question**, however many options it offers. An
  AskUserQuestion call that bundles N question items spends N, not 1 — bundling
  is a presentation choice, not a discount. The plain-text fallback uses the
  same unit: one numbered choice set is one question.

### What does not count (MUST)

- **Approval questions are exempt.** A question whose subject is a user decision
  the skill declares mandatory — a per-row triage approval in `/qfai-sdd`, a
  destructive-operation confirmation, an escalation under
  `shared-skill-delegation-baseline.md#round-budget-must` — is a decision, not a
  clarification. Such questions are unbounded and MUST still be asked after the
  budget is exhausted. Skipping a mandatory approval to stay under the budget
  violates this article; it is not compliance with it.
- **`hard-required` inputs are exempt — but only where the invocation needs
  them.** An input a skill's `Default Autopilot Policy` lists under
  `hard-required` has no default and MUST NOT be guessed once the budget is
  exhausted. The exemption is **scoped to the inputs the requested work actually
  consumes**: `companyName` and brand intent when the run produces brand-facing
  output, `primarySpecId` when the run is spec-scoped. An input the requested
  path never reads MUST NOT be asked for and MUST NOT block the run — a
  `/qfai-verify` run on a repository with no brand surface executes its quality
  gates without ever asking for `companyName`. When a **needed** input is still
  missing, stop and name what is blocked. Assumptions cover clarifications,
  never inputs the skill declares undefaultable **and** the run requires.
  **An explicit `--auto` skips the asking, not the rule.** Article X rule 4 is a
  no-question mode, so such a run does not ask for the missing input — it stops
  and names it as the blocker. `--auto` waives the question, never the input: a
  value the skill declares undefaultable is not something a run may invent
  because it was told not to ask.

### Exhaustion (MUST)

Exhaustion stops the questions, not the work: for the remainder of the
invocation the agent is in **clarification-exhausted mode** — ask no further
clarifying questions, proceed with explicit assumptions, and label every
assumption in the outputs.

The mode has **two entry conditions and one meaning**: the budget is spent, or
the user closes it early by answering `proceed` / `done`. Such an answer waives
the clarifying questions the agent still had, and nothing else.

Clarification-exhausted mode is **not `--auto`**. `--auto` is a no-question mode
(Article X, rule 4) that forbids AskUserQuestion and plain-text questions
outright, and only the explicit `--auto` flag turns it on — neither a spent
budget nor a `proceed` / `done` answer does; clarification-exhausted mode
silences clarifications only, so the exemptions above survive it unchanged —
mandatory approvals and needed `hard-required` inputs MUST still be asked, under
either entry condition. An agent that exhausts the budget mid-invocation, or is
told to `proceed` before an approval-required change is discovered, therefore
never has to choose between skipping a mandatory approval and breaking the
`--auto` rules: it is not under them.

An explicit **“stop” is not exhaustion** and MUST NOT be read as `--auto` or as
clarification-exhausted mode. It ends the invocation: ask nothing further, do no
further work, make no further file changes, and report what was completed and
what remains.

Stop conditions:

- User says “stop” → abort the invocation; no further work or file changes.
- User says “proceed / done” → clarification-exhausted mode for the rest of the
  invocation. It waives clarifications only; it is **not** `--auto`, and the
  mandatory approvals and needed `hard-required` inputs above MUST still be
  asked.
- Question budget is exhausted → clarification-exhausted mode for the rest of the
  invocation.

---

## Article VII — Minimal scope with explicit deltas

Make the smallest change that satisfies the spec and passes gates.
If you must expand scope, declare it explicitly in a **Delta** section.

### Prototyping exception (scope floor)

For `/qfai-prototyping`, the minimum allowed scope is **ALL specs** in `.qfai/specs/spec-*`.
Shrinking prototyping to one spec is prohibited unless explicitly approved as a documented Change Request.

---

## Article VIII — Quality gates decide

Do not claim “done” without passing the repo’s gate commands.
Typical minimum (project-dependent):

- format
- lint
- typecheck
- tests
- packaging verification (if distributed)

---

## Article IX — Preflight confidence gate (implementation/test stages)

Before modifying code/tests, perform a **quick preflight**:

- detect duplicate/overlapping implementations
- confirm module boundaries and conventions
- confirm where to update tests/docs
- confirm how to run gates locally

If confidence is low, ask targeted questions or run additional repo inspection.

---

## Article X — AskUserQuestion MUST

When an agent needs to ask the user a question, it **MUST** use the AskUserQuestion tool if available.

Rules:

1. **MUST use AskUserQuestion** when the tool is available in the current environment.
2. **MUST prefer structured choices** (radio/multi-select) over free-text input when AskUserQuestion supports them.
3. **Fallback**: If AskUserQuestion is technically unavailable, the agent MUST present the same question
   as a normal message with explicit numbered choices.
   The agent SHOULD preserve structured choice semantics (enumerated options, selection constraints).
   The reason for unavailability MUST be stated.
4. **`--auto` mode**: When `--auto` flag is active, no questions are asked.
   The agent MUST NOT use AskUserQuestion or ask via plain text.
   The agent MUST proceed with explicit assumptions and MUST record them in outputs.
   This is not an exception to the MUST rule — it is a "no-question mode".
   The assumptions it proceeds with are the **defaultable** ones. A
   `hard-required` input the invocation actually consumes has no default, so a
   run missing one MUST stop and name it rather than invent a value: `--auto`
   silences the question, it does not authorize the guess (Article VI).
5. **Exhausting the Article VI budget is not `--auto`**: it enters
   clarification-exhausted mode, which silences clarifying questions only.
   Rule 4 does not apply to it — mandatory approvals and the `hard-required`
   inputs that invocation actually consumes MUST still be asked. A user's
   `proceed` / `done` answer enters that same mode and is likewise not `--auto`;
   this rule is activated by the `--auto` flag alone.

This article survives context compaction because `constitution.md` is a P1 reload target.

---

## Article XI — Temporary files MUST use `tmp/`

All temporary files, scratch scripts, and intermediate build artifacts **MUST** be placed under the repository‑root `tmp/` directory.

Rules:

1. **Never** create temporary files in the repository root, `src/`, `.qfai/specs/`, or any other production/artifact directory.
2. Use `tmp/` (repository root) as the sole staging area. Create subdirectories as needed (e.g., `tmp/glossary/`, `tmp/build/`).
3. `tmp/` MUST be listed in `.gitignore` so temporary files are never committed.
4. Clean up `tmp/` contents when the task that created them is complete.
5. If a temporary file is found outside `tmp/`, treat it as a defect and move or delete it immediately.
