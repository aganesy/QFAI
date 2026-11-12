# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                     | Expected                                                                                                                     |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0299-01 | AC-0001-0299-01 | A record whose row chose option A, and a later `decisions.md` row that settles option B                                                                   | The agent works from option B; the record stays unchanged                                                                    |
| EX-0001-0299-02 | AC-0001-0299-01 | An implement stage and a verify stage in a project with three records                                                                                     | Neither stage opens a file under `.qfai/deliberation/`                                                                       |
| EX-0001-0299-03 | AC-0001-0299-02 | An agent in a `qfai-sdd` stage about to choose "store the record under the spec tree", which an earlier record shows as an option the user did not choose | The search finds that one row and the agent reads no other row; it puts the option to the user instead of choosing it itself |
| EX-0001-0299-04 | AC-0001-0299-03 | The shipped deliberation record template                                                                                                                  | Its opening note states that the record is history, keeps twists, is not the current state and is not read end to end        |
