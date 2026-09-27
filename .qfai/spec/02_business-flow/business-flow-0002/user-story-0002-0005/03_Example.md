# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                        | Expected                                                                                                                                                  |
| --------------- | --------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0002-0005-01 | AC-0002-0005-01 | 配布 set に organization-private label literal を planted し selector を検査 | planted は reject される。clean 状態では全 selector が repository variable を読み、default は public GitHub-hosted label。非 public label literal は 0 件 |
| EX-0002-0005-02 | AC-0002-0005-01 | 配布 set の各ファイル header block を parse                                  | 各 header が variable 名 / default / 無期限 queue 失敗モード / `packageManager` 前提条件 / 担当 layer / inert 化条件 / fail-open 挙動を記載している       |
