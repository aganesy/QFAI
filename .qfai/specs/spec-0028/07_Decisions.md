# 07 Decisions

## Decisions

| DEC-ID        | Title                          | Adopted Option                                       | Source              | Rationale                                                                                                   |
| ------------- | ------------------------------ | ---------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| DEC-0028-0001 | Prototyping default correction | Static-first default                                 | Discussion DEC-0001 | Runtime-heavy obligations を default から外すことが v1.7.5 の主目的。phase mismatch と ATDD 重複を防止する  |
| DEC-0028-0002 | Evidence capability semantics  | Optional capability with captured/skipped/failed     | Discussion DEC-0002 | Default 軽量性と evidence richness を両立するため。browser availability を default hard dependency にしない |
| DEC-0028-0003 | Backend strategy               | Provider abstraction with optional registration      | Discussion DEC-0003 | Web 固定を避けつつ将来 backend を許容するため。Playwright 固定は provider 拡張性と fail-open 設計を損なう   |
| DEC-0028-0004 | Browser QA output              | Structured findings + repair suggestions             | Discussion DEC-0004 | Downstream 修正を actionable にするため。phase と repair suggestion を minimum mandatory fields とする      |
| DEC-0028-0005 | Mode split                     | Standard / low-cost / full-harness expectation split | Discussion DEC-0005 | Obligation 混線を防ぐため。mode ごとの expectation 差分を明示し reviewer と実装者が識別可能にする           |

## Rejected Options

| DEC-ID        | Rejected Option                          | Reason                                   |
| ------------- | ---------------------------------------- | ---------------------------------------- |
| DEC-0028-0001 | Runtime-heavy default を維持する         | Phase mismatch と ATDD 重複を再発させる  |
| DEC-0028-0002 | Browser availability を default hard dep | Non-web/non-visual project を壊す        |
| DEC-0028-0003 | Playwright 固定 backend                  | Provider 拡張性と fail-open 設計を損なう |
