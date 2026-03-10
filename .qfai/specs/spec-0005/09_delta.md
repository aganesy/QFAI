# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-07
- Primary: spec-0005 初回作成
- Tags: guardrails, drift-prevention, cli
- Summary: qfai guardrails コマンドのスペック一式を新規作成

## Rationale

- スペック作成・修正時に \_policies/ や spec 内の制約事項からの逸脱（ドリフト）を防止する機能が必要
- AI エージェントが自律的にガードレールを参照・検証できる仕組みを提供する

## Candidates Considered

1. レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
2. レガシー spec-pack 形式（単一18ファイルバンドル）

## Adopted

- Adopted: レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
- Why: 各 spec が独立したディレクトリとして管理され、ガードレールのソース（\_policies/ と各 spec）を明確に分離できる
- Evidence: specs/\_policies/ + specs/spec-0005/ ディレクトリ構造

## Rejected

- Candidate: レガシー spec-pack 形式（単一18ファイルバンドル）
- Reason: ガードレールのソースが単一ファイル内に埋没し、検出・抽出のパースが複雑化する
- DO NOT: spec-pack 形式に戻さないこと。ガードレール定義を単一バンドルファイル内に含めてはならない
- Temptation: 単一ファイルの方がシンプルに見えるが、複数 CAP のスケーラビリティが損なわれ、ガードレール検出のためのパース処理が不必要に複雑になる

## Impact

- Affects: `.qfai/specs/spec-0005/` 配下の全ファイル
- Validation: 全テストケース（TC-0005-0001..TC-0005-0008）が pass すること

## Follow-ups

- Phase 5 実装開始
- Owner: Implementer
- Due: TBD

---

### DELTA-0002 (2026-03-10)

- **Primary**: 04_Business-Rules.md に BR-0005-0009（ガードレール検出フォーマット仕様）追加
- **Tags**: guardrail-detection, rfc2119, GAP-04

#### Adopted

- RFC 2119 キーワードベース検出（MUST/MUST NOT/SHALL/SHALL NOT/SHOULD/SHOULD NOT/MAY）
- **Rationale**: BR-0005-0001 の検出ソース定義と整合。H2 見出し限定は検出漏れリスクがある（OQ-0004 解決）

#### Rejected

- H2 見出し + テーブル行形式限定 — _policies/08_Decisions.md のフォーマットが H2+テーブルとは限らず検出漏れリスク
- **DO NOT**: 検出対象フォーマットを特定の見出しレベルに固定しないこと
- **Temptation**: 「フォーマット限定で実装が簡単」だが、ガードレール検出の目的は網羅性

#### Impact

- spec-0005/04_Business-Rules.md
