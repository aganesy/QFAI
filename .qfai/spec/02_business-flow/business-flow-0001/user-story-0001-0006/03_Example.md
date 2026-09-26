# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                           | Expected                                                                                                                                                   |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0006-01 | AC-0001-0006-01 | `01_policy/` of a story tree                                                                    | It holds `objective.md`, `initiative.md`, `principle.md`, `glossary.md` and `constraint.md`                                                                |
| EX-0001-0006-02 | AC-0001-0006-02 | The contract layer at `paths.contractsDir`                                                      | It holds `contracts.md`, `tech.md`, `structure.md` and the directories `api/`, `db/`, `ui/`, `cli/` and `design/`, and `CON-*` IDs keep their current form |
| EX-0001-0006-03 | AC-0001-0006-02 | Every file under `api/`, `cli/` and `design/` of the contract layer has a row in `contracts.md` | No unlisted-contract finding                                                                                                                               |
| EX-0001-0006-04 | AC-0001-0006-02 | `cli/new-command.md` in the contract layer has no row in `contracts.md`                         | An unlisted-contract error names `cli/new-command.md` by its path                                                                                          |
| EX-0001-0006-05 | AC-0001-0006-02 | The sample story tree built from the `qfai-sdd` templates                                       | The quality-gate commands appear in the `## Standard commands (copy-paste)` section of `tech.md` and in no other file, `qfai.config.yaml` included         |
