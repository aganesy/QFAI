# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                            | Expected                                                                                                                                                                    |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0180-01 | AC-0001-0180-01 | Given a legacy `session-handoff.yaml` with fields not in the canonical schema When the operator runs `qfai handoff upgrade session-handoff.yaml` | Then a conforming `handoff.yaml` is emitted at the canonical path with the recognized fields mapped and every original field preserved under a `legacy:` key (no data loss) |
