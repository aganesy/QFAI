# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                   | Expected                                                                                                                                                            |
| --------------- | --------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0254-01 | AC-0001-0254-01 | The shipped `grilling.md`, read for the order inside one round          | A decision hard to reverse, or that later decisions hang on, comes first; dependency still decides which round a question belongs to                                |
| EX-0001-0254-02 | AC-0001-0254-02 | The shipped `grilling.md`, read for decisions cheap to revise           | They share one grouped question after the costly ones, each with its recommendation and reason, answered once by accepting all or naming items to decide separately |
| EX-0001-0254-03 | AC-0001-0254-02 | The shipped `grilling.md`, read for what is never grouped               | A critical decision, a fact and a decision some document requires the user to record                                                                                |
| EX-0001-0254-04 | AC-0001-0254-03 | The shipped `grilling.md`, read for an accepted group in a user session | Each item is recorded as the user's decision; grouping is not delegation, and a delegated session's rounds keep their own rules                                     |
| EX-0001-0254-05 | AC-0001-0254-01 | The shipped `qfai-grilling` skill                                       | It orders a round upstream first and puts cheap decisions in one grouped question, pointing to `grilling.md`                                                        |
