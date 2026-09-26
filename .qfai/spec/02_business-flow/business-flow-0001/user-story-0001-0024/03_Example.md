# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                      | Expected                                                                                                                                                                                                       |
| --------------- | --------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0024-01 | AC-0001-0024-01 | Check the skill symlinks after `qfai init` | `.claude/skills/qfai-*` is a relative symlink to `../../.qfai/assistant/skills/qfai-*`. With the `rule/ skill/ agent/ prompt/` assistant tree it is a relative symlink to `../../.qfai/assistant/skill/qfai-*` |
