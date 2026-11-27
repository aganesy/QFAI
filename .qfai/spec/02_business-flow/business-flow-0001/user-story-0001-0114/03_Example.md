# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                             | Expected                                                                                 |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| EX-0001-0114-01 | AC-0001-0114-01 | Non-UI work and a structured UI contract file with no `UI-NNNN` ID or no `screens[]` entry, when prototyping execution scope is determined                                                        | That file is excluded from prototyping without reading a spec-level marker               |
| EX-0001-0114-02 | AC-0001-0114-03 | No Markdown UI responsibility or structured UI contract with screens exists, when `/qfai-prototyping` resolves scope                                                                              | It writes nothing and says that no UI-bearing UI contract was resolved                   |
| EX-0001-0114-03 | AC-0001-0114-02 | A structured UI contract declares `UI-0007` with screens and a Markdown contract declares `UI-0011`, and no spec marker or primary spec pin exists, when `/qfai-prototyping` resolves scope once. | Both UI contract IDs enter the same invocation and no per-spec selection prompt appears. |
