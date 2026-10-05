# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                   | Expected                                                                                                                                          |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0097-01 | AC-0001-0097-01 | The prototyping delegation map names implementation, review scoring, and build roles, when the skill dispatches a cycle | Each role has a documented owner, no fixed capture identity is required, and an invalid role assignment is reported before any role is dispatched |
| EX-0001-0097-02 | AC-0001-0097-02 | The same sub-agent identity is assigned to generation and review, when the cycle dispatches both roles.                 | The assignment is reported before either role runs; generation and review use distinct sub-agent identities                                       |
