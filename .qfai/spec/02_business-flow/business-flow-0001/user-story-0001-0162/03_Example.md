# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                        | Expected                                                                                     |
| --------------- | --------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| EX-0001-0162-01 | AC-0001-0162-02 | Given verify runs on a UI-bearing repo When validate returns an error        | Then verify remains non-pass                                                                 |
| EX-0001-0162-02 | AC-0001-0162-03 | Given the validate command is loaded When its public entrypoint is inspected | Then Validate imports the canonical validator and exposes no removed compatibility namespace |
| EX-0001-0162-03 | AC-0001-0162-01 | Given `/qfai-verify` is invoked When it selects validation scope             | Then it runs full-scan validation rather than a diff-only shortcut                           |
