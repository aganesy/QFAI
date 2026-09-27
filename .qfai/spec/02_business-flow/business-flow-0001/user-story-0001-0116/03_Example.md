# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                  | Expected                                                                          |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| EX-0001-0116-01 | AC-0001-0116-01 | Given `DESIGN.md` declares one color token and a prototype body uses an unrelated hex color. When the deterministic scanner runs.      | Then it records a color violation with location, and convergence remains blocked. |
| EX-0001-0116-02 | AC-0001-0116-01 | Given a prototype body uses declared color, font, radius, and shadow tokens and allowed literals. When the deterministic scanner runs. | Then `designMdViolations[]` is empty.                                             |
