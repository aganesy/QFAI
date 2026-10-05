# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                               | Expected                                                                                                                                                                      |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0202-01 | AC-0001-0202-01 | A correct test of `BF-0003` annotating the EX that states the order total includes tax, which fails after a change to `src/pricing.ts` dropped the tax line, when `/qfai-implement` runs `implement-regression-fix` | It changes `src/pricing.ts` only, and no test, story or contract file. The EX is still annotated by the same test, and no `Change request:` row is appended to `decisions.md` |
