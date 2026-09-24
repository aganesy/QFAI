# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                        | Expected                                                                                                                     |
| --------------- | --------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0028-01 | AC-0001-0028-02 | Windows (Developer Mode OFF) で `qfai init`                                  | EPERM エラー + Developer Mode 案内メッセージ                                                                                 |
| EX-0001-0028-02 | AC-0001-0028-01 | Run `qfai init` inside a Git repository whose `core.symlinks` is not enabled | Init sets `git config core.symlinks true`; the observation comes from a behavioral init run rather than a source-text search |
