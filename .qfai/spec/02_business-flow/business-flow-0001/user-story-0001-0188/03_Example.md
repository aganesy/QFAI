# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                             | Expected                                                                                                                    |
| --------------- | --------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0188-07 | AC-0001-0188-05 | A request whose route is blocked only by the expected HTTP status | The session asks for the status once, as a value with no recommendation, then plans the route; no discussion stage is added |
| EX-0001-0188-08 | AC-0001-0188-05 | The plans the package ships                                       | No stage names `qfai-grill`, and a `discussion` stage appears only in `decide-design` and `decompose-epic`                  |
