# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                             | Expected                                                                                                                            |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0114-01 | AC-0001-0114-01 | Run `qfai prototyping iterate --cycle 0 --target-url <url>` on a project with a root `DESIGN.md`. | The run records `DESIGN.md` at `prototyping.json#designMd.path` and the SHA-256 of its bytes at `prototyping.json#designMd.sha256`. |
