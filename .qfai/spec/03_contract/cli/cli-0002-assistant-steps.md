# CLI-0002: Assistant Steps

- Contract scope: the step tree under `.qfai/assistant/step/`, the `STEP.md`
  frontmatter, the `steps:` list of a skill that owns steps, how such a skill
  runs its steps when invoked by name, the review each step asks for, and the
  check that refuses a step tree nothing can use
- Owning flow: `BF-0001`
- Used-by: the stage skills that own steps, `qfai-run` and the workflow core
  (through the work order), `qfai init`, and `qfai validate`
- SSOT modules:
  - `packages/qfai/src/core/validators/stepTree.ts` (the step-tree check)
- Companion contracts:
  - `.qfai/spec/03_contract/cli/cli-0022-workflow-files.md` for the plan steps and the
    predicates that make a step active
  - BR-0017-0037 and BR-0017-0044 for the steps and
    reviewers a work order carries
  - `.qfai/spec/03_contract/cli/cli-0001-assistant-routing.md` for the routing entry and
    review profile of each step
  - `.qfai/spec/03_contract/cli/cli-0011-qfai-init.md` for the rest of the assistant
    tree

## Behavior

A **step** is one unit of a stage skill's work: what it reads, what it writes,
its procedure and its gate. A **parent** is a host-visible skill that owns
steps. The parents are `qfai-discussion`, `qfai-sdd`, `qfai-prototyping`,
`qfai-atdd`, `qfai-implement`, `qfai-verify` and `qfai-maintain`. A **common
step** is a procedure several parents share; its owner is `common`.

A plan names steps, so a run does only the steps a change needs and asks only
for the reviews those steps need. A parent keeps its name and its place among
the host's skills, and runs its steps itself when invoked by name.

### The step tree

```text
.qfai/assistant/step/
  <name>/
    STEP.md
```

- The tree is flat: every step directory sits directly under `step/`.
- The entry file is `STEP.md`. No file under `step/` is named `SKILL.md`, so no
  host registers a step as a skill.
- A step's name is `<owner>-<name>`: `sdd-contract`, `implement-tdd`,
  `common-review-cycle`. It never starts with `qfai-`, the prefix of the
  host-visible skills.
- The directory name equals the `name` in its `STEP.md`.
- A step cites a parent's references and templates by project-root-relative
  path, such as `.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md`.
  Those files stay under their parent.

### `STEP.md` frontmatter

| Key               | Content                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `name`            | The step's name, equal to its directory name                                                                         |
| `owner`           | The parent skill that owns the step, or `common`                                                                     |
| `purpose`         | One sentence: what the step produces                                                                                 |
| `requires`        | The common steps this step runs. A list, possibly empty                                                              |
| `roles`           | The agents the step may dispatch, checked against its routing entry as `cli-0001-assistant-routing.md` states        |
| `routing-profile` | The step's review profile, a profile the review-profile defaults define. Absent for a step with no review of its own |

A step with no `routing-profile` runs inside a stage or a parent run whose other
steps carry the review, and adds no reviewer.

### `requires`

- A step's `requires` names only `common-*` steps.
- A common step's `requires` is empty.

So the deepest chain is parent, step, common step, and no chain loops.

### A parent's `steps:`

A parent's `SKILL.md` frontmatter carries `steps:`, the ordered list of the
steps it runs. It lists every step it owns. Any other entry is a common step,
such as `common-design-md` in `qfai-sdd`.

The parent's body names each step with the condition under which it is
skipped, and has the agent read only the current step's `STEP.md`. It holds no
step's procedure. The parent carries no `routing-profile:` and no routing entry
of its own. Its `roles:` is `orchestrator` plus the union of the `roles:` of
the steps it lists, because a parent run by name dispatches those steps'
agents and reviewers.

The entry check a parent makes before its first step, and how it runs its
steps, are stated for every parent in
`.qfai/assistant/rule/shared-skill-operating-baseline.md`, sections
`## Workflow Run Entry Check (Mandatory)` and `## Running Steps (Mandatory)`.

### A parent invoked by name

1. Read `.qfai/assistant/step/<name>/STEP.md` for the first listed step whose
   skip condition does not hold, and run it.
2. Repeat for the next listed step, one at a time, in order.
3. After the last step, run one review through `common-review-cycle`. The
   reviewers are the union of the `always_required` reviewers of the profiles
   of the steps that ran, with each `conditional_required` reviewer whose
   condition holds.
4. Complete, ending at that stage.

No review runs between two steps.

### Review

- A step's reviewers are the `always_required` reviewers of its
  `routing-profile`, as the effective review-profile defaults define them.
- A set of steps run together is reviewed once, after its last step, by the
  union of their reviewers, each role once. That set is a stage of a run, or
  the steps a parent ran when invoked by name.
- In a run whose routing result carries `authorization-restored`, a step owned
  by `qfai-implement` or `qfai-atdd` takes the `implementation-heavy` reviewers
  in that union.
- The review of the whole change stays the independent `qa-gatekeeper` PASS
  that `finish` requires (BR-0017-0142).

### Distribution

- `qfai init` copies `assistant/step/**` with the rest of the assistant tree.
- A plain upgrade treats a step whose copy differs from the shipped one as it
  treats such a skill, and `--force` replaces it with the shipped copy.
- No step is linked into a host skills directory: `.claude/skills/`,
  `.agents/skills/`, `.codex/skills/` and `.github/skills/` hold skills only.

### The step-tree check

`qfai validate` reports `QFAI-SKILLS-016` at severity error for each of these,
naming the file and the cause:

| Case                                                                                                                       | Named                  |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| A `SKILL.md` anywhere under `.qfai/assistant/step/`                                                                        | That file              |
| A step directory without `STEP.md`                                                                                         | The directory          |
| A `STEP.md` whose `name` differs from its directory name                                                                   | The directory and name |
| An `owner` that is neither `common` nor an installed skill that lists steps                                                | The step and owner     |
| A parent `steps:` entry naming no installed step                                                                           | The parent and entry   |
| A plan step naming no installed step                                                                                       | The plan, stage, step  |
| A step, not `common-*`, that its owner's `steps:` does not list                                                            | The step and owner     |
| A step that no parent lists, no plan uses and no step requires, other than `common-review-cycle`                           | The step               |
| A `requires` that is not a list, names a step that is not `common-*` or is not installed, or is not empty on a common step | The step and entry     |

A project missing a step a plan names does not start a run: `npx qfai workflow
start` refuses as fail-closed with cause `contract-undeclared`
(BR-0017-0117).

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Examples                                                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| BR-0774 | Steps Live in One Flat Tree - A step is the directory `.qfai/assistant/step/<name>/`, one level under `step/`, whose entry file is `STEP.md`. The directory name equals the `name` in its `STEP.md`, and the name has the form `<owner>-<name>` with no `qfai-` prefix. No file under `step/` is named `SKILL.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0203-21, EX-0001-0217-01, EX-0001-0217-02, EX-0001-0217-03                                                                     |
| BR-0775 | The `STEP.md` Frontmatter - A `STEP.md` frontmatter carries `name`, `owner`, `purpose`, `requires`, `roles` and, for a step with a review of its own, `routing-profile`. `owner` is a parent skill or `common`. A step with no `routing-profile` adds no reviewer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0217-03, EX-0001-0217-04, EX-0001-0216-06, EX-0001-0167-09                                                                     |
| BR-0672 | Each Stage Skill Lists Its Steps - A skill that owns a step a built-in plan names lists, in its `SKILL.md` frontmatter `steps:`, every step it owns in the order they run; any other entry is a `common-*` step. Every step a plan gives one of its stages is on that list. Its body names each step with the condition that skips it and has the agent read only the current step's `STEP.md`; it holds no step's procedure. It carries no `routing-profile:`, and its `roles:` is `orchestrator` plus the union of the `roles:` of the steps it lists. Its entry check and step loop are those of `.qfai/assistant/rule/shared-skill-operating-baseline.md`. The skill set is read from the owners of the steps `.qfai/spec/03_contract/cli/cli-0022-workflow-files.md#vocabulary` lists.                                 | EX-0001-0202-08, EX-0001-0204-02, EX-0001-0206-03, EX-0001-0207-02, EX-0001-0211-02, EX-0001-0214-04, EX-0001-0215-08                  |
| BR-0776 | A Step Requires at Most One Hop - A step's `requires` names only `common-*` steps, and a `common-*` step's `requires` is empty, so no chain of steps is deeper than parent, step and common step.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0001-0217-07                                                                                                                        |
| BR-0777 | Steps Ship With the Assistant Tree and Stay Out of Host Skill Lists - `qfai init` installs every shipped step under `.qfai/assistant/step/` with the rest of the assistant tree. A plain upgrade leaves a step whose copy differs from the shipped one as it is, and `--force` replaces it, as for a shipped skill. No host skills directory holds an entry for a step.                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0203-01, EX-0001-0203-21, EX-0001-0203-22                                                                                      |
| BR-0778 | The Step-Tree Check Fails Closed - `qfai validate` reports `QFAI-SKILLS-016` at severity error for a `SKILL.md` under `step/`; a step directory without `STEP.md`; a `name` that differs from its directory; an `owner` that is neither `common` nor an installed skill that lists steps; a parent `steps:` entry, a plan step or a `requires` entry naming no installed step; a step, not `common-*`, that its owner's `steps:` does not list; a step no parent lists, no plan uses and no step requires, other than `common-review-cycle`, which every parent runs after its last step; and a `requires` that breaks BR-0776. The shipped tree raises none of them. `npx qfai workflow start` refuses a project missing a step a built-in plan names as fail-closed with cause `contract-undeclared`, and creates no run. | EX-0001-0217-01, EX-0001-0217-02, EX-0001-0217-03, EX-0001-0217-04, EX-0001-0217-05, EX-0001-0217-06, EX-0001-0217-07, EX-0001-0217-08 |
| BR-0779 | One Review per Set of Steps - A step's reviewers are the `always_required` reviewers of its `routing-profile`. The steps of one stage of a run, and the steps a parent runs when invoked by name, are reviewed once, after the last of them, by the union of their reviewers, each role once; a parent run by name adds each `conditional_required` reviewer whose condition holds. In a run whose routing result carries `authorization-restored`, a step owned by `qfai-implement` or `qfai-atdd` counts with the `implementation-heavy` reviewers.                                                                                                                                                                                                                                                                       | EX-0001-0202-10, EX-0001-0202-11, EX-0001-0216-06, EX-0001-0216-07, EX-0001-0216-08                                                    |
| BR-0780 | A Parent Invoked by Name Runs Its Steps in Order - A parent invoked by name runs its listed steps one at a time, in order, skipping only a step whose skip condition its body states and which holds. It reads a step's `STEP.md` only when that step starts, runs no review between steps, and ends at its stage after the one review of BR-0779.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0202-10, EX-0001-0202-11                                                                                                       |
