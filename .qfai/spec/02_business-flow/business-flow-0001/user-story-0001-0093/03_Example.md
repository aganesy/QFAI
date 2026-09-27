# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                     | Expected                                                                                                                           |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0093-01 | AC-0001-0093-01 | `/qfai-discussion` finalizes the pack `discussion-20260527075558258`                                                                      | `state.json#discussion.currentId` is set to that ID, and `discussion list --active` prints it                                      |
| EX-0001-0093-02 | AC-0001-0093-02 | `currentId` is absent, and three candidate `discussion-*` directories exist                                                               | The error names the three candidates and the recovery command `qfai discussion use <id>`                                           |
| EX-0001-0093-03 | AC-0001-0093-02 | `currentId` names `discussion-20260909000000000`, which has no directory, two other packs exist, and `qfai discussion list --active` runs | It exits non-zero, and the error names `qfai discussion use <id>`                                                                  |
| EX-0001-0093-04 | AC-0001-0093-02 | `currentId` is absent, the only pack is `discussion-20260101000000000`, and `qfai discussion list --active` runs                          | It exits 0, prints `discussion-20260101000000000` on stdout, and writes the stderr note "no pointer set; single candidate assumed" |
