# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-07
- Primary: spec-0002 初回作成
- Tags: validate, layered-spec, v1.5.3
- Summary: spec-0002（qfai validate）のレイヤードスペック形式での初回作成

## Rationale

- QFAI v1.5.3 でレガシーな spec-pack 形式（単一18ファイルバンドル）からレイヤードスペック形式（`_policies/` + `spec-XXXX/`）へ移行した
- validate コマンドのスペックを新形式で定義し、33+ バリデータの実装・テストの基盤とする

## Candidates Considered

1. レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
2. レガシー spec-pack 形式（単一18ファイルバンドル）

## Adopted

- Adopted: レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
- Why: CAP 単位での独立したスペック管理により、33+ バリデータの分割管理・フェーズマッピング・トレーサビリティが明確になる
- Evidence: `_policies/08_Decisions.md`, v1.5.3 マイグレーションガイド

## Rejected

- Candidate: レガシー spec-pack 形式（単一18ファイルバンドル）
- Reason: 14 US + 29 TC を単一バンドルに格納すると可読性・保守性が著しく低下し、バリデータ追加時のスケーラビリティが損なわれる
- DO NOT: spec-pack 形式（単一18ファイルバンドルに全スペックを格納する方式）に戻さないこと
- Temptation: 単一ファイルの方がシンプルに見えるが、複数 CAP のスケーラビリティが損なわれる。特に validate は US 数が多く、spec-pack 形式ではファイルが肥大化してレビュー・差分管理が困難になる

## Impact

- Affects: `.qfai/specs/spec-0002/` 配下の全ファイル（01_Spec ~ 10_Plan）、`packages/qfai/src/core/validators/` 配下の全バリデータ
- Validation: `qfai validate` でレイヤードスペック形式の必須ファイル検証（E_SPEC_MISSING_FILESET）が通過すること

## Follow-ups

- spec-0002 の実装着手（10_Plan.md に基づく）
- バリデータ群のフェーズマッピング定義
- Owner: 実装担当者
- Due: TBD

---

### DELTA-0002 (2026-03-10)

- **Primary**: 10_Plan.md にバリデータ一覧テーブル追加（V-0001〜V-0035、35件）
- **Tags**: validator-list, phase-mapping, GAP-01

#### Adopted

- 4列テーブル形式（ID/名前/説明/フェーズ）で全バリデータを列挙
- **Rationale**: 実装者が 10_Plan.md のみで全バリデータを把握可能にする（OQ-0001 解決）

#### Rejected

- 6列テーブル（AC-Ref/BR-Ref 列追加）— SSOT 原則に反し 03_AC/04_BR と重複するため
- **DO NOT**: バリデータ一覧を別ファイルに分離しないこと
- **Temptation**: 「JSON 定義ファイルにすれば実装と一致する」が、10_Plan.md は仕様ドキュメントであり実装定義ファイルではない

#### Impact

- spec-0002/10_Plan.md

---

### DELTA-0003 (2026-03-31)

- **Primary**: v1.7.11 WS-F — canonical validator entrypoint
- **Tags**: canonical-validator, aggregator-wrapper, v1.7.11
- **Summary**: v1.7.11 WS-F — canonical validator entrypoint (US-0002-0015, AC-0002-0029..0030, BR-0002-0029..0030, EX-0002-0033..0034, TC-0002-0035..0036)

#### Adopted

- Compatibility wrapper with deprecation for old aggregator (DR-0101)
- **Rationale**: 新しい canonical validator entrypoint を導入しつつ、旧 aggregator の互換ラッパーで既存コンシューマーの動作を維持する

#### Rejected

- Complete removal of old aggregator (breaks consumers)
- **DO NOT**: remove public interface without wrapper
- **Temptation**: simplify by removing old code

#### Impact

- spec-0002/01〜06 (US-0002-0015, AC-0002-0029..0030, BR-0002-0029..0030, EX-0002-0033..0034, TC-0002-0035..0036)
