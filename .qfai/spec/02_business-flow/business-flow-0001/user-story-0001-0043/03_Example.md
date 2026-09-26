# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                   | Expected                                                                                                                                                                                           |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0043-01 | AC-0001-0043-01 | Given a project on the `rule/ skill/ agent/ prompt/` tree with a `.qfai/assistant/catalog/` directory, a `.qfai/assistant/steering/` directory and a `skill.local/` directory When `qfai validate` runs | Then `W-ASSISTANT-LAYOUT` at warning names `catalog/` and the layers `rule`, `skill`, `agent` and `prompt` And `D-DEPRECATED-PATH` at error names `steering/` And `skill.local/` raises no finding |
