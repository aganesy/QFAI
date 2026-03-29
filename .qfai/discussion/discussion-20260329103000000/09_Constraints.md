# 09 Constraints

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329103000000 |
| Date          | 2026-03-29                   |

## Technical Constraints

- default path に browser/web hard dependency を追加してはならない
- mode-aware semantics を壊す一括 obligation 化をしてはならない
- upstream v1.7 artifacts を前提に incremental に積み上げる

## Operational Constraints

- docs/report/tests を同時に更新しないと誤読が残る
- runtime correction は独立 revert 可能な slice を維持する
- optional capability の absent case を必ず扱う

## Quality Constraints

- static/runtime boundary consistency が崩れてはならない
- evidence declaration completeness を保つ
- backend capability declaration completeness を保つ
- mode-specific expectation consistency を保つ

## Schedule and Scope Constraints

- v1.7.5 では foundation までとし、external critique / full harness は先送りする
- schema versioning detail や taxonomy detail は deferred 管理でよい

## Risk Notes

- 機能: 高
- 性能: 中
- UX: 中
- セキュリティ: 低
- 運用: 高
