# 11_OQ-Register

## Open Questions Register

| OQ-ID   | Title                                | Gate       | Disposition | Owner | Rationale                                                               | Options                                                                 | Recommendation                          | Next-Decision-Point | Due    | Evidence                            |
| ------- | ------------------------------------ | ---------- | ----------- | ----- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------- | ------------------- | ------ | ----------------------------------- |
| OQ-0001 | v1.7.9 の release posture            | discussion | resolved    | user  | architecture 再議論か convergence release かで scope が変わる           | (A) greenfield redesign; (B) convergence/correction release             | (B) convergence/correction release      | -                   | v1.7.9 | SRC-0001 Sec 1, Sec 14              |
| OQ-0002 | validator の production wiring       | discussion | resolved    | agent | isolated validators のままでは enforcement truth が成立しない           | (A) 旧 aggregator 維持; (B) canonical registration point へ統一         | (B) canonical registration point へ統一 | -                   | v1.7.9 | SRC-0001 Sec 5.2, SRC-0002 V179-001 |
| OQ-0003 | discussion completion model          | discussion | resolved    | agent | 4-axis completion を残すと canonical field が揃わない                   | (A) 4-axis 維持; (B) taste/trend/3-layer へ収束                         | (B) taste/trend/3-layer へ収束          | -                   | v1.7.9 | SRC-0001 Sec 5.5, SRC-0002 V179-004 |
| OQ-0004 | full-harness exposure                | discussion | resolved    | user  | premium path を参照だけで終えるか、実 path として出すかの判断が必要     | (A) docs only; (B) real user-facing skill/entrypoint                    | (B) real user-facing skill/entrypoint   | -                   | v1.7.9 | SRC-0001 Sec 5.4, SRC-0002 V179-003 |
| OQ-0005 | render evidence unsupported behavior | discussion | resolved    | agent | unsupported 環境の扱いで false failure / false success の両リスクがある | (A) hard fail; (B) fake success; (C) explicit skipped/failed            | (C) explicit skipped/failed             | -                   | v1.7.9 | SRC-0001 Sec 5.7, SRC-0002 V179-008 |
| OQ-0006 | browser QA MVP scope                 | discussion | resolved    | user  | v1.7.9 でどこまで実 findings を求めるかの下限が必要                     | (A) none; (B) smoke/visual 中心の real findings; (C) all phases perfect | (B) smoke/visual 中心で real findings   | -                   | v1.7.9 | SRC-0001 Sec 5.7, SRC-0002 V179-009 |
| OQ-0007 | docs maturity vocabulary             | discussion | resolved    | agent | docs/steering/changelog の矛盾を抑えるルールが必要                      | (A) 自由記述; (B) implemented/foundation-only/deferred の語彙統一       | (B) maturity vocabulary を統一          | -                   | v1.7.9 | SRC-0001 Sec 5.9, SRC-0002 V179-011 |

## Summary

- Total OQs: 7
- Resolved: 7
- Open: 0
- Deferred: 0
- Rejected: 0
