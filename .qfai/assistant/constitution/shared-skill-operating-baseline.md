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

A hard line ceiling backs this up: **500 lines per assistant asset file**, for
every `.qfai/assistant/**/*.{md,yml,yaml}` file, counted as
`content.split(/\r?\n/).length` — blank lines included. `npx qfai doctor`
measures it and reports every file over the ceiling as `assets.lineBudget`. The
ceiling is a backstop, not the rule: a file approaching it is a signal to move a
section out, not to raise the number.

One shipped file is exempt, and only because it is a roster rather than prose:
`assistant/manifest/agent-catalog.yml` holds one entry per agent, mirroring
`assistant/agents/<id>.md`, so its length tracks the number of agents — whether
shipped or adjusted through `qfai-configure` — and splitting it would mean
splitting the roster itself. `npx qfai doctor` names it under `exempt` with that
reason. No prose asset has an exemption.

## User Questions (AskUserQuestion Protocol)

- When a question to the user is needed, use AskUserQuestion if the tool is available.
- When AskUserQuestion supports structured choices, prefer structured choices over free-text input.
- If AskUserQuestion is unavailable, ask the same question in a normal message with explicit numbered choices.
- Preserve structured choice semantics when falling back.
- State why AskUserQuestion was unavailable.

## Canonical qfai Launcher (Mandatory)

- **Launcher preflight — run once, before the first gate.** Confirm the project
  resolves qfai from its own dependencies. Either proof is sufficient:
  - **A local binary at `node_modules/.bin/qfai`.** The normal case for npm,
    pnpm and Yarn configured with `nodeLinker: node-modules`.
  - **A Plug'n'Play install.** Yarn Berry's default `nodeLinker: pnp` writes no
    `node_modules/.bin`, so the file check alone would report a correctly
    installed project as UNRUN forever. Accept it when the project has a
    `.pnp.cjs` / `.pnp.loader.mjs` at its root and lists `qfai` in
    `package.json` `dependencies` / `devDependencies`; `yarn exec qfai --help`
    exiting 0 is the direct confirmation.

  If neither proof holds, every gate below is UNRUN: report it as a blocker and
  stop. The fix is to install the dependency (`npm i -D qfai`, or the pnpm /
  yarn equivalent). `qfai` does not add itself to `package.json` on init, so a
  project bootstrapped with `npx qfai init` alone has no local dependency yet.

- Once the preflight passes, invoke every gate through the launcher that proof
  established:
  - local binary -> `npx qfai …`, which resolves to it.
    `node_modules/.bin/qfai …` is the same thing spelled out; prefer it when
    PATH reachability is uncertain.
  - Plug'n'Play -> `yarn exec qfai …` (equivalently `yarn qfai …`), which sets
    up the PnP environment for the child process. Do **not** fall back to
    `npx qfai` there: outside the PnP runtime it cannot see the workspace
    dependency and would fetch a remote copy instead.

  Read every `npx qfai …` example in the shipped docs as "the launcher the
  preflight established", not as a literal command for a PnP project.

- Never launch a gate as a bare `qfai` command: qfai is a project dependency,
  not a global one, so that is `command not found` on a normal local install —
  and a gate that cannot run is a gate that silently passes.
- The preflight is the guard, not a flag. `npx` runs "a command from a local
  **or remote** npm package": with nothing resolvable locally it downloads and
  runs one (non-interactive shells do this without prompting), and
  `npx --no-install` still executes a copy already sitting in the npx cache.
  Neither spelling can tell you the qfai that ran was this project's; only the
  preflight can.
- If the launcher cannot be resolved at any point, the gate is UNRUN, not PASS.
  Report it as a blocker instead of completing the stage.
- The same launcher is documented in `.qfai/assistant/catalog/tech.md` and
  `.qfai/assistant/catalog/structure.md`. The CI workflow generated by
  `npx qfai init` is the one deliberate exception: it runs before any project
  install can be assumed and must still be able to bootstrap.

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

When validate, doctor, test, lint, typecheck, build, capture, or report gates fail — **or when a blocking reviewer returns `REVISE`** (the in-flight verdict; `status: "FAIL"` is only what a review pack's `summary.json` serializes — see `shared-skill-delegation-baseline.md#verdict-vocabulary`):

- inspect exit code, logs, `validate.json`, and cited files before reporting;
- classify each finding as skill-owned artifact, upstream spec/contract, code/test defect, environment/tooling, or user decision;
- fix skill-owned artifacts and code/test defects autonomously when the fix is local and non-destructive;
- **upstream spec/contract findings: never repair.** STOP and follow `.qfai/assistant/constitution/drift-protocol.md` (Change Request + owner-skill rerun) — **even when the fix looks local and non-destructive, and even when it is one token and obviously correct**. "Local and non-destructive" is a permission for the two classes above it; it is not a test that upstream artifacts can pass. Ownership, not size, decides;
- environment/tooling findings: repair the environment when it is yours to repair (install a missing dev dependency, regenerate a lockfile, create a scratch directory). Stop for anything needing credentials, network access you do not have, or a change to CI configuration or the host machine;
- user decision findings: never decide by default. Record the question, state the option you would take and why, and stop — a decision taken silently to keep a gate green is the same failure as repairing upstream, one layer up;
- rerun the same failing gate after each fix batch, **and once with no intervening change** when the failure looks nondeterministic — see `#nondeterministic-gates` below. The confirmation rerun is bounded at one: after it the finding is classified, not re-rolled;
- do not weaken profiles, lower `--fail-on`, waive errors, invent evidence, or skip required reviewers;
- stop for destructive changes, **any upstream spec/contract finding**, ambiguous product/spec decisions, missing permissions/tools, or repeated no-progress failures — the stop list is closed over the classification above, so every class the agent is told to use has a defined next action;
- stop on **round count** as well as on lack of progress: a reviewer gate that would enter its third round escalates to the user, even when every round has made progress. See `shared-skill-delegation-baseline.md#round-budget-must`.

When stopping, report: cause, attempted fixes, remaining blocker, user action, retry gate, and **the work counts — how many items are complete, how many are blocked, and by which finding**.

The counts are not decoration. Restating the ownership rule does not change the incentive that breaks it: an agent facing "repair five upstream defects or report most of the batch as blocked" reaches for the repair because the alternative reads as failure. `26 items: 21 complete, 5 blocked on CON-DB-0007` is a report of work done, and it is what makes STOP a credible answer rather than a surrender. Blocked is a status, not a verdict on the run.

### Nondeterministic gates

A gate whose answer varies on identical inputs is a finding in its own right,
not a run to discard. The protocol classifies it as `environment/tooling`; what
follows is what that class obliges.

**When a gate fails and a rerun with no intervening change passes**, all of the
following are REQUIRED. A clean rerun on its own is not evidence for that gate.

- **Record it as an `environment/tooling` finding.** Not as a pass, and not as
  a code/test defect — nothing was fixed between the two runs.
- **Disclose every run.** Report the results of all runs of that gate, in order,
  with their commands. Reporting only the run that passed is
  [selective reporting](#selective-reporting-is-invented-evidence) and is
  forbidden: the evidence rules are satisfied by a clean run's command and
  output, so nothing else stops it.
- **Re-run the failing selectors in isolation** and report that result too. A
  selector that passes alone and fails in the suite is the signature of shared
  state, not of a defect in that test.
- **Name the suspected cause**, concretely: a contended port, a shared database
  or schema, an `os.tmpdir()` path, an un-namespaced cache or queue, ordering
  between workers. "Flaky" is not a cause.

Do not fix the flake by rerunning until green, and do not fix it by weakening
the test. Either the shared resource is isolated per worker or the run is
serialised — both are real changes with a real cost, which is the point.

A gate reported this way has **not passed**. It is a blocker with a named cause,
and it goes in the stop report like any other.

#### Selective reporting is invented evidence

Reporting the clean run and omitting the red ones satisfies every existing
evidence rule — a real command, a real result, freshly obtained — and still
misrepresents what happened. Which of N runs is reported is itself part of the
evidence, so omitting runs of the same gate is on the same footing as inventing
one.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- resolve or explicitly defer undefined or ambiguous items with rationale;
- verify every expected artifact exists and required sections are populated;
- scan generated artifacts for unresolved placeholders such as `TBD`, `TODO`, `TBA`, `TBC`, `XXX`, `???`, `OQ`, `OPEN QUESTION`, `UNDEFINED`, and `PLACEHOLDER`;
- run the smallest applicable smoke check and report its outcome. Only PASS satisfies this bullet: FAIL and UNRUN are blockers, so they go in a stop report with the reason, never next to a completion claim.

The first three bullets are self-inspection: they are discharged by rereading
what you just wrote, so an agent that hallucinated an artifact will confirm its
own account of that artifact. The smoke check is the only bullet whose result
can contradict that account, which is why it carries no waiver.

**The smallest applicable smoke check** is the cheapest command that executes
what this stage just produced and returns a pass/fail you did not author. Each
skill names its own next to the `Follow` line that cites this section. A skill
that names none has not been granted an exemption — it has an override left
unfilled, and that is a finding to report, not a reason to skip the bullet.

UNRUN is the same verdict `.qfai/assistant/constitution/quality.md` gives a gate
with no discoverable command, and it means the same thing here: **not passed**.
A smoke check that ran and failed is not passed either. Both stop the run: do
not declare completion on a FAIL or an UNRUN — report the outcome as a blocker
with the reason that makes it falsifiable later, and hand back the stop report
instead of the completion claim.
