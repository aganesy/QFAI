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
**Require → Spec → US → AC → BR → EX → TC → Tests → Code → Verification evidence**

`US → AC → BR → EX → TC` are the layered spec items (`02_User-stories.md`
through `06_Test-Cases.md`). A legacy spec-pack project carries a single
`Scenario` hop (`scenario.feature`) in their place; that hop is superseded and
the layered layout never produces it, so do not reference it in a layered
project. `drift-protocol.md` lists the legacy SSOT files it belongs to.

The `→ Tests` hop branches by test layer — a test answers the obligation its
own layer owns, and only that one:

- `TC-* → Unit / Component / Integration tests`
- `CON-DB-* → Integration tests`
- `US-* → E2E tests`
- `CON-API-* → API tests`

`catalog/test-layers.md` fixes the directory each ID type is answered from. A
layer can owe more than one of them: an Integration test answers `TC-*` and, on
a project with an active DB contract, `CON-DB-*` as well — a `CON-DB-*` with no
Integration annotation is an error (`QFAI-ATDD-115`).

The ledger and the annotations are two separate rules, and only the first is a
flat prohibition. `tdd/test-list.md` rejects `TC-Refs` on a `Layer = E2E` /
`API` row (`TDDLIST_OBLIGATION_LAYER_MISMATCH`), because a `TC-*` obligation
belongs at L1–L3. A test file's `TC-*` annotation is instead routed by the TC's
own declared `Level`, so a TC still recorded at `L4` / `L5` is answered from
`tests/api/**` / `tests/e2e/**` and counted there (`QFAI-ATDD-112`). Do not
strip those annotations to satisfy the ledger rule — that only removes coverage.
Re-file the obligation upstream as `CON-API-*` or `US-*`, and **move the whole
chain in one change**: the `EX-*` it derives from, the `BR-*` that EX
concretizes, and the `AC-*` that BR answers, the way `catalog/test-layers.md`
prescribes. Leaving the `AC-*` behind when that TC was its only cover is
`QFAI-COV-201` — the re-filing then trades one error for another.

Whenever practical, reference:

- requirement IDs
- spec section anchors
- layered item IDs (`US-*`, `AC-*`, `BR-*`, `EX-*`, `TC-*`) and the contract IDs
  the API layer answers (`CON-API-*`)

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
