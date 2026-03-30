# 07_NFR

## Non-Functional Requirements Table

| NFR-ID   | Title                       | Description                                                                                                        | Source                       | Category      | Target                                | Status |
| -------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------------- | ------------------------------------- | ------ |
| NFR-0001 | Deterministic validation    | validator は presence / completeness / shape / contradiction のみを扱い、semantic design taste judgment を含まない | SRC-0001                     | Correctness   | semantic-only deterministic rules = 0 | draft  |
| NFR-0002 | Non-UI safety               | non-ui project に対して UI-bearing validator が誤発火しない                                                        | SRC-0001, SRC-0002           | Reliability   | false positive count = 0              | draft  |
| NFR-0003 | Release truthfulness        | docs / release notes / steering は実装実態より強い claim をしない                                                  | SRC-0001, SRC-0002           | Documentation | contradictory claims = 0              | draft  |
| NFR-0004 | Compatibility with guidance | legacy 4-axis project は migration guidance を伴う warning path を持つ                                             | SRC-0001, SRC-0002           | Compatibility | un-explained hard break = 0           | draft  |
| NFR-0005 | Reviewability               | review input だけで strategy, trend, anchor, contracts, runtime risk を判断できる                                  | SRC-0001                     | Operability   | reviewer blocking ambiguity = 0       | draft  |
| NFR-0006 | Mode precedence clarity     | prototyping mode resolution は explicit CLI > discussion recommendation > system default を守る                    | SRC-0001                     | Consistency   | precedence contradictions = 0         | draft  |
| NFR-0007 | Honest runtime reporting    | runtime-heavy feature は unsupported 時に explicit skip/fail reason を記録する                                     | SRC-0001                     | Reliability   | silent skip / fake success = 0        | draft  |
| NFR-0008 | Review cycle integrity      | review pack は roster 順守、`target.kind: discussion`、append-only 運用を満たす                                    | SRC-0003, SRC-0005, SRC-0006 | Process       | missing reviewer cycle = 0            | draft  |
