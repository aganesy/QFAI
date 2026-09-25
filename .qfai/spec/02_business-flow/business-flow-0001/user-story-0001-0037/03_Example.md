# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                           | Expected                                                                                                          |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| EX-0001-0037-01 | AC-0001-0037-01 | Run `qfai init` without an upgrade flag on a project carrying legacy `.qfai/assistant/steering/` at or after the v1.10.0 sunset | The legacy files remain unchanged and `D-DEPRECATED-PATH` is reported as an error on stderr without stopping init |
| EX-0001-0037-02 | AC-0001-0037-02 | Read that post-sunset `D-DEPRECATED-PATH` finding                                                                               | It names v1.10.0 and `qfai init --upgrade-assistant-tree` and does not call the legacy path read-compatible       |
