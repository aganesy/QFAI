# Shared Skill Operating Baseline

Use this document to keep SKILL bodies compact. Skill files should reference this baseline and only restate skill-specific additions or overrides.

## Asset Authoring Shape (Mandatory)

Read `.qfai/assistant/rule/references/asset-authoring.md` when you write or change a file under `.qfai/assistant/**` or another shipped asset, including its citation paths. It holds the shape every asset takes, which tree owns a file, how machine-readable assets split, and the form of a citation path. Not needed for a run that only reads assets or edits project files.

## Citation Path Form (Mandatory)

The form of a citation path is in `.qfai/assistant/rule/references/asset-authoring.md`, read under the same condition as the section above.

## User Questions (AskUserQuestion Protocol)

This section binds every skill and every step as written. A skill or step does
not restate it: it names only the questions of its own, and with `--auto` it
asks nothing and records explicit assumptions in its stage report.

- When a question to the user is needed, use AskUserQuestion if the tool is available. **No question is exempt** — a confirmation and a yes-or-no take the same path as anything else, because an exception is what an agent reaches for when it would rather not ask. The form a question takes is owned by `.agents/rules/user-questions.md`; this section is where it binds a skill.
- Availability is judged for **this question in this invocation**. A tool the mode withholds, or one that cannot carry the answer's shape, is unavailable for that question and takes the fallback below. A mode that permits no question at all — `--auto` — is read before this: nothing is asked, so there is no question whose availability to judge, and the fallback is not its route.
- Where the question has choices and AskUserQuestion supports them, prefer structured choices over free-text input. An open answer — one with no listable set of candidates — takes the free-text path instead; the preference ranks two ways of asking one question, and never turns an open answer into a choice. A name, a number or a sentence is usually open and is not open by type.
- If AskUserQuestion is unavailable, ask the same question in a normal message **in the shape its answer has**: explicit numbered choices where there are choices, and a plain request for the value where the answer has no listable set of candidates. Inventing options to make an open answer fit a numbered list is the failure the form rule names, and the fallback is not a licence for it.
- Where there are choices, preserve structured choice semantics when falling back.
- State why AskUserQuestion was unavailable.
- The three buckets of a skill's Default Autopilot Policy say who settles a decision **the skill performs**. A **frontier decision** put inside a grilling session is not one: it settles a design, an approach, a scope boundary or a trade-off before anything is performed, and `.agents/rules/grilling.md` owns which of those are asked and in what order. Read as a classification of every
  question an invocation can utter, the closed `ask-user` list would contradict that rule. **Two things stay classified by their subject wherever they are asked**: a mandatory approval, and a `hard-required` input the invocation consumes. A session does not reclassify either — a `hard-required` input asked inside one still stops a run that cannot get it, rather than being guessed. Where
  the interview is what the skill performs, the asking stays in `ask-user`: the bucket carries a category for a decision a declared grilling session puts to the user, open to a skill whose own operation is the interview and to no other. That skill holds a user session; a delegated session puts only its critical decisions to the user (`.agents/rules/grilling.md`). The buckets:
  - `auto-decide` — the skill settles it without asking.
  - `ask-user` — the skill asks before acting.
  - `hard-required` — no default is possible, so a run may not proceed on a guess. The value is either supplied by the
    user or read off evidence that settles it. A `testFileGlobs` proposal is settled that way: a glob either matches
    real files or it does not. Prototyping discovers UI-bearing contracts from the contract inventory without a
    `primaryUiContract` pin. Brand intent remains hard-required when the required evidence does not establish it.

  What a missing hard-required value costs a run is below.

- Spend **at most 5 clarifying questions per invocation**, the unit being one top-level skill or command invocation (a `/qfai-*` stage, `/qfai-configure`, `/web-research`, …), counted per question item rather than per AskUserQuestion call — one call carrying three question items spends three — after which the skill proceeds with labelled assumptions instead of asking. Classify each
  question, not the prompt: a question asked because a document requires a recorded human decision (an SDD triage `Approved By`, a reviewer-gate escalation) is an **approval** and spends nothing, and bundling one into a prompt does not exempt the clarifications beside it. On exhaustion, do not ask a sixth clarification — proceed with explicit, labelled assumptions and record them in the
  output, as `--auto` does; a required approval may still be asked. See `.qfai/assistant/rule/constitution.md#article-vi--clarification-budget-avoid-endless-qa`.
- When `--auto` is active, ask nothing: do not use AskUserQuestion and do not ask via plain text. Proceed with explicit assumptions and record them in the outputs. Proceeding presupposes evidence to assume from — when a step has none, it is a hard blocker: stop there and report it as a blocker instead of asking or guessing.
  How such a run may end its turn: `#unattended-runs-ending-a-turn` below.
- Mandatory approval questions and `hard-required` inputs are exempt from the budget, and exhaustion does not waive either: approvals must still be asked, and a missing `hard-required` input **that this invocation actually consumes** must be asked for rather than assumed — if it stays missing, stop instead of guessing. A `hard-required` input the requested path never reads is neither
  asked for nor a blocker. Neither exhaustion nor a user's `proceed` / `done` answer is `--auto`, so these questions survive both. Under an explicit `--auto` the question is not asked at all — that run stops and names the missing input instead of inventing one. See `.qfai/assistant/rule/constitution.md` Article VI.
- **Grilling questions are exempt too, and unbounded.** A question asked inside the interview `.agents/rules/grilling.md` defines spends no budget, and a session runs to its own end condition — for a user session an empty frontier and the user's confirmation, which is itself in the exempt class, and for a delegated one no open node and an answer to every critical decision — rather than to a count.
  An exhausted budget does not close one, because its questions never opened it. A
  session is entered deliberately: an invocation declares one and nothing else starts one, so a question asked outside a declared session is an ordinary clarification and spends a unit, whatever its subject.
  Under an explicit `--auto` the session asks nothing, a delegated one still adopts every decision that is not critical, and each node it could not settle is opened as a question in the register the stage reads. Each node, not each decision: a fact only
  the user holds cannot be settled from evidence either, and a fact declared undefaultable stops the run rather than taking a value nobody has. Where a document requires the field to hold something, write the defaulted value and label it an assumption beside that open question; what is forbidden is the assumption with no open question against it (Article X, rule 6).

## Unattended Runs: Ending a Turn

Under `--auto` nobody is there to reply. A message with no tool call in it ends the turn, and an ended turn stops the run whether or not the work is done. The Completion Contract below cannot catch this: the stage is incomplete, and nothing is left running to notice.

While work is still owed, a turn must not end with any of these:

1. A summary that announces the next step and does not take it.
2. An offer to carry on unless the user would prefer otherwise. Nobody is there to answer it.
3. A list of decisions for the user when, by the agent's own account, none of them blocks the rest of the work.
4. A stop because the turn has run long or a milestone is done.

A turn may end with work still owed only when one of these holds:

- nothing can move without the user — a hard blocker, or a `hard-required` input the run cannot read off evidence;
- the thing blocking the run is deliberately protected from the agent, such as a credential, a permission or a protected branch.

That ending is a stop report under `#gate-failure-autorepair-protocol`, not a completion claim.

A status note or a recommendation is welcome. It goes in the same message as the next action.

This section does not relax the confirmation an irreversible action needs, and it does not apply where a person is there to answer.

## Default Autopilot Policy (Shared)

Every `qfai-*` skill works under the prototype below. Its three named buckets
collapse avoidable per-session prompts to zero or one by classifying each
decision the skill performs. A skill whose policy adds to the prototype carries
a `## Default Autopilot Policy` section listing only what it adds. A skill that
adds nothing carries no section.

| Bucket          | Prototype entries                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auto-decide`   | output formatting; ID / sequence numbering; append-vs-create on subject overlap; equivalent-option pick                                                                                                            |
| `ask-user`      | approval-required governance operations (a category); destructive operations (rm / overwrite / force-push); version-pin changes (`package.json#version`, branch pin); scope expansions outside the active envelope |
| `hard-required` | brand intent; the undefaultable inputs the skill itself consumes, declared per skill                                                                                                                               |

- **Equivalent-option pick means demonstrably equivalent.** A design choice is
  not one: moving it to `auto-decide` records a design nobody agreed to as
  decided.
- **The governance category is instantiated per skill.** The triage operations
  CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE are the common
  instance, each asked with a prompt that names the target and the rationale.
- **An interview skill asks its own frontier.** A skill whose own operation is
  the interview lists, under `ask-user`, the decisions a declared grilling
  session puts to the user and the confirmation that closes it. No other skill
  may.

**What a skill's own section adds.** An instance of the governance category,
naming the operations its own run cannot authorize for itself. For an interview
skill, its frontier. Under `hard-required`, the undefaultable inputs this skill
itself consumes: they are declared per skill, and the policy check fails when a
skill's section no longer names one. A skill must not introduce an entry outside
the prototype's categories. Widening triggers a Reviewer-Gate finding.

**An entry a skill never reaches costs nothing.** A decision the skill does not
perform is never asked, and a `hard-required` input it does not consume is
neither asked for nor a blocker (above). So no skill restates the prototype to
drop an entry from it.

**Steps.** An entry that only one step of a parent reaches may also be written
in that step's `## Autopilot` section. The parent's section still lists every
entry its steps add to the prototype, because that section is the one the policy
check reads.

Route every `ask-user` and `hard-required` item through
[User Questions (AskUserQuestion Protocol)](#user-questions-askuserquestion-protocol),
including its `--auto` rule. What each bucket needs inside a workflow run is
[Default Autopilot Policy inside a run](#default-autopilot-policy-inside-a-run).

## Canonical qfai Launcher (Mandatory)

- **Launcher preflight — run once, before the first gate.** Confirm the project resolves qfai from its own dependencies. Either proof is sufficient:
  - **A local binary at `node_modules/.bin/qfai`.** The normal case for npm, pnpm and Yarn configured with `nodeLinker: node-modules`.
  - **A Plug'n'Play install.** Yarn Berry's default `nodeLinker: pnp` writes no `node_modules/.bin`, so the file check alone would report a correctly installed project as UNRUN forever. Accept it when the project has a `.pnp.cjs` / `.pnp.loader.mjs` at its root and lists `qfai` in `package.json` `dependencies` / `devDependencies`; `yarn exec qfai --help` exiting 0 is the direct
    confirmation.

  If neither proof holds, every gate below is UNRUN: report it as a blocker and stop. `package.json` says which fix applies:
  - **`qfai` is listed in `dependencies` or `devDependencies`, but this checkout has no install.** A fresh clone or a new worktree has no `node_modules`, and `npx qfai` then resolves the copy of a parent directory, which may be an older version of another checkout. Run the project's install command in this checkout, then run the preflight again.
  - **`qfai` is not listed.** Install the dependency: `npm i -D qfai`, or the pnpm / yarn equivalent. `qfai` does not add itself to `package.json` on init, so a project bootstrapped with `npx qfai init` alone has no local dependency yet.

- Once the preflight passes, invoke every gate through the launcher that proof established:
  - local binary -> `npx qfai …`, which resolves to it. `node_modules/.bin/qfai …` is the same thing spelled out; prefer it when PATH reachability is uncertain.
  - Plug'n'Play -> `yarn exec qfai …` (equivalently `yarn qfai …`), which sets up the PnP environment for the child process. Do **not** fall back to `npx qfai` there: outside the PnP runtime it cannot see the workspace dependency and would fetch a remote copy instead.

  Read every `npx qfai …` example in the shipped docs as "the launcher the preflight established", not as a literal command for a PnP project.

- Never launch a gate as a bare `qfai` command: qfai is a project dependency, not a global one, so that is `command not found` on a normal local install — and a gate that cannot run is a gate that silently passes.
- The preflight is the guard, not a flag. `npx` runs "a command from a local **or remote** npm package": with nothing resolvable locally it downloads and runs one (non-interactive shells do this without prompting), and `npx --no-install` still executes a copy already sitting in the npx cache. Neither spelling can tell you the qfai that ran was this project's; only the preflight can.
- If the launcher cannot be resolved at any point, the gate is UNRUN, not PASS. Report it as a blocker instead of completing the stage.
- The project's gate commands belong in the Standard commands section of `<paths.contractsDir>/tech.md` ([Standard Commands](#standard-commands-mandatory) below). The CI workflow generated by `npx qfai init` is the one deliberate exception: it runs before any project install can be assumed and must still be able to bootstrap.

## Standard Commands (Mandatory)

A project's gate commands have one home:
`<paths.contractsDir>/tech.md#standard-commands-copy-paste`. The directory comes
from `qfai.config.yaml`.

- **Read them there and nowhere else.** Install, Format, Test, Lint, Typecheck,
  Build, Skeleton and Validate come from that section. Do not infer one from the
  package manager, a framework convention or another stack.
- **A section that offers only a whole-project command is used as written.** A
  narrower command is used only where that section, or the runner's checked-in
  configuration, declares it.
- **A capability with no entry is UNRUN, not passed.** Discover the command from
  the task-runner manifest, then the CI configuration, then the contributing
  docs, as `.qfai/assistant/rule/quality.md` sets out. Record it in that
  section before it is used, where this stage owns the file; otherwise route the
  gap to its owner through `.qfai/assistant/rule/drift-protocol.md`.
- **No other document restates the commands.** It points at that section.

The `common-gate-run` step runs a gate from this section and records it.

## FORMAT SSOT (Mandatory)

- Before writing or editing `.qfai/**`, read the template or sample for the target artifact.
- Do not copy templates or samples into prompt markdown.
- Generated artifacts match their template's headings, ordering, content kinds and table columns, and add no section, including no history section. Under `<paths.specsDir>` a document schema rejects anything else; `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md#document-shapes` states what a template cannot show.
- Completion requires a format self-check in evidence.

## Policy check (mandatory)

A run starts with the policy check, once, and does not continue affected work
on stale policy. The contract is
`.qfai/assistant/rule/workflow.md#policy-check-mandatory`.
The procedure — which files, what counts as incomplete, how a fact is filled
and where an unverifiable one goes — is the `common-policy-check` step. A
skill or step cites the step and restates none of it.

## Workflow Run Entry Check (Mandatory)

A skill that a built-in workflow plan names runs this check first, before
the policy check. The mode is `workflow.mode` in `qfai.config.yaml`. An absent key means
`active`.

| State     | Mode              | When                                               | What the skill does                                                                                                                          |
| --------- | ----------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pass-on` | `active`          | Neither invoked by name nor run by `qfai-run`      | Edit nothing. Pass the request to `qfai-run` in the same turn. Show the operator at most one line, and no explanation of modes or stages     |
| `by-name` | `active`          | Invoked by name                                    | Run standalone and end at this stage. Start no other stage. A request to take the work to the end becomes a whole run: pass it to `qfai-run` |
| `step`    | `active`          | Run by `qfai-run` as a step of the plan it follows | Do only that step's work                                                                                                                     |
| `off`     | `off` or `shadow` | Always                                             | No entry check. Behave as when invoked by name                                                                                               |

### What authorizes a run's work

- The operator's first explicit request authorizes the run's work, within the
  scope the checked route allows.
- A decision a skill's `Default Autopilot Policy` lists under `ask-user` still
  needs the operator's answer.
- A QFAI work order binds the stage to its target: one business flow, or one
  new-story slot. The stage works on that target and no other.
- The stage result names the agent instance that did the work in
  `actor: { agentInstance }`. The run records that instance as the work's
  author and never counts it as the work's independent reviewer.
- These statements add to the constitution. They except no article.

## Running Steps (Mandatory)

A step is one part of a parent skill's procedure, kept at
`.qfai/assistant/step/<name>/STEP.md`. No host lists a step as a skill; a step
runs only from its parent or from the plan `qfai-run` follows.

- **A step's `requires` names only `common-*` steps**, and a `common-*` step
  requires nothing. The deepest chain is parent, step, common step.
- **A parent's `requires` names the `common-*` steps its own body runs**, such
  as `common-review-cycle` after the last step. Like a step's, it names no
  other kind of step.
- **A step has no review of its own.** Its `routing-profile`, where it has one,
  is `default`. The review is the one its parent or its plan names.
- **Routing and review-profile overrides in `qfai.config.yaml` are keyed by
  step name.**

### A parent skill invoked by name

1. Run the [entry check](#workflow-run-entry-check-mandatory).
2. Run `common-policy-check` once, as the
   [policy check](#policy-check-mandatory) says.
3. Take the steps from the parent's `steps:` list, in that order. Skip a step
   only where the parent's body names the condition that skips it.
4. For each step: read that step's `STEP.md` and no other, run it, and pass its
   gate. Run a `common-*` step it `requires` at the point the step calls it.
   Then move to the next step.
5. After the last step, run the one review the parent names, through
   `common-review-cycle`: the specification review for `qfai-sdd` and
   `qfai-discussion`, the code review for a parent that changed code, tests or
   a change note, and none for `qfai-triage` or for a `qfai-verify` run that
   wrote nothing.
6. Complete as the parent's completion section says, reporting what each step
   produced.

A step skipped on a condition that later turns out to hold is run in its place
in the order, before the review.

### A plan's steps

`qfai-run` runs the steps of the plan `npx qfai workflow plan` returned, stage by
stage, and no other.

1. Run the entry check in the `step` state.
2. For each step of the stage, in order: read the `STEP.md` at its `path` and
   no other, run it, and pass its gate. A step the parent lists and the plan
   does not is not run. Where the work needs a step no stage of the route runs,
   stop and name the stage skill to invoke by name. A step that reports an
   outcome its branch point pairs with a route ends the route there: the steps
   after it do not run, and the work moves to that route's plan.
3. After a stage whose `review` is `spec` or `code`, run that review through
   `common-review-cycle`. A stage with no `review` has none.
4. A finding another owner must repair is reported with that owner, not an
   edit made here.

### A pass-through step

A step the plan marks `passThrough` always runs. It first reads what its
`## Passes when` section names. When that shows it has nothing to write, it
writes nothing and states why; the stage's review reads that statement.

- A pass is not a skip. The step stays in the work, and the review judges its
  reason.
- Invoked by name, a step with a `## Passes when` section passes the same way,
  and the report names the pass and its reason.

## Default Autopilot Policy inside a run

Inside a run, each bucket of a skill's Default Autopilot Policy is
satisfied by one kind of authorization the run records:

- An `ask-user` item is satisfied only by a `human_decision` that answers it.
- A `hard-required` input is satisfied by `request_scope` or by the run's
  binding.
- An `auto-decide` item needs no authorization.
- `--auto` satisfies nothing. It answers no `ask-user` item and supplies no
  `hard-required` input.

A business flow that a run's valid binding supplies counts as supplied: the
work order's target names the flow, so the skill does not ask for it. With no
binding, the flow stays `hard-required`: a direct invocation with no flow it
can resolve stops at preflight.

## Rejected Option Guard (Mandatory)

- Do not reintroduce an option whose row in `<paths.specsDir>/decisions.md` has Status `REJECTED`.
- To reconsider it, ask the user. Only on approval append a new `DEC-NNNN` row. Its Content begins `Change request:` and names the authorized repository-relative paths, the rejected row's full `DEC-NNNN` ID, and the option being reopened. Its Approach states the changed evidence, the intended story or contract change, and who approved it, when, and the option chosen. Leave the rejected row intact.
- The new row starts at `WIP` and becomes `DONE` only after the owning SDD rerun and dependent checks. A PR description or completion report alone does not reopen the option.
- The reviewer checks the new row and approval provenance before accepting a formerly rejected option. `npx qfai validate` checks the four-column decision-table shape, status vocabulary, and append-only cells; it does not infer that two differently worded options are the same.

## Gate Failure Autorepair Protocol

Read `.qfai/assistant/rule/references/gate-failure-autorepair.md` when a gate command fails or its result cannot be trusted. It holds the repair loop (inspect, classify, fix, rerun), the findings that are never repaired, when to stop and what to report, and how a gate that does not give the same answer twice is handled. Not needed while every gate passes.

## Context Summary Contract

Read `.qfai/assistant/rule/references/context-summary.md` when you hand work to a sub-agent or summarize a context for the next stage. It holds what a summary that replaces earlier context must keep. Not needed when no summary is written.

## Completion Contract (Shared)

Before declaring completion:

- resolve or explicitly defer undefined or ambiguous items with rationale;
- verify every expected artifact exists and required sections are populated — a table with no rows or a `- None.` list counts where the template allows it;
- scan generated artifacts for unresolved placeholders — `TODO`, `TBA`, `TBC`, `XXX`, `???`, `UNDEFINED`, `PLACEHOLDER`, and **undocumented** `TBD` — under the two rules below;
- run the smallest applicable smoke check and report its outcome. Only PASS satisfies this bullet: FAIL and UNRUN are blockers, so they go in a stop report with the reason, never next to a completion claim.

The first three bullets are self-inspection: they are discharged by rereading what you just wrote, so an agent that hallucinated an artifact will confirm its own account of that artifact. The smoke check is the only bullet whose result can contradict that account, which is why it carries no waiver.

**The smallest applicable smoke check** is the cheapest command that executes what this stage just produced and returns a pass/fail you did not author. Each skill names its own next to the `Follow` line that cites this section. A skill that names none has not been granted an exemption — it has an override left unfilled, and that is a finding to report, not a reason to skip the bullet.

UNRUN is the same verdict `.qfai/assistant/rule/quality.md` gives a gate with no discoverable command, and it means the same thing here: **not passed**. A smoke check that ran and failed is not passed either. Both stop the run: do not declare completion on a FAIL or an UNRUN — report the outcome as a blocker with the reason that makes it falsifiable later, and hand back the stop
report instead of the completion claim.

### What the placeholder scan does not flag

Read `.qfai/assistant/rule/references/placeholder-scan.md` when the placeholder scan reports a hit or you decide a hit is not a defect. It lists what the scan does not flag and what a surviving hit obligates. Not needed while the scan reports nothing.

### What a surviving hit obligates

The obligation a surviving hit carries is in `.qfai/assistant/rule/references/placeholder-scan.md`, read under the condition above.
