# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                    | Expected                                                                                        |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| EX-0003-0005-01 | AC-0003-0005-01 | `qfai doctor --format json`                                                                              | stdout parses as JSON and has the keys `root`, `config`, `checks` and `summary`                 |
| EX-0003-0005-02 | AC-0003-0005-02 | `qfai doctor --out /tmp/doctor.json --format json`                                                       | The file holds the JSON report; stdout is exactly `doctor: wrote <absolute path of the file>`   |
| EX-0003-0005-03 | AC-0003-0005-02 | `qfai doctor --format json --out <tmp>/missing/nested/doctor.json`, where `<tmp>/missing` does not exist | The parent directories are created, and the file holds the JSON report                          |
| EX-0003-0005-04 | AC-0003-0005-02 | `qfai doctor --format json --out doctor.json` (a relative path)                                          | The file holds the JSON report, and stdout is `doctor: wrote <path>` where `<path>` is absolute |
