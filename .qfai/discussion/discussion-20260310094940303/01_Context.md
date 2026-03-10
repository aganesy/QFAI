# 01_Context

## Background

QFAI（Quality-First AI Development Kit）は、AIエージェント駆動の開発において品質を最優先する CLI ツールキットである。6つの CLI コマンド（init, validate, report, doctor, guardrails, prototyping）と、9つのスキル、39のサブエージェントからなるフレームワークが仕様化されている。

現在、10個の CAP（CAP-0001〜CAP-0010）に対応する spec ディレクトリ（spec-0001〜spec-0010）が Layered Spec Architecture で構築されており、各 spec は 10 ファイル構成（01_Spec〜10_Plan）で管理されている。

## Purpose

本ディスカッションの目的は、既存 specs 全体を深く監査し、以下の観点から不足・不整合を特定して対処方針を決定することである:

1. 各 spec 内の完全性（10ファイル全てが実質的に記述されているか）
2. トレーサビリティチェーン（US→AC→BR→EX→TC）の整合性
3. spec 間の依存関係と相互参照の明示性
4. \_policies 層と spec 層の分離原則の遵守
5. フレームワーク設計 spec（CAP-0007〜0010）と CLI 実装 spec（CAP-0001〜0006）の整合性

## Audit Findings Summary

### 全体評価: 完成度 99.5%（EXCELLENT）

全 100 ファイル（10 spec × 10 files）が存在し、実質的な内容を持つ。以下に特定されたギャップを列挙する:

### 特定されたギャップ

| ID     | Spec           | 箇所                 | 問題                                                                                   | 影響度 |
| ------ | -------------- | -------------------- | -------------------------------------------------------------------------------------- | ------ |
| GAP-01 | spec-0002      | 10_Plan.md           | 33+ バリデータが列挙されておらず、フェーズマッピング（full/atdd/tdd/refinement）が不明 | MEDIUM |
| GAP-02 | spec-0003      | 10_Plan.md           | validate.json スキーマバージョニング機構が未定義                                       | LOW    |
| GAP-03 | spec-0004      | 10_Plan.md           | NFR-0041（日本語メッセージ）の i18n 実装戦略が不明                                     | LOW    |
| GAP-04 | spec-0005      | 04_Business-Rules.md | ガードレール定義の解析フォーマット（Markdown 構造）が未明示                            | MEDIUM |
| GAP-05 | spec-0006      | 10_Plan.md           | 他 spec への依存関係が明示されていない                                                 | LOW    |
| GAP-06 | spec-0007/0008 | 10_Plan.md           | 相互参照（Skill↔Agent）が一方向のみ                                                    | LOW    |
| GAP-07 | spec-0009      | 10_Plan.md           | バリデーションルール → TC マッピングが不明確                                           | LOW    |

## Stakeholders

| Role                    | Interest                               |
| ----------------------- | -------------------------------------- |
| AI Agent（実装者）      | spec を読んで正確に実装できるか        |
| QA Engineer             | テストケースとトレーサビリティの完全性 |
| Project Lead（aganesy） | プロジェクトの品質と進捗               |
| CI/CD Engineer          | validate コマンドの信頼性              |

## Assumptions

1. 既存 spec の構造的フレームワーク（Layered Spec Architecture）は正しく、変更不要
2. 各 spec の基本的な US/AC/BR/EX/TC は品質良好であり、追加・修正は実装計画レベルに限定
3. \_policies 層の 10 ファイルは完全であり、変更は不要
4. コントラクト層（contracts/）は CLI ツールとして正しく空であり、変更不要

## Issues

- 実装チームが 10_Plan.md を読んだ際に、具体的な手順が不明瞭な箇所がある
- 特に spec-0002 のバリデータ列挙が不足しているため、実装開始時に追加調査が必要になるリスク
