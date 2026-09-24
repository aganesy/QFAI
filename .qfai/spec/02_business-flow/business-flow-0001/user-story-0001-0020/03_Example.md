# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                | Expected                                                                                                                                                                                                                 |
| --------------- | --------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0020-01 | AC-0001-0020-01 | `qfai init` in an empty directory                    | `.qfai/assistant/`, `.qfai/spec/` and the project-root `qfai.config.yaml` are created. None of the old `specs/`, `contracts/`, `discussion/`, `evidence/`, `review/` or `report/` directories is created under `.qfai/`. |
| EX-0001-0020-02 | AC-0001-0020-01 | `qfai init` creates a skill link in an empty project | The link resolves to the shipped skill directory, and its `SKILL.md` is readable through the link.                                                                                                                       |
| EX-0001-0020-03 | AC-0001-0020-01 | `qfai init` runs outside a Git repository            | Init succeeds without reporting a `core.symlinks` setting change.                                                                                                                                                        |
