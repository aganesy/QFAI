# 07 Decisions

## Decisions

1 item.

### DR-0006-0001: --fail-on 未指定時は常に exit 0

- --fail-on が指定されない場合、doctor は常に exit 0 で終了する
- Why: doctor は診断ツールであり、デフォルトでビルドを失敗させるべきではない

### DR-0006-0002: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0010 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: doctor コマンドは tests/cli/doctor.test.ts で既に広範にカバー済み。one-shot GREEN で exception に確定する

### DR-0006-0003: review-pack TTL archival default — references DR-0264 (v1.9.2 Second-Wave)

- Decision: `qfai doctor --clean` の stale review-pack TTL は既定 14 日、`qfai.config.yaml#review.staleTtlDays` で設定可能。archival は `.qfai/review/_archive/<ts>/` への move のみ (never delete)。`qfai validate --profile review` は `_archive/` を out-of-scope とする。
- Basis: 上位 DR-0264 (`_policies/08_Decisions.md`)。本 spec slice は同 DR を copy-down して REQ-0153 / US-0006-0008 を実装する (OQ-0155 はこの DR で resolved)。
- Why: 14d は high-churn (4 packs/4 days) と low-churn (週単位) の中間で、config key が両 churn profile を調整可能にする。
