# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                | Expected                                                                                                                     |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| EX-0003-0008-01 | AC-0003-0008-01 | `qfai doctor --clean` (`.qfai/review/2026-05-01T../` が 26 日前、`review.staleTtlDays` 未設定 = 14d) | 当該 pack が `.qfai/review/_archive/2026-05-01T../` へ move される; TTL 内 pack は残置                                       |
| EX-0003-0008-02 | AC-0003-0008-02 | archive 済み状態で `qfai validate --profile review`                                                  | `_archive/` 配下は scan されず、top-level pack のみ検査; pack は delete されない (move のみ); `QFAI-REVIEW-003/004/005` 不変 |
