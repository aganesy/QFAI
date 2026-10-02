# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                   | Expected                                                                                |
| --------------- | --------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| EX-0001-0156-01 | AC-0001-0156-02 | Verify runs on a UI-bearing repo, when validate returns an error        | Verify remains non-pass                                                                 |
| EX-0001-0156-02 | AC-0001-0156-03 | The validate command is loaded, when its public entrypoint is inspected | Validate imports the canonical validator and exposes no removed compatibility namespace |
| EX-0001-0156-03 | AC-0001-0156-01 | `/qfai-verify` is invoked, when it selects validation scope             | It runs full-scan validation rather than a diff-only shortcut                           |
