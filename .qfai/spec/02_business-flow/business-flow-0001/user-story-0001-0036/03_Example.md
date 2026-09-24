# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                         | Expected                                                                                                                                                                                                                                                                                    |
| --------------- | --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0036-01 | AC-0001-0036-01 | Lint `packages/qfai/src/cli/commands/init.ts` | A hard-coded `.qfai/assistant/...` string literal fails the lint; paths are built only through imports from `assistantPaths.ts`. With the `rule/ skill/ agent/ prompt/` assistant tree, a hard-coded `.qfai/assistant/rule/`, `skill/`, `agent/` or `prompt/` literal fails it the same way |
