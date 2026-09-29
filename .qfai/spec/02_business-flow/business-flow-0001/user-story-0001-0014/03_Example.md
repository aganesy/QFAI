# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                       | Expected                                                                                        |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| EX-0001-0014-01 | AC-0001-0014-01 | A discussion pack has `OQ-0001` marked `Disposition: open` in `11_OQ-Register.md`; completion is requested. | Completion stops and reports `OQ-0001` as open.                                                 |
| EX-0001-0014-02 | AC-0001-0014-01 | The same OQ is marked `Disposition: deferred`, but `13_Deferred.md` has no matching details.                | Completion still stops until the deferred record is complete.                                   |
| EX-0001-0014-03 | AC-0001-0014-01 | `OQ-0001` marked `Disposition: deferred`, with a matching `13_Deferred.md` record                           | Completion does not stop on `OQ-0001`: no `QFAI-DPACK-004` or `QFAI-DPACK-007` finding names it |
