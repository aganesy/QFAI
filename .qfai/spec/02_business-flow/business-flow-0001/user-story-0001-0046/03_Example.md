# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                 | Expected                                                                                                                     |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0046-02 | AC-0001-0046-02 | A project set up by `qfai init` whose `.qfai/assistant/prompt/` directory has been removed, when `qfai validate --profile sdd --fail-on warning` runs | Validate exits 0; `counts.info >= 1`; the report lists `QFAI-ASSISTANT-002` at `info` severity for `.qfai/assistant/prompt/` |
