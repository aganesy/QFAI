# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-07
- Primary: spec-0001 初回作成
- Tags: init, layered-spec, v1.5.3
- Summary: spec-0001（qfai init）のレイヤードスペック形式での初回作成

## Rationale

- QFAI v1.5.3 でレガシーな spec-pack 形式（単一18ファイルバンドル）からレイヤードスペック形式（`_policies/` + `spec-XXXX/`）へ移行した
- init コマンドのスペックを新形式で定義し、実装・テストの基盤とする

## Candidates Considered

1. レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
2. レガシー spec-pack 形式（単一18ファイルバンドル）

## Adopted

- Adopted: レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
- Why: CAP 単位での独立したスペック管理、複数 CAP のスケーラビリティ、ポリシーの共有・再利用が可能
- Evidence: `_policies/08_Decisions.md`, v1.5.3 マイグレーションガイド

## Rejected

- Candidate: レガシー spec-pack 形式（単一18ファイルバンドル）
- Reason: 複数 CAP を扱う場合にスケーラビリティが損なわれ、ポリシーの重複管理が発生する
- DO NOT: spec-pack 形式（単一18ファイルバンドルに全スペックを格納する方式）に戻さないこと
- Temptation: 単一ファイルの方がシンプルに見えるが、CAP が増えるにつれてファイル肥大化・ポリシー重複・トレーサビリティの複雑化が発生し、複数 CAP のスケーラビリティが損なわれる

## Impact

- Affects: `.qfai/specs/spec-0001/` 配下の全ファイル（01_Spec ~ 10_Plan）
- Validation: `qfai validate` でレイヤードスペック形式の必須ファイル検証（E_SPEC_MISSING_FILESET）が通過すること

## Follow-ups

- spec-0001 の実装着手（10_Plan.md に基づく）
- Owner: 実装担当者
- Due: TBD
