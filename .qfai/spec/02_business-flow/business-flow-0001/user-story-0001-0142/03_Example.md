# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                  | Expected                                                                                                                                                                                    |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0142-01 | AC-0001-0142-01 | Given `--primary-ui-contract` values `0001`, `CON-UI-1` and `CON-UI-0001`, and `prototyping.primaryUiContract: CON-UI-0002` in config. When iterate validates the pin. | Then `0001` and `CON-UI-1` exit 2 with `primaryUiContract must be a full CON-UI-NNNN ID; received <input>`; `CON-UI-0001` is accepted unchanged and wins over the configured `CON-UI-0002`. |
