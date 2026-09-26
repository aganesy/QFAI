# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                | Expected                                                                                                                                                                                                                                                      |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0141-01 | AC-0001-0141-01 | Given a non-converged cycle 3 with 1023 `designMdViolations`, 0 anti-patterns, 1 axis below exceptional, When `iterate` emits its cycle-end summary, | Then stdout contains `[BLOCKED] exit-64 prevented by: 1023 designMdViolations (top: color=#fff at iter-03/scr_001.html:97), 0 anti-patterns, 1 axis below exceptional (aesthetics: passing).`. Category identifier names are stable additive-only (NFR-0103). |
