# 11_OQ-Register

## Open Questions Register

| OQ-ID   | Title                                                              | Gate       | Disposition | Owner | Rationale                                          | Options                                                                                                              | Recommendation                                | Next-Decision-Point | Due    | Evidence            |
| ------- | ------------------------------------------------------------------ | ---------- | ----------- | ----- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------- | ------ | ------------------- |
| OQ-0001 | Full-harness entrypoint の実装形態                                 | discussion | resolved    | user  | Routing guidance のみの現状を解消する必要がある    | (A) Dedicated skill file `/qfai-prototyping-full-harness`; (B) CLI subcommand `--mode full-harness` の拡張; (C) 両方 | (C) 両方: CLI は実行パス、skill は guidance   | -                   | v1.7.8 | SRC-0001 G-09, D-09 |
| OQ-0002 | Browser QA MVP の phase 範囲                                       | discussion | resolved    | user  | 全 4-phase は v1.7.8 scope 外                      | (A) smoke only; (B) smoke + visual; (C) smoke + visual + interaction                                                 | (B) smoke + visual                            | -                   | v1.7.8 | SRC-0001 G-11, D-11 |
| OQ-0003 | 4-axis legacy の migration window 期間                             | discussion | resolved    | agent | Adopters への影響を最小化しつつ収束を促進          | (A) 即座に error; (B) v1.7.8 は warning, v1.8.0 で error; (C) v1.7.8 ~ v1.9.0 は warning                             | (B) v1.7.8 は warning, v1.8.0 で error        | -                   | v1.7.8 | SRC-0001 G-03, D-03 |
| OQ-0004 | Weak strategy schema の deprecation timing                         | discussion | resolved    | agent | Strong schema への移行を段階的に進める             | (A) v1.7.8 で即 error; (B) v1.7.8 warning, v1.8.0 error; (C) warning のみ                                            | (B) v1.7.8 warning, v1.8.0 error              | -                   | v1.7.8 | SRC-0001 G-05, D-05 |
| OQ-0005 | External critique / calibration / observability の v1.7.8 公開範囲 | discussion | resolved    | user  | Hidden infrastructure の user-facing 化範囲を限定  | (A) 全 expose; (B) docs + entrypoint のみ; (C) internal のまま                                                       | (B) docs + entrypoint のみ                    | -                   | v1.7.8 | SRC-0001 G-12       |
| OQ-0006 | Render evidence の capture 不可時の挙動                            | discussion | resolved    | agent | 環境依存で capture できない場合の honest reporting | (A) error で中断; (B) skipped + reason で続行; (C) skipped + reason + alternative suggestion                         | (C) skipped + reason + alternative suggestion | -                   | v1.7.8 | SRC-0001 G-10, D-10 |
| OQ-0007 | Anti-preference traceability の実装粒度                            | discussion | resolved    | agent | 全フロー横断は v1.7.8 scope として大きい可能性     | (A) 全フロー横断 traceable; (B) taste → axes → review のみ; (C) taste artifact のみ                                  | (B) taste → axes → review のみ                | -                   | v1.7.8 | SRC-0001 G-17       |
| OQ-0008 | Master convergence document の形式                                 | discussion | resolved    | user  | Repo 内に canonical design baseline を持つ必要     | (A) 新規 steering doc; (B) 既存 product.md を拡張; (C) specs/\_policies に追加                                       | (A) 新規 steering doc                         | -                   | v1.7.8 | SRC-0001 G-20, D-14 |

## Summary

- Total OQs: 8
- Resolved: 8
- Open: 0
- Deferred: 0
- Rejected: 0
