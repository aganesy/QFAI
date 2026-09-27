# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                        | Expected                                                                                                                                                                |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0181-01 | AC-0001-0181-01 | Given a `references/handoff.md` still describing pre-CLI-HANDOFF ad-hoc files after the implementation PR When `qfai validate --report` runs | Then the stale reference surfaces as a warning, whatever the date of the run; a doc rewritten in the same atomic PR as the implementation reports zero stale references |
