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
2. `.qfai/assistant/manifest/agent-routing.yml`, `.qfai/assistant/manifest/review-profiles.yml`,
   and `.qfai/assistant/catalog/*`
   (`.qfai/assistant/manifest/agent-catalog.yml` for the acting `orchestrator` — the standing
   commander named in `constitution/agent-selection.md`, which no routing phase or review
   profile lists, so it is never reached as a "routed role" — and for every routed role:
   `owned_artifacts`, `tool_profile`, `permission_profile`, and `specialization_tags` are SSOT
   and appear in no agent card, so never skip them. Only the entry's `developer_instructions`
   body is a generated mirror of `.qfai/assistant/agents/<id>.md`, and **the mirror can be
   stale**: `npx qfai init --force` regenerates the card while deliberately leaving `manifest/`
   alone, so a taxonomy tuned through `/qfai-configure` survives an upgrade — and an upgraded
   or customised project can then hold two different bodies for one role. So **skip that body
   only when it matches the card in context; when they differ, the catalog entry is the role
   contract and wins**, and the divergence is a stale manifest to repair
   (`skills/qfai-atdd/references/stale-manifest.md`). Read the body on demand when no card is
   in context. Each `agents/<id>.md` card repeats this same scope in its own
   `## Inputs you must read`.)
3. discussion pack in `.qfai/discussion/` (if present)
4. `.qfai/specs/spec-*/` (if relevant)
5. repository config (package.json, CI, scripts)

At the start of a stage this read composes with the **Stage 0 — Steering refresh contract**
in `constitution/workflow.md`: items 1-2 above cover _reading_ project memory, Stage 0 adds the
obligation to _check and update_ the four `catalog/` steering files it names. One bootstrap, two
obligations — do not treat them as competing lists.

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

- Ask **at most 5** clarifying questions total.
- Prioritize **blocking** questions first.
- If user requests `--auto`, proceed with explicit assumptions (label them).

Stop conditions:

- User says “stop / proceed / done”.
- Question budget is exhausted.

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
