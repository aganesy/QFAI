# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                               | Expected                                                                                                                                                                    |
| --------------- | --------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0315-01 | AC-0001-0315-01 | `qfai sdd next-id BR CLI-0014` with no `--base`                     | stderr says `--base` requires a value; stdout holds the `qfai sdd next-id <kind> [<parent-ID>] --base <local-ref>` line and the `qfai --help` pointer, and no other command |
| EX-0001-0315-02 | AC-0001-0315-01 | `qfai validate --profile bogus`; then `qfai sdd` with no subcommand | stdout holds the `qfai validate` line for the first and every `qfai sdd` line for the second, each with the `qfai --help` pointer and without the option list               |
| EX-0001-0315-03 | AC-0001-0315-01 | `qfai --help`, `qfai sdd --help`, `qfai` and `qfai bogus`           | Each prints the whole help, with the command and option lists                                                                                                               |
