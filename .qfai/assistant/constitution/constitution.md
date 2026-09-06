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
project. `.qfai/assistant/constitution/drift-protocol.md` lists the legacy SSOT files it belongs to.

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

- Ask **at most 5 clarifying questions per invocation**. The unit is one
  top-level skill or command invocation: every `/qfai-*` stage listed in
  `.qfai/assistant/constitution/workflow.md` → “Stages (canonical)”, and equally a non-stage command such as
  `/qfai-configure` or `/web-research`. Each invocation spends its own budget and
  the next one starts with a full budget. It is not per session and not per
  conversation.
- Prioritize **blocking** questions first.
- If user requests `--auto`, proceed with explicit assumptions (label them).

### What spends the budget (MUST)

- A **clarification** — a question asked to resolve ambiguity in the request,
  the specs, or the repository — spends budget.
- An **approval** — a question asked because a document requires a recorded
  human decision before the work may proceed — does **not** spend budget.
  Approvals are unbounded by construction: SDD triage requires an `Approved By`
  on every approval-required row and puts no cap on rows, and the reviewer-gate
  escalation exit requires a user decision per escalation
  (`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#round-budget-and-convergence-must`). Counting them would
  make this article impossible to satisfy in the stage that asks the most.
- Classify **each question, not the prompt**. A prompt that carries both spends
  one unit per clarification it contains; only its approval questions are exempt.
  Attaching an approval to a clarification does not buy the clarification back.

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
  `.qfai/assistant/constitution/shared-skill-delegation-baseline.md#round-budget-and-convergence-must`
  — is a decision, not a clarification. Such questions are unbounded and MUST
  still be asked after the budget is exhausted. Skipping a mandatory approval to
  stay under the budget violates this article; it is not compliance with it.
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

Stop conditions:

- User says “stop” → abort the invocation; no further work or file changes.
- User says “proceed / done” → clarification-exhausted mode for the rest of the
  invocation. It waives clarifications only; it is **not** `--auto`, and the
  mandatory approvals and needed `hard-required` inputs above MUST still be
  asked.
- Question budget is exhausted → clarification-exhausted mode for the rest of the
  invocation.

### On exhaustion (MUST)

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

Do not ask a sixth clarification. Settle the remaining ambiguity the way `--auto`
does: proceed with explicit assumptions, label them, and record them in the
invocation's output — as Open Questions when the assumption is still unresolved.
Exhaustion silences clarifications only. A **required approval is still asked**:
it never spent budget, and Article X's `--auto` no-question mode is not in force
here — only its assumption-recording behaviour is. Silently stopping is not a
sanctioned move, and neither is asking a sixth clarification anyway.

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

This article survives context compaction because `.qfai/assistant/constitution/constitution.md` is a P1 reload target.

---

## Article XI — Temporary files MUST use `tmp/`

All temporary files, scratch scripts, and intermediate build artifacts **MUST** be placed under the repository‑root `tmp/` directory.

Scope: this article is about files written **into the working tree** — scratch
scripts, intermediate build artifacts, downloaded fixtures, notes. A sandbox a
test creates with `mkdtemp` under the OS temporary directory is **not** covered:
it lives outside the repository, so it cannot put a file in any of the
directories Rule 1 protects, and the test that created it removes it.

Rules:

1. **Never** create temporary files in the repository root, `src/`, `.qfai/specs/`, or any other production/artifact directory.
2. Use `tmp/` (repository root) as the sole staging area. Create subdirectories as needed (e.g., `tmp/glossary/`, `tmp/build/`).
3. `tmp/` MUST be listed in `.gitignore` so temporary files are never committed.
4. Clean up `tmp/` contents when the task that created them is complete.
5. If a temporary file is found outside `tmp/` **in the working tree**, treat it as a defect and move or delete it immediately. A test's `mkdtemp` sandbox is not one — see Scope above.
