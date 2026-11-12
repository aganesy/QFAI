---
name: sdd-flow
owner: qfai-sdd
purpose: "Write the policy and technology facts and the business flows the triage decided to change."
requires: []
---

# sdd-flow

Stage 2 of the story tree: policy and business flows.

## Reads

- The triage decisions `sdd-triage` made, and the scope it triaged.
  Write only that scope.
- The paired templates under
  `.qfai/assistant/skill/qfai-sdd/templates/spec/01_policy/`,
  `.qfai/assistant/skill/qfai-sdd/templates/spec/02_business-flow/` and
  `.qfai/assistant/skill/qfai-sdd/templates/spec/03_contract/tech.md`.
- `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md#document-shapes`,
  for what a template cannot show.
- `.qfai/assistant/skill/qfai-sdd/references/sdd-phase-checklists.md#policy-and-business-flow`
  when editing.
- `.agents/rules/document-schema.md`, when writing or editing a story-tree document: start from
  its template and add no section the schema does not name.

## Writes

- `01_policy/objective.md`, `initiative.md`, `principle.md`, `constraint.md`
  and `glossary.md`.
- `03_contract/tech.md`.
- `02_business-flow/business-flows.md` and each affected
  `business-flow-NNNN/business-flow.md`.

Use the paired template for every file. Write only the triaged scope, as
`.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#critical-decisions-and-no-question-mode`
states.

## Procedure

1. Run the pre-draft grilling checkpoint for `Policy and flows` in
   `.qfai/assistant/skill/qfai-sdd/references/sdd-pre-draft-grilling.md` before
   the first write, and write each decision it adopted as an Agent decisions
   row of the run's deliberation record.
2. Write each fact once across `01_policy/objective.md`, `initiative.md`,
   `principle.md` and `03_contract/tech.md`.
3. Write `tech.md` from its template: the stack in `## Stack`, Runtime,
   Platform and Surface rows included, Surface holding the one surface the
   product targets, `web`, `mobile`, `desktop`, `cli` or `non-ui`, or `mixed`
   when it targets several; the layers in `## Architecture`; each runtime
   dependency with its reason in `## Dependencies`; and the quality-gate
   commands, one labelled item each, only in the Standard commands section of
   `tech.md`. Other documents point there. `tech.md` holds no rules and no
   constraints: a rule goes to the contract that enforces it, a constraint to
   `01_policy/constraint.md`.

   Write `## Architecture` from the technical decisions the deliberation record
   settles and, in an existing codebase, from its module layout and import
   directions. A layer is a group of modules with a dependency direction: an
   upper layer may use the layers below it, and a lower layer never knows an
   upper one. Draw the layers first, as one `mermaid` `flowchart TD` with a
   node per layer and an `Upper --> Lower` edge per dependency. Then list them
   in the table, one row per layer from the uppermost down: what it is
   responsible for, and the layers below it that it uses, or `-`. Depends on
   points only downward, and the diagram and the table name the same layers
   and edges. Name layers, never paths. `/qfai-implement`
   places new code by this table and the reviewers judge a change against it:
   a new module belongs to one layer and imports only from the layers its row
   lists. Add a layer when a contract needs one; a layer boundary never goes
   to `constraint.md`.

4. Write every file in its template's shape and nothing more, as
   `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md#document-shapes`
   states: policy holds criteria rather than definitions, and no section
   records history.
5. Write each answer of the deliberation record that policy or `tech.md` owns
   into its file, as
   `.qfai/assistant/skill/qfai-sdd/references/requirements-decomposition.md#where-each-answer-goes`
   maps it: risks to `initiative.md` `## Risks`, trade-off priorities to the
   Decision priorities of `principle.md`, terms to `glossary.md`, product-wide
   quality targets to `constraint.md` `## Quality targets`, legal and
   compliance limits to its `## Legal and Compliance Constraints`, and the
   target surfaces to the `tech.md` `Surface` row. A technical constraint that
   is a layer boundary is a `tech.md` `## Architecture` row. A row takes the
   next ID of its section, which is its place in the table. It keeps only the
   columns its template has, in plain words: a file name, a command or a rule
   ID stays out of policy.

6. Create or update `02_business-flow/business-flows.md` and each affected
   `business-flow-NNNN/business-flow.md`. The index holds one row per flow —
   its ID, the title in its H1 after the ID, and its directory — and nothing
   else. The flow document holds its purpose as prose, exactly one Mermaid
   `flowchart` or `sequenceDiagram` under `## Flow`, and a list of its alternate
   and exception paths.
7. A flow and its user stories describe observable outcomes, not implementation
   steps.
8. Allocate BF IDs as
   `.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md#id-allocation`
   states, and add the new rows to the flow index.
9. Parse the diagrams in the Markdown files this step wrote with Mermaid's own
   grammar. `npx qfai validate` checks only that a diagram is there.
   - Where the project has no `node_modules/qfai`, install the release that
     `npx qfai --version` prints into a directory of its own, and read
     `tmp/qfai-release/node_modules/qfai/` wherever the steps below name
     `node_modules/qfai/`:

     ```bash
     npm install --no-save --no-audit --no-fund --ignore-scripts --prefix=tmp/qfai-release qfai@<version>
     ```

   - Read the `mermaid@` and `jsdom@` versions from the install step of
     `node_modules/qfai/assets/init/root/.github/workflows/qfai-docs.yml`, the
     shipped copy of the installed release, and install them into
     `tmp/qfai-mermaid`, never into the project's dependency tree:

     ```bash
     npm install --no-save --no-audit --no-fund --ignore-scripts --include=optional --prefix=tmp/qfai-mermaid mermaid@<version> jsdom@<version>
     ```

   - Then run the checker:

     ```bash
     node node_modules/qfai/assets/scripts/check-mermaid.mjs --tools tmp/qfai-mermaid <files written>
     ```

     Where the release was installed, run its checker instead:

     ```bash
     node tmp/qfai-release/node_modules/qfai/assets/scripts/check-mermaid.mjs --tools tmp/qfai-mermaid <files written>
     ```

   - Fix each diagram it rejects. When the install or the run fails for
     another reason, report the syntax check as not run, never as passed.

## Passes when

Read first: the triage decisions and the triaged scope. The step passes when
that scope changes no policy fact, no `tech.md` entry and no flow document. The
pass names the triage decisions it read.
