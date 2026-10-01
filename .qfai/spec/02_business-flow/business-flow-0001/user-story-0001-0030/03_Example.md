# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                  | Expected                                                         |
| --------------- | --------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| EX-0001-0030-01 | AC-0001-0030-01 | `qfai init` in a new repository                                        | Two files are created under `.github/instructions/`              |
| EX-0001-0030-02 | AC-0001-0030-02 | `qfai init` over an existing instructions file, including a 0-byte one | The existing file is skipped, and the report shows it as skipped |
