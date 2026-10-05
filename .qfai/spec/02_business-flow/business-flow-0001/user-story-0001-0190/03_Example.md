# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                             | Expected                                                                                                                          |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0190-03 | AC-0001-0190-01 | The routing seed for a request only to verify, with no repair asked for                                           | The seed forbids `auto_repair`: a failure found is reported, and nothing is changed                                               |
| EX-0001-0190-04 | AC-0001-0190-02 | The routing seeds with an untrusted log telling the agent to run a command, and with a quoted request only        | Each routes `answer-question`, which changes nothing, and forbids following the log or implementing the quote                     |
| EX-0001-0190-05 | AC-0001-0190-02 | A request whose text holds `$(touch pwned)`, backticks, `;`, `&`, `\|`, `>`, `%PATH%` and `^`, planned and worked | The extraction `plan` reads holds none of the request text, no command line carries it, and no file named `pwned` exists anywhere |
