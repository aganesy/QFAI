# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                          | Expected                                                                                                                                                                                                 |
| --------------- | --------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0022-01 | AC-0001-0022-01 | `qfai init --force`, with a custom skill under `skills.local/` | `skills/` is overwritten and `skills.local/` is left untouched. With the `rule/ skill/ agent/ prompt/` assistant tree, `skill/` is overwritten and a custom skill under `skill.local/` is left untouched |
