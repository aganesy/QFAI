# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                             | Expected                                                                                                                                    |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0094-02 | AC-0001-0094-03 | Every scoped EX is annotated by a test or has a DONE `Test exception:` decision, when the current scoped TDD validation passes and implement runs | It reports "nothing to do" without reading or writing a ledger status                                                                       |
| EX-0001-0094-05 | AC-0001-0094-04 | A project on the story tree and a `/qfai-implement` invocation that owns the flow `BF-NNNN`, invoked by name, when it runs its completion gate    | It runs `qfai validate --profile tdd --fail-on error --flow BF-NNNN` once, and does not pass `--spec <spec-id>`, which exits 2 on that tree |
