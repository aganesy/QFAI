# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                       | Expected                                                                                                                  |
| --------------- | --------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0012-01 | AC-0001-0012-01 | An assistant tree in the `rule/ skill/ agent/ prompt/` layout with a project `skill.local/` | The entries under `.qfai/assistant/` are `rule/`, `skill/`, `agent/`, `prompt/` and `skill.local/`, and the tree conforms |
| EX-0001-0012-02 | AC-0001-0012-01 | The same tree with `catalog/` still present                                                 | The tree does not conform: the assistant-tree check names `catalog/`, and no file under it is read                        |
| EX-0001-0012-03 | AC-0001-0012-02 | In the `rule/ skill/ agent/ prompt/` layout, `drift-protocol.md`, which several skills read | It sits at `.qfai/assistant/rule/drift-protocol.md`                                                                       |
| EX-0001-0012-04 | AC-0001-0012-02 | In the same layout, a reference file that only `qfai-atdd` reads                            | It sits under `.qfai/assistant/skill/qfai-atdd/references/`                                                               |
