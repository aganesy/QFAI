# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                           | Expected                                                                                                                                                         |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0043-01 | AC-0001-0043-01 | A project on the `rule/ skill/ agent/ prompt/` tree, with its `step/` directory, a `.qfai/assistant/notes/` directory and a `skill.local/` directory, when `qfai validate` runs | `QFAI-ASSISTANT-001` at warning names `notes/` and the layers `rule`, `skill`, `step`, `agent` and `prompt`; neither `step/` nor `skill.local/` raises a finding |
