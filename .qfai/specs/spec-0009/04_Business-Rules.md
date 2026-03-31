# 04 Business Rules

## BR-0009-0001: No Source/Test Modification

- `/qfai-configure` MUST NOT modify tests or source code. Only `qfai.config.yaml`, steering files, and evidence are modified.

## BR-0009-0002: Exclude Glob Minimalism

- Exclude globs are added only when necessary beyond default exclusions (`node_modules`, `.git`, `.qfai`, `dist`, `build`, `coverage`, `.next`, `out`).

## BR-0009-0003: specSections Opt-in

- `validation.require.specSections` is updated only when the user explicitly requests strict required headings.

## BR-0009-0004: Steering TBD Tracking

- When steering content cannot be verified from repository evidence, it MUST be written as `TBD` and recorded as what evidence is missing.

## BR-0009-0005: Zero Match Stop

- If zero test files match the proposed globs, the skill MUST stop and ask for clarification rather than proceeding silently.
