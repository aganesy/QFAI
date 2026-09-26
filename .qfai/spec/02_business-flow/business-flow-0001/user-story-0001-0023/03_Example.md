# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                          | Expected                                                                                                   |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| EX-0001-0023-01 | AC-0001-0023-01 | `qfai init --dry-run`                                                                                          | 作成予定ファイル一覧が表示、実ファイルは作成されない                                                       |
| EX-0001-0023-02 | AC-0001-0023-01 | A project holding legacy `.qfai/assistant/skill/qfai-discussion/10_workflow.md`; `qfai init --force --dry-run` | The file is still present, and the output reports the legacy cleanup as planned (`would remove`), not done |
