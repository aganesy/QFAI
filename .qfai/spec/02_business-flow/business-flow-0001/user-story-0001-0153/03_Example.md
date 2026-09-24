# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                             | Expected                                                                                                                                                                                                                   |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0153-01 | AC-0001-0153-01 | Given a discussion pack missing `06_REQ.md`, and specs that already exist When SDD preflight runs | Then SDD continues, recording the gap as a reference-quality fact Given no discussion pack, no import-lite input, and no explicit user requirement When SDD preflight runs Then SDD stops and guides to `/qfai-discussion` |
