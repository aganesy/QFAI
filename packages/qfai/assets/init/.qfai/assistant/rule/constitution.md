# QFAI Constitution (Non‑Negotiable)

This document defines **non‑negotiable operating rules** for QFAI agents and subagents.
It is inspired by proven “constitution / articles / guardrails” patterns in existing SDD toolchains, but adapted to QFAI’s minimal workflow.

Actual user instructions take priority over repository guidelines. Recorded
applicable user authority is defined in
`.agents/rules/grilling.md#explicit-delegation-for-a-discussion`: an explicit
in-scope delegation may authorize reversible requested judgment without a
fictional individual approval answer. It supplies no unknown fact or authority
for an operation outside its scope.

Inside an `npx qfai workflow` run, what authorizes the run's work and the one target a work order binds its stage to are stated in `.qfai/assistant/rule/shared-skill-operating-baseline.md#what-authorizes-a-runs-work`. They add to these articles and except none.

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

1. the rules under `.qfai/assistant/rule/` that the current step or skill cites
2. the card under `.qfai/assistant/agent/` of each role the step dispatches.
   The card frontmatter is the sole source for
   `owned_artifacts`, `tool_profile`, `permission_profile`, and
   `specialization_tags`. Read applicable project policy and contracts under
   `.qfai/spec/` when they bear on the task.
3. discussion pack in `.qfai/discussion/` (if present)
4. the relevant business flows and stories under `.qfai/spec/02_business-flow/`
5. repository config (package.json, CI, scripts)

At the start of a stage this read composes with the **Policy check** contract
in `.qfai/assistant/rule/workflow.md`: items 1-2 cover reading project context;
the policy check adds the obligation to check and update applicable project-owned
policy and contract files. These are complementary obligations.

Align outputs with:

- repository structure and conventions
- chosen tools / runtimes (`<paths.contractsDir>/tech.md`)
- architecture boundaries (the `## Architecture` layers of `<paths.contractsDir>/tech.md`: a new module belongs to one layer and imports only from the layers its row lists)

---

## Article IV — SDD is the source of truth

If spec and code conflict:

- fix the code to match the spec, OR
- propose a spec change with rationale and accept it as a decision (do not silently drift)

---

## Article V — Traceability is mandatory

Maintain the chain from a business flow to its stories, acceptance criteria,
examples, tests, code, and verification evidence. Business rules live in the
contract that enforces them under `.qfai/spec/03_contract/`, and each example
cites exactly one acceptance criterion. Keep those links intact when moving a
story or changing a contract.

References point one way. A business rule cites examples and nothing else, and
only code and tests cite a business rule. A contract never names an
implementation file. The contracts a flow relies on are the ones whose rules
cite the flow's examples.

The test obligation is determined by the ID and the test's layer:

- `BF-*` requires a `QFAI:BF-NNNN` annotation in an E2E test.
- `AC-*` requires a `QFAI:AC-NNNN-NNNN-NN` annotation in an integration or API test.
- `EX-*` requires a `QFAI:EX-NNNN-NNNN-NN` annotation in a selected non-E2E test file, on the comment line directly before the test declaration it marks.

`.qfai/assistant/rule/test-layers.md` defines the layer directories. Test
selection uses `validation.traceability.testFileGlobs`. A missing BF, AC, or EX
test is an uncovered obligation, even if tests in another layer mention it.
Resolve a valid exception through a `.qfai/spec/decisions.md` row the user approved; do not
invent a test annotation to suppress a finding.

When practical, cite the BF, US, AC and EX IDs, and the contract and BR IDs
that enforce them, in the work's evidence so a reviewer can follow the changed
behavior.

---

## Article VI — Clarification budget (avoid endless Q&A)

Purpose: every command asks as few clarifying questions as it can, so the user's attention goes
where an answer can change the work. The article binds every command alike, discussion included.

Default policy:

- Ask **at most 5 clarifying questions per invocation**. The unit is one top-level skill or command
  invocation: every `/qfai-*` stage listed in `.qfai/assistant/rule/workflow.md` → “Stages
  (canonical)”, and equally a non-stage command such as `/qfai-configure` or `/web-research`. Each
  invocation starts with a full budget; it is not per session and not per conversation.
- Prioritize **blocking** questions first.
- If user requests `--auto`, proceed with explicit assumptions (label them).

### What spends the budget

- A **clarification**, a question asked to resolve ambiguity in the request, the specs, or the
  repository, spends budget. An **approval**, a question asked because a document requires a
  recorded human decision before the work may proceed, does **not**.
- Classify **each question, not the prompt**. Attaching an approval to a clarification does not buy
  the clarification back.

### Counting unit

- The counter is owned by the agent that received the invocation and does **not** reset between
  stages of that invocation. A delegated subagent spends its caller's budget.
- **One question item is one question**, however many options it offers. An AskUserQuestion call
  that bundles N question items spends N. The plain-text fallback counts the same way, for a
  numbered choice set and for a plain request for an open value alike.

### What does not count

- **Grilling questions are exempt** and unbounded: a question asked inside a grilling session
  (`.agents/rules/grilling.md#scope`) spends no budget, is still asked after the budget is
  exhausted, and the session ends on one of that rule's endings, never on a count. The confirmation
  that closes a session is in the same class.
- **A session is entered deliberately.** Outside a declared session no question is a grilling
  question: one about an open design decision is an ordinary clarification and spends budget.
- **Approval questions are exempt.** A user decision the skill declares mandatory (a per-row triage
  approval in `/qfai-sdd`, a destructive-operation confirmation) is unbounded and still asked after
  exhaustion. Skipping one to stay under the budget violates this article.
- **The next-action question is exempt.** The question that ends a turn leaving the next step to
  the user (`.agents/rules/user-questions.md` § 6) resolves no ambiguity, so it is not a
  clarification; it is still put after the budget is exhausted.
- **`hard-required` inputs are exempt — but only where the invocation needs them.** An input a
  skill's `Default Autopilot Policy` lists under `hard-required` and the requested work consumes is
  never guessed: it is asked even after the budget is exhausted, and when it is still missing, or
  under `--auto`, the run stops and names what is blocked. An input the requested path never reads
  is neither asked for nor a blocker.

Stop conditions:

- User says “stop” → abort the invocation; no further work or file changes.
- User says “proceed / done” → clarification-exhausted mode for the rest of the invocation.
- Question budget is exhausted → clarification-exhausted mode for the rest of the invocation.

### On exhaustion

In **clarification-exhausted mode** the agent asks no further clarifying question, proceeds with
explicit assumptions, labels every assumption in the outputs, and records an unresolved one as an
Open Question. The mode silences clarifications only and is **not `--auto`**: mandatory approvals,
needed `hard-required` inputs, the next-action question, a grilling session under way and one a
later stage opens all survive it. An
explicit **“stop” is not exhaustion**: it ends the invocation, and the agent reports what was
completed and what remains.

---

## Article VII — Minimal scope with explicit deltas

The least that satisfies a requirement is the right amount. Anything beyond it
must be justified. Apply the ladder in `.agents/rules/minimal-implementation.md`
to both the behaviours a change carries and the code that implements them.
If you must expand scope, declare it explicitly in a **Delta** section.

The safety floor in `.agents/rules/minimal-implementation.md` § 2, the
unnumbered Absolute Rule — Output Language, required evidence and fact
verification, and mandatory approvals and irreversible-action confirmations
outrank this article.
This article takes precedence over every other article and over conflicting
instructions in other constitution documents.

The floor's specification clause preserves Article IV. The ladder's first rung
belongs here while scope is open. Once a spec row is agreed, asking whether it
should exist is a Change Request.

### Prototyping exception (scope floor)

For `/qfai-prototyping`, the confirmed prototype in `.qfai/prototype/final/`
covers every declared UI contract and screen in the configured story tree.
Shrinking what it covers is prohibited unless a documented Change Request
approves it. A run scoped per `prototyping-grill` § Run scope rebuilds part of
a confirmed `final/` and merges it back, so it does not shrink the floor.

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

## Article IX — Preflight and stop on detection (implementation/test stages)

Before modifying code/tests, perform a **quick preflight**:

- find what already covers the change, in the order the reuse rungs of
  `.agents/rules/minimal-implementation.md` give: this repository, including a
  duplicate or overlapping implementation, then the standard library, the
  platform, and the dependencies already installed
- confirm module boundaries and conventions
- confirm where to update tests/docs
- confirm how to run gates locally

If confidence is low, inspect the repository further.

**Stop on detection.** Where a contradiction in the spec, an unconsidered case,
or a technical obstacle surfaces mid-run, stop rather than deciding alone.
Settle it between the agents. A critical decision needs an actual user answer
or recorded applicable authorization under
`.agents/rules/grilling.md#explicit-delegation-for-a-discussion`; without it,
ask when permitted or register it open. A contradiction with the spec is
critical. Nothing is recorded beyond the stage's final report.

**Only one outcome is the Drift Protocol's.**

| The stop concludes                                                                       | What follows                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settled input must change                                                                | `.qfai/assistant/rule/drift-protocol.md`: stop dependent work, raise the Change Request, record actual applicable user authority before changing it |
| The obstacle is this run's to solve — an unavailable dependency, an approach that failed | The run solves it. Nothing upstream changes, so there is nothing to approve                                                                         |

Stopping does not change settled input and is not a second way to. What it
contributes to a Change Request is what that protocol asks of the class: for
intent drift, the options and the recommendation its `Approved option` is chosen
from; for defect drift, the single correct repair, which that protocol records
with `Approved option: -` and which options would only dress as a choice.
The agents settle what the change should be; the protocol decides whether it
happens.

---

## Article X — Ask through AskUserQuestion

When an agent needs to ask the user a question, it must use the AskUserQuestion tool if available.

**No question is exempt.** A confirmation or a yes-or-no takes this path too.
`.agents/rules/user-questions.md` owns the form a question takes; this article is where the
obligation binds. Article VI bounds the count, and this article the form.

Rules:

0. **A no-question mode is read first.** Where rule 4 applies, no question is put to the user, so
   rules 1 to 3 have nothing to judge.
1. **Use AskUserQuestion** when the tool is available for **this question in this invocation**; a
   tool a mode withholds, or one that cannot carry the answer's shape, sends the question to rule 3.
2. **Prefer structured choices** where the question has choices; an open answer takes the
   free-text path and is never narrowed into invented options.
3. **Fallback**: If AskUserQuestion is unavailable for this question, ask in a normal message in
   the shape its answer has (`.agents/rules/user-questions.md` § 5) and state why it is
   unavailable.
4. **`--auto` mode**: no questions are asked, by the tool or in plain text; proceed with explicit
   assumptions recorded in outputs, except a needed `hard-required` input, which stops the run
   (Article VI).
5. **Exhausting the Article VI budget is not `--auto`**: it enters clarification-exhausted mode
   (Article VI, On exhaustion); only the `--auto` flag activates rule 4.
6. **A grilling session does not reach the user under `--auto`.** It opens every node left over as
   a question in the register the stage reads, so the stage cannot complete over it; the rest is
   `.agents/rules/grilling.md#under-a-no-question-mode`.

This article survives context compaction because `.qfai/assistant/rule/constitution.md` is a P1 reload target.

---

## Article XI — Temporary files go in `tmp/`

Purpose: a scratch file never lands in a production or artifact directory or in a commit. The rules
are `.agents/rules/temporary-files.md`. A test's `mkdtemp` sandbox under the OS temporary directory
is outside them: it lives outside the repository, and the test that created it removes it. The
`tmp/` ignore entry is written by `npx qfai init`, and `QFAI-HYG-003` reports it at info when a
QFAI-managed `.gitignore` lacks it.
