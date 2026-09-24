# 04 Business Rules

## BR-0009-0001: No Source/Test Modification

- AC-Refs: AC-0009-0001

- `/qfai-configure` MUST NOT modify tests or source code. Only `qfai.config.yaml`, steering files, and evidence are modified.
- On the story tree, the write set is `qfai.config.yaml`, the five files BR-0009-0008 names, and evidence. Nothing under `.qfai/assistant/catalog/` is written.

## BR-0009-0002: Exclude Glob Minimalism

- AC-Refs: AC-0009-0002

- Exclude globs are added only when necessary beyond default exclusions (`node_modules`, `.git`, `.qfai`, `dist`, `build`, `coverage`, `.next`, `out`).

## BR-0009-0003: specSections Opt-in

- AC-Refs: AC-0009-0003

- `validation.require.specSections` is updated only when the user explicitly requests strict required headings.

## BR-0009-0004: Steering TBD Tracking

- AC-Refs: AC-0009-0004

- When steering content cannot be verified from repository evidence, it MUST be written as `TBD` and recorded as what evidence is missing.
- On the story tree, the same applies to the five files BR-0009-0008 names.

## BR-0009-0005: Zero Match Stop

- AC-Refs: AC-0009-0005

- If zero test files match the proposed globs, the skill MUST stop and ask for clarification rather than proceeding silently.

## BR-0009-0006: Specs Directory Written Only When Absent

- AC-Refs: AC-0009-0008

- On a project on the story tree, `/qfai-configure` writes `paths.specsDir: .qfai/spec` only when `qfai.config.yaml` has no `paths.specsDir`.
- An existing `paths.specsDir` is kept, whatever its value.
- It never writes `paths.specsDir: .qfai/specs`.
- The key and its default are stated in `.qfai/contracts/cli/qfai-init.md#configuration`.

## BR-0009-0007: Overrides Written Only for What the User Changes

- AC-Refs: AC-0009-0003

- With the `rule/ skill/ agent/ prompt/` assistant tree, the routing and review-profile defaults are built into the package. `/qfai-configure` records a project's changes to them in `qfai.config.yaml` as overrides.
- It writes an override only for a skill whose agent assignment, or a review profile whose settings, the user asked to change.
- An override is the whole entry, keyed the way the default is keyed: a routing entry by its skill, a review profile by its name.
- A default the user did not change is not copied into `qfai.config.yaml`.
- It writes no routing file and no review-profile file into the project.
- The override keys are stated in `.qfai/contracts/cli/qfai-init.md#configuration`.

## BR-0009-0008: Each Fact Stated Once in the Five Merged Files

- AC-Refs: AC-0009-0004

- On the story tree, `/qfai-configure` writes each fact into exactly one of five files: `<paths.specsDir>/01_policy/objective.md`, `<paths.specsDir>/01_policy/initiative.md`, `<paths.specsDir>/01_policy/principle.md`, `<paths.contractsDir>/tech.md` and `<paths.contractsDir>/structure.md`.
- The quality-gate commands live only in the Standard commands section of `<paths.contractsDir>/tech.md`. No gate command is written into `qfai.config.yaml`.
- Nothing is written under `.qfai/assistant/catalog/`.
- The five files are stated in `.qfai/contracts/cli/qfai-init.md#the-spec-tree`.
