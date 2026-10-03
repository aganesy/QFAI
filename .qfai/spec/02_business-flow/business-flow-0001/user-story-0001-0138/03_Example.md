# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                           | Expected                                                                                                                                                 |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0138-01 | AC-0001-0138-01 | A request naming `0001`, then `UI-1`, then `UI-0001`, with `prototyping.primaryUiContract: UI-0002` in config, when `/qfai-prototyping` reads the pin           | `0001` and `UI-1` are refused, naming the `UI-NNNN` shape and the value received; `UI-0001` is accepted unchanged and wins over the configured `UI-0002` |
| EX-0001-0138-02 | AC-0001-0138-01 | `prototyping.primaryUiContract: CON-UI-0002` in config, UI contracts `UI-0001` and `UI-0002`, and a request naming no contract, when `/qfai-prototyping` starts | It stops before writing anything, naming `prototyping.primaryUiContract` and the value `CON-UI-0002`, and does not select `UI-0001`                      |
