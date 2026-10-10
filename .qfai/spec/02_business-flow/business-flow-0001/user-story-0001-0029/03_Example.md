# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                              | Expected                                                           |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| EX-0001-0029-01 | AC-0001-0029-01 | Run `qfai init` in a new project with no `.github/copilot-instructions.md`.                                        | The generated file exists and cites the shipped QFAI rule masters. |
| EX-0001-0029-02 | AC-0001-0029-02 | Write a project-specific paragraph in `.github/copilot-instructions.md`, then rerun `qfai init` without `--force`. | The paragraph remains; init does not replace the file wholesale.   |
