# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                   | Expected                                            |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| EX-0003-0008-06 | AC-0003-0008-04 | `qfai doctor --clean` with `report.keepLatestRuns: 1`, one run log 30 days old and one from today                                                                                                       | The 30-day-old run is removed and today's run stays |
| EX-0003-0008-07 | AC-0003-0008-04 | `qfai doctor --clean` with `report.staleTtlDays: 0` and a run log 365 days old                                                                                                                          | The run log stays                                   |
| EX-0003-0008-08 | AC-0003-0008-04 | `qfai doctor --clean` with a stale run log, once with a config whose `report.staleTtlDays` is the string `"0"`, and once in a monorepo where two project roots set `paths.outDir` to the same directory | The run log stays in both cases                     |
