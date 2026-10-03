# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                             | Expected                                                                                                                             |
| --------------- | --------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0108-01 | AC-0001-0108-01 | A review whose `layoutAntiPatternsDetected` holds `lap-007-state-not-represented` | Its `informationArchitecture` score is at most `acceptable`                                                                          |
| EX-0001-0108-02 | AC-0001-0108-02 | A reviewer that sees a layout problem the shipped registry does not declare       | It names the problem in a blocking finding and adds no identifier to `layoutAntiPatternsDetected` that the registry does not declare |
