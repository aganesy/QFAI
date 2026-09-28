# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                           | Expected                                                                                                                                            |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0177-01 | AC-0001-0177-01 | A skill that writes `handoff.yaml` missing the canonical schema shape (or an asymmetric edit touching only `handoff.ts` and not its consuming writers), when the Reviewer Gate evaluates the PR | It emits `R-HANDOFF-SCHEMA-DRIFT` (severity error), and a conforming `handoff.yaml` with extra per-skill keys passes (`additionalProperties: true`) |
