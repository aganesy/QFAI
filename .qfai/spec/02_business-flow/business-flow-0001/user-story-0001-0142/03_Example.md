# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                | Expected                                                                                                                                                               |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0142-01 | AC-0001-0142-01 | `--primary-ui-contract` values `0001`, `UI-1` and `UI-0001`, and `prototyping.primaryUiContract: UI-0002` in config, when iterate validates the pin. | `0001` and `UI-1` exit 2 with `primaryUiContract must be a full UI-NNNN ID; received <input>`; `UI-0001` is accepted unchanged and wins over the configured `UI-0002`. |
