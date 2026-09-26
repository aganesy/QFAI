# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                              | Expected                                                                                                |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| EX-0001-0031-01 | AC-0001-0031-01 | instructions ファイルが存在する状態で `qfai init --force`                                          | shipped テンプレートで再生成される                                                                      |
| EX-0001-0031-02 | AC-0001-0031-01 | `qfai init --force` where `.github/instructions/` is a symlink to a directory outside the project  | The files outside the project are unchanged                                                             |
| EX-0001-0031-03 | AC-0001-0031-01 | `qfai init --force` where `code-review.instructions.md` is a symlink to a file outside the project | The link is replaced by a regular file holding the shipped template, and its former target is unchanged |
