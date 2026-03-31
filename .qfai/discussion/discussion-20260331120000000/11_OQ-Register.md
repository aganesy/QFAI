# OQ Register

| OQ-ID   | Title                                                | Gate       | Disposition | Owner | Rationale                                                                                                    | Options                                                                                                       | Recommendation | Next-Decision-Point | Due     | Evidence       |
| ------- | ---------------------------------------------------- | ---------- | ----------- | ----- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------- | ------------------- | ------- | -------------- |
| OQ-0001 | Old aggregator removal vs compatibility wrapper      | discussion | resolved    | agent | Compatibility wrapper minimizes migration risk while allowing deprecation path                               | (a) Complete removal (b) Compatibility wrapper with deprecation (c) Side-by-side indefinitely                 | Option (b)     | --                  | v1.7.11 | SRC-0007 SS8.6 |
| OQ-0002 | 4-axis template handling                             | discussion | resolved    | agent | Deprecation marking preserves reference while removing from defaults                                         | (a) Immediate deletion (b) Deprecation marking + removal from defaults (c) Keep as-is                         | Option (b)     | --                  | v1.7.11 | SRC-0007 SS8.2 |
| OQ-0003 | Render evidence "requested" status                   | discussion | resolved    | agent | "Requested" creates ambiguity between intention and execution                                                | (a) Keep requested (b) Remove requested and use only captured/skipped/failed (c) Add "pending" status         | Option (b)     | --                  | v1.7.11 | SRC-0007 SS8.7 |
| OQ-0004 | Browser QA phase runner scope                        | discussion | resolved    | agent | All 4 phases (smoke/visual/interaction/accessibility) need actual implementation to achieve honest reporting | (a) Implement all 4 (b) Implement smoke+visual only, defer interaction+accessibility (c) Keep foundation-only | Option (a)     | --                  | v1.7.11 | SRC-0007 SS8.8 |
| OQ-0005 | v1.7.10 skip                                         | discussion | resolved    | agent | v1.7.10 was not released; v1.7.11 follows v1.7.9 directly as completion release                              | (a) Release v1.7.10 first (b) Skip to v1.7.11 directly                                                        | Option (b)     | --                  | v1.7.11 | SRC-0007 SS1.1 |
| OQ-0006 | Reviewer asset routing sync with taste/trend/3-layer | discussion | deferred    | team  | Desirable but not release-blocking per spec SS9.2                                                            | (a) Include in v1.7.11 (b) Defer to next release                                                              | Option (b)     | v1.7.12 planning    | v1.7.12 | SRC-0007 SS9.2 |
| OQ-0007 | Critique loop wording sync with full-harness phases  | discussion | deferred    | team  | Desirable but not release-blocking per spec SS9.2                                                            | (a) Include (b) Defer                                                                                         | Option (b)     | v1.7.12 planning    | v1.7.12 | SRC-0007 SS9.2 |
| OQ-0008 | Migration docs 4-axis to 3-layer conversion examples | discussion | deferred    | team  | Desirable but not release-blocking per spec SS9.2                                                            | (a) Include (b) Defer                                                                                         | Option (b)     | v1.7.12 planning    | v1.7.12 | SRC-0007 SS9.2 |

## Summary

| Metric    | Count |
| --------- | ----- |
| Total OQs | 8     |
| Resolved  | 5     |
| Deferred  | 3     |
| Open      | 0     |
