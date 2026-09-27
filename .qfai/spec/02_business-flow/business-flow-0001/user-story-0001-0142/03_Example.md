# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                             | Expected                                                                                                                                                                     |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0142-01 | AC-0001-0142-01 | `--primary-ui-contract` values `0001`, `UI-1` and `UI-0001`, and `prototyping.primaryUiContract: UI-0002` in config, when iterate validates the pin.                              | `0001` and `UI-1` exit 2 with `primaryUiContract must be a full UI-NNNN ID; received <input>`; `UI-0001` is accepted unchanged and wins over the configured `UI-0002`.       |
| EX-0001-0142-02 | AC-0001-0142-01 | `prototyping.primaryUiContract: CON-UI-0002` in config, UI contracts `UI-0001` and `UI-0002`, and no `--primary-ui-contract`, when iterate runs cycle 0 or show-ui-contract runs. | Exit 2 with `prototyping.primaryUiContract must be a full UI-NNNN ID; received "CON-UI-0002".`; iterate writes no `prototyping.json`, and neither command selects `UI-0001`. |
