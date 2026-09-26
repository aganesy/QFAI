# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                   | Expected                                                                           |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| EX-0001-0160-01 | AC-0001-0160-01 | Given `.qfai/state.json` carries `discussion.currentId: "discussion-20260527075558258"` and that dir exists When a `/qfai-sdd` downstream skill resolves the active pack via the helper | Then it returns `discussion-20260527075558258` without scanning mtimes             |
| EX-0001-0160-02 | AC-0001-0160-02 | Given `state.json#discussion.currentId` is absent and three candidate discussion directories exist When the downstream helper resolves the active pack                                  | Then it raises an error naming the three candidates and `qfai discussion use <id>` |
