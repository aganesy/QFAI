# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                 | Expected                                                                                        |
| --------------- | --------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| EX-0001-0021-01 | AC-0001-0021-01 | `qfai init` with an existing `.qfai/` | Existing files are skipped and only missing files are added; the report shows the skipped paths |
| EX-0001-0021-02 | AC-0001-0021-01 | `qfai init` run several times         | A correct symlink is skipped and a broken symlink is recreated                                  |
