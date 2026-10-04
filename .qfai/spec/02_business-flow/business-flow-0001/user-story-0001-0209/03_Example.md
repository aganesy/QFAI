# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                         | Expected                                                                                                                                     |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0209-01 | AC-0001-0209-01 | The `add-feature` plan, whose `sdd` stage lists `sdd-triage`, `sdd-flow` pass-through, `sdd-story`, `sdd-contract` pass-through, `common-design-md` pass-through and `sdd-cycle` pass-through | `plan` returns all six steps in that order, with `passThrough: true` on the four marked ones and `false` on the others, whatever the request |
| EX-0001-0209-02 | AC-0001-0209-01 | The `write-acceptance-tests` plan, for a flow whose tests need no credentials                                                                                                                 | Its implement stage holds `implement-credentials` and `implement-acceptance`; `implement-credentials` runs and passes, and is never left out |
