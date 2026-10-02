# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                            | Expected                                                                                               |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| EX-0001-0126-01 | AC-0001-0126-01 | Declarations `color: inherit`, `font-family: initial`, `border-radius: unset`, `box-shadow: revert`, `background-color: currentColor`, when each of the four scanners evaluates its declaration. | `designMdViolations[]` is empty. Unit test matrix exercises `5 keywords × 4 scanners = 20` pass cells. |
