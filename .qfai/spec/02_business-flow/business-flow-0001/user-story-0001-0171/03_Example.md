# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                     | Expected                                                                                                                           |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0171-01 | AC-0001-0171-01 | The canonical schema is edited without a corresponding update to a skill writer that consumes it, when the Reviewer Gate evaluates the PR | It emits `QFAI-HANDOFF-001` (severity error), and a handoff record with extra per-skill keys passes (`additionalProperties: true`) |
