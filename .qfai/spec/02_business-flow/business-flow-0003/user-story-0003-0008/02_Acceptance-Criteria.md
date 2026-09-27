# Acceptance Criteria

## Criteria

```gherkin
Feature: stale review-pack TTL archival

# AC-0003-0008-01
# Parent: US-0003-0008
Scenario: --clean が TTL 超過 review pack を archive する
  Given `.qfai/review/<old-ts>/` の mtime が TTL (既定 14 日 / DR-0264) より古い
  And `review.staleTtlDays` は未設定 (既定 14 を採用)
  When `qfai doctor --clean` を実行する
  Then 当該 pack が `.qfai/review/_archive/<old-ts>/` へ move される
  And TTL 内の pack は `.qfai/review/<ts>/` に残置される

# AC-0003-0008-02
# Parent: US-0003-0008
Scenario: --clean は削除せず、validate review は _archive を除外する (boundary)
  Given stale pack を archive 済みの状態
  When `qfai doctor --clean` を再実行し、続けて `qfai validate --profile review` を実行する
  Then archival 操作で pack が delete されることは一度もない (move のみ)
  And `qfai validate --profile review` の scan 対象は top-level `.qfai/review/<ts>/` のみで `_archive/` 配下は out-of-scope
  And in-scope pack の `QFAI-REVIEW-003/004/005` 挙動は不変

# AC-0003-0008-03
# Parent: US-0003-0008
Scenario: A tracked pack is not archived into an ignored directory
  Given a git repository whose `.gitignore` ignores `.qfai/review/_archive/`, and a committed review pack older than the TTL
  When `qfai doctor --clean` runs
  Then the pack stays in `.qfai/review/` and is not moved to `_archive/`
```
