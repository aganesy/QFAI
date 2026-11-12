---
name: sdd-triage
owner: qfai-sdd
purpose: "Select the requirement source, classify each requirement against the story tree, and settle the decisions and questions the later writes depend on."
requires: []
---

# sdd-triage

Select the source, decide which part of the story tree each requirement
changes, and record that decision before anything depends on it.

## Reads

- The applicable `.qfai/assistant/rule/` files.
- `.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md`: the operation set,
  the critical decisions and the decision-row format.
- `.qfai/assistant/skill/qfai-sdd/references/requirements-decomposition.md` and
  `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md`.
- `.qfai/assistant/rule/change-classification.md`, the classification
  authority.
- The existing story tree: `01_policy/`, `02_business-flow/`, `03_contract/`,
  `decisions.md`, every page it lists in order, and `open-questions.md` under `<paths.specsDir>`; read decision pages before the root tail.
- The deliberation record this run consumes, as
  `.qfai/assistant/rule/references/deliberation-record.md#reading-a-record`
  says.

## Scope of the request

With no argument, triage all incoming requirements and edit the flows they
affect. Do not assume that every existing flow needs a rewrite. A BF argument
limits the requested work to that flow and its shared dependencies.

Inside a plan `qfai-run` follows, the business flow the request names, or the
one the session settles from the request, sets the scope. It never runs the
no-argument batch, and its gate runs with `--flow BF-NNNN` for that flow.

## Stage 0: source and preflight

1. Use the launcher established by
   `.qfai/assistant/rule/shared-skill-operating-baseline.md#canonical-qfai-launcher`.
   Record its resolved package path and version in the SDD report. Check that
   the installed Stage 0 instructions support the procedure being used.
2. Name the deliberation record this run consumes: the run's own record, or
   the one the work order names. Invoked by name with no work order, it is the
   record the user names; when the user names none, ask which record under
   `paths.deliberationDir` to use before anything is written. Run
   `npx qfai sdd preflight --record <path>` and use its `selectedInputPath`.
3. Read every table of that record, the completed reviews, explicit user
   requirements, and the existing story tree. The record is history, not the
   current state: where it disagrees with the story tree, `decisions.md` or
   `open-questions.md`, they win. State a discrepancy in the SDD report or as an
   open question. Never edit the record, to clear this stage or for any other
   reason. An Interview row the user left unanswered becomes an
   `open-questions.md` row, and SDD carries on. For the current request, read
   the existing purpose in `<paths.specsDir>/01_policy/objective.md` and inspect
   related flows and stories. Do not regenerate the existing purpose merely
   because no record exists.
4. No record does not mean that specifications are absent. For conditional
   source selection, read
   `.qfai/assistant/skill/qfai-sdd/references/sdd-execution-playbook.md#stage-0-source-inventory`.
   Use an existing readable authoritative specification with `--import <path>`;
   use an explicit user requirement as supplied, without inventing an import
   file. Stop if no usable source exists: no record of the run or named for it,
   no import-lite input and no explicit user requirement. Stop as well when a
   product decision cannot be inferred safely. Import-lite readiness does not
   establish complete requirements or a validation PASS.

## Stage 1: triage and records

Classify each incoming requirement against existing policies, flows, stories,
and contracts. Keep a related active flow or story and update its affected
descendants when it still represents the requirement. Create a flow or story
only when the existing tree cannot represent it. Trace impact through BF → US →
AC → EX and every enforcing contract.

Read the complete decision register using the Decision pages rules in the triage
reference before allocating IDs or relying on a decision. Append new rows only
to the root table, and never move a row between files; an unreadable or
incomplete register stops this stage.

Write each answer of the record into the one story-tree file that owns it, as
`.qfai/assistant/skill/qfai-sdd/references/requirements-decomposition.md#where-each-answer-goes`
maps it.

Record in `<paths.specsDir>/decisions.md` only the decisions the user made,
approvals included, that pass the recording test at the top of the
`qfai-sdd` decisions template: hard to reverse, surprising to a reader without
context, and the result of a real trade-off. Every other decision an agent
took that the deliberation-record rule counts is an Agent decisions row of the
run's deliberation record. Record unresolved questions in `<paths.specsDir>/open-questions.md`.
Every row has exactly `ID | Content | Approach`. A new row's ID is
`DEC-yyyymmddhhMMss` or `OQ-yyyymmddhhMMss`, the UTC time it is written.

- A decisions.md row is appended once, keeps its ID and is never removed or renumbered; only its wording may be restated.
- An option the user rejects is a row whose Content opens `Declined:`,
  recording who declined it and when. It authorizes nothing.
- A decision that refers to an earlier row is a new row whose Approach opens
  with the earlier ID: `Supersedes DEC-…`, `Narrows DEC-…`, or `Reopens DEC-…`
  for a declined option.
- When a decision settles an open question, the same change appends the
  decision row, naming the OQ ID, and deletes the question row.
- To defer a question already written, delete its row and append a new one
  whose Approach names the next decision point and says `Replaces OQ-…`.

A decision the agent took appends no `decisions.md` row. Do not write a second
decision-record directory or a retired story file. Listed pages are members of
the same register, not a second decision home. Write each decision's result
where it lives as the triage reference's "Where a decision's result lives"
section says: the current state only, one statement per concept.

Put each critical decision to the user before anything depends on it, as the
triage reference's "Critical decisions and no-question mode" section lists
them. A request from the user in the session that names the operation and its
effect is that answer: list the files in the announcement and ask nothing
more. Make every other story-tree or contract change yourself and list it in
the stage report. `--auto` asks no questions and never supplies its own
answer; stop before the dependent write and report pending decisions.

### UI-bearing flows

UI-bearing is a property of the affected flow, not of the files this run
happened to edit. Resolve it from the surfaces the record settles, the `tech.md`
`Surface` row and the UI contracts linked to that flow, and record it for each affected flow; the
session agent designs the screens of a UI-bearing flow itself.
`product-surface-reviewer` joins a review in a route
only for a screen change, as `common-review-cycle`'s reviewer set says;
`qfai-sdd` invoked by name keeps the reviewers its own `## Review` section names.

## Which surface owns the truth

When the request or the diagnosis names two surfaces that disagree — a
validator and the template it checks, a contract and the code, a record and
what was built — decide which one owns the truth before any later step writes.

1. Take the order the project has recorded, highest first:
   - a `decisions.md` row that settles it and that no later row supersedes;
   - the story tree and the contracts, over the code, tests and prose that
     implement them, as Article IV of `.qfai/assistant/rule/constitution.md`
     states;
   - between two surfaces of one rank, the one a policy row, a contract or a
     decision names as the source.
2. Record the owner, and the entry of that order that made it the owner, with
   the triage decision.
3. The surface that does not own the truth is the one that changes. Where that
   is code, tests or shipped prose, `implement-tdd` aligns it, and this stage
   changes no story-tree file for it.
4. Where nothing recorded settles the order, the owner is a decision at this
   step's decision point (below).

## A mechanism nothing runs

When the diagnosis finds a mechanism that exists but does nothing — a check no
lane runs, a field nothing reads, a rule no code enforces — decide whether it is
wired or retired:

- **Wire it** when a specification, a contract or a recorded decision still
  asks for what it does. The route continues.
- **Retire it** when nothing written asks for it any more, or the request says
  to remove it. Write nothing, and report `branch: { outcome: retire }`; on a
  route that declares it, the run moves to the route that removes it.

## Settled mode

A work order step with `mode: settled` applies a decision already recorded and
approved: the one the work order's `settled` field or the request cites. The
record is a `decisions.md` row, or the output of the step that branched here,
such as `branch: { outcome: contract-finding }`, which names the change, who
approved it and when.

- Read that record and the part of the story tree it names. Do not reopen,
  grill again or widen what it settles.
- Triage each requirement strictly within the record.
- An instruction that asks for more than the record settles — a new flow, a
  changed criterion, a behaviour the record never mentions — stops the step.
  Write nothing, and report `branch: { outcome: outside-record }`, which moves
  the work to `decide-design`.
- A citation that resolves to neither a `decisions.md` row nor that branch output
  stops the step: put the missing record to the operator as a question, and
  write nothing.

## At a decision point

Where the work order marks this step `decisionPoint: user`, each decision it
reaches — the owner, wire or retire, how to repair — is taken here:

- When the work order's `modifiers` hold `gate:user`, put each decision to the
  operator as a question, return `awaiting_input` and change nothing. The
  attempt holding the answers carries on.
- Otherwise take the decision, list it in the result's `adopted` as
  `{ step, decision, reason }`, and carry on.
- A critical decision goes to the operator either way: one that makes a
  specification, a contract or a recorded decision the losing side, one that
  cannot be taken back, such as removing a public command or key, or one resting
  on product intent nothing written states. The result also raises `gate:user`
  through `raise`, as `{ modifier, reason }`, for the rest of the run.

Invoked by name, record each such decision in the SDD report with whether
this step took it or the operator answered it.

## ID allocation

Allocate each new BF, US, AC, EX or BR ID from the highest ID of its kind in
scope plus one, including retired IDs named in decisions rows. BF scope is
project-wide; US scope is its BF; AC and EX scope is their US; a contract
number's scope is every contract of every kind; BR scope is its contract, whose
number the BR carries (`BR-0006-0001` belongs to `API-0006`). Empty scopes begin
at `0001`, or `01` for AC and EX tails. Take each new ID from
`npx qfai sdd next-id <kind> [<parent-ID>] --base <local-ref>` with a fetched
base: it prints the number after the highest of the working tree and the base.
A decisions.md or open-questions.md row takes its timestamp ID instead, and
reads neither the base nor any pull request.

Parallel branches pick the same next ID unless each reads the others first:

1. Before taking an ID, fetch the base. Where a forge CLI is available, list the
   open pull requests once per session through its REST API, for example
   `gh api repos/{owner}/{repo}/pulls?state=open`, and reuse that listing for
   every ID the session takes. Fetch each one's head ref, such as
   `refs/pull/<n>/head`, so a pull request from a fork is read too, and read
   the IDs it adds from `git diff <base>...<head>`. Take the highest across the
   base, the working tree and those heads, plus one. Without a forge CLI, read
   the base alone.
2. When merging the base into the branch, check each such ID the branch adds
   against the merged base. The base's item keeps its ID; the branch renumbers
   its own item and every reference to it, then runs the gates again.
3. A conflict confined to `decisions.md`, its pages or `open-questions.md` is
   resolved by `git merge origin/<base>` run locally: the union merge keeps
   both sides' rows. Push the merge. Renumber, edit or move no register row.

## Pre-draft grilling

Before this step's first mutation, run the checkpoint for `Triage and records`
in `.qfai/assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md`. The
session agent starts the griller, never a stage worker. Put each critical
decision it holds to the user, and write each decision it adopted as an Agent
decisions row of the run's deliberation record. Each later design-writing step
runs its own checkpoint the same way.

## Gate

The affected-flow scope and the answers to its critical decisions are recorded
before any drafting step starts. Every requirement has a target, an operation
the user decided or the agent took, and a recorded impact path, as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#completion-of-triage`
states.
