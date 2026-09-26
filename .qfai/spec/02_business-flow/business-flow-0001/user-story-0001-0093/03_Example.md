# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                    | Expected                                                                               |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| EX-0001-0093-01 | AC-0001-0093-01 | `/qfai-discussion` finalizes pack `discussion-20260527075558258`                                                                         | `state.json#discussion.currentId` set to that ID; `discussion list --active` prints it |
| EX-0001-0093-02 | AC-0001-0093-02 | `currentId` absent with 3 candidate `discussion-*` dirs present                                                                          | error names the 3 candidates + `qfai discussion use <id>` recovery                     |
| EX-0001-0093-03 | AC-0001-0093-02 | `currentId` set to `discussion-20260909000000000`, which has no directory, with two other packs present; `qfai discussion list --active` | Non-zero exit, and the error names `qfai discussion use <id>`                          |
