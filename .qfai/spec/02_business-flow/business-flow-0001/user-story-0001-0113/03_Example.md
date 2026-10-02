# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                            | Expected                                                                     |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| EX-0001-0113-01 | AC-0001-0113-01 | `DESIGN.md` declares one color token and a prototype body uses an unrelated hex color, when the deterministic scanner runs.      | It records a color violation with location, and convergence remains blocked. |
| EX-0001-0113-02 | AC-0001-0113-02 | A prototype body uses declared color, font, radius, and shadow tokens and allowed literals, when the deterministic scanner runs. | `designMdViolations[]` is empty.                                             |
