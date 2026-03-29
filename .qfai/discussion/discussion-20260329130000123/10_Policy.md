# 10 Policy

## Metadata

| Key | Value |
| --- | --- |
| Discussion ID | discussion-20260329130000123 |
| Date | 2026-03-29 |

## Policy Decisions

1. default path は static-first を保持し、runtime-heavy checks を universal default に戻さない
2. optional capability は absent 時に fail-open / skipped を基本とする
3. browser availability by default、external tool install success、screenshot semantic quality、critique correctness は hard gate にしない
4. browser QA は structured outputs を返し、report で修正可能な形へ落とす
5. runtime correction は evidence/backends/browser QA と slice 分離できるよう保つ

## Security / Compliance Notes

- セキュリティ固有の新規 hard requirement は低影響想定
- optional backend registration は秘密情報を evidence や report に直接出さない前提で扱う

## Rollback Policy

- static-first correction を最優先 slice として独立 revert 可能にする
- evidence/backends は capability registration 単位で切り離せるようにする
- browser QA は phase ごとに無効化可能な設計を優先する
