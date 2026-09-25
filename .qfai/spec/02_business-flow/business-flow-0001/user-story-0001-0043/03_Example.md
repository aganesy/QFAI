# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                    | Expected                                                                                                                                                                                                                                                                                              |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0043-01 | AC-0001-0043-01 | Given a project with `.qfai/assistant/steering/` (legacy single layer) still on disk When `qfai validate` runs in v1.9.x | Then a warning surface fires naming the offending dir + the canonical 4-layer enum With the `rule/ skill/ agent/ prompt/` assistant tree, the same `steering/` directory is named with the layers `rule`, `skill`, `agent` and `prompt`, and a `skill.local/` directory beside them raises no finding |
