# 05 Contracts

## Purpose

- Keep contracts as SSOT under `.qfai/contracts/**` with deterministic IDs.
- Use this file as a readable policy-layer index with short IDs for planning and review.

## Contract Index

### DB Contracts

0 items

QFAI は CLI ツールであり、データベースを使用しない。全てのデータはファイルシステム上の YAML/JSON/Markdown ファイルとして管理される。

| Short ID | Entity | Declared ID | File | Purpose |
| -------- | ------ | ----------- | ---- | ------- |

### API Contracts

0 items

QFAI は HTTP/gRPC サービスを提供しない。`validate.json` は内部契約であり、バージョン間の互換性は保証されない（OC-02 参照）。外部向けの安定 API は存在しない。

| Short ID | Router | Declared ID | File | Purpose |
| -------- | ------ | ----------- | ---- | ------- |

### UI Contracts

0 items

QFAI は GUI を持たない CLI ツールである。`qfai prototyping` コマンドは対象プロジェクトの UI コントラクトを検証する機能であり、QFAI 自体の UI コントラクトではない。

| Short ID | Screen | Declared ID | File | Purpose |
| -------- | ------ | ----------- | ---- | ------- |

## Mapping Rules

- QFAI は CLI ツールのため、DB/API/UI コントラクトは全て 0 items である。
- `validate.json` は内部契約として扱い、Contract Index には含めない。
- 将来的にコントラクトが必要になった場合は、本ファイルにエントリを追加する。

## v1.7.1 Contract Posture

- Contracts-first review completed for `CAP-0024 / spec-0024`.
- Render Evidence Automation は `qfai prototyping` の内部 evidence schema、validator、report、docs を拡張する変更である。
- 外部向けの stable DB/API/UI contract は新設しない。
- したがって Contract Index の `0 items` は意図的な none-rationale であり、`DR-0048` と spec-0024 のスコープ境界に整合する。

## v1.7.2 Contract Posture

- Contracts-first review completed for `CAP-0025 / spec-0025`.
- Design Audit & Slop Guardrails は `qfai validate` の内部バリデータ拡張であり、外部向け stable contract は新設しない。
- `designSlopPatterns.json` は内部ルール定義ファイルであり、Contract Index には含めない。
- したがって Contract Index の `0 items` は意図的な none-rationale であり、`DR-0049` と spec-0025 のスコープ境界に整合する。

## v1.7.3 Contract Posture

- Contracts-first review completed for `CAP-0026 / spec-0026`.
- Discussion/UIUX Authoring Foundation は `qfai-discussion` スキルの内部テンプレート・SKILL.md 拡張であり、外部向け stable contract は新設しない。
- uiux/ サイドカーアーティファクトは QFAI が対象プロジェクト向けに生成するテンプレートであり、QFAI 自体の API/DB/UI コントラクトではない。
- したがって Contract Index の `0 items` は意図的な none-rationale であり、spec-0026 のスコープ境界に整合する。

## v1.7.4 Contract Posture

- Contracts-first review completed for `CAP-0027 / spec-0027`.
- UIX-VAL/UIX-REV Validation, Review, and Migration Stabilization は `qfai validate` の内部バリデータ・レビュアープロンプト拡張であり、外部向け stable contract は新設しない。
- したがって Contract Index の `0 items` は意図的な none-rationale であり、spec-0027 のスコープ境界に整合する。

## v1.7.5 Contract Posture

- Contracts-first review completed for `CAP-0028 / spec-0028`.
- Runtime & Evidence Foundation は `/qfai-prototyping` の内部 mode resolver、evidence schema、backend registry、browser QA module を変更する。
- 外部向けの stable DB/API/UI contract は新設しない。
- provider abstraction の registry interface は内部モジュール間の契約であり、Contract Index には含めない。
- したがって Contract Index の `0 items` は意図的な none-rationale であり、spec-0028 のスコープ境界に整合する。

## v1.7.6 Contract Posture

- Contracts-first review completed for `CAP-0029..CAP-0033 / spec-0029..spec-0033`.
- Critique, Calibration & Full-Harness Expansion は内部ランタイムモジュール（critique adapter, calibration pack, full-harness loop, observability, handoff/detection）を追加する変更である。
- critique adapter provider interface は内部モジュール間の契約であり、Contract Index には含めない。
- calibration pack は file-based assets であり、DB/API/UI contract ではない。
- full-harness loop, observability, handoff artifacts は内部状態管理であり、外部 stable contract は新設しない。
- したがって Contract Index の `0 items` は意図的な none-rationale であり、discussion-20260329175059391 のスコープ境界に整合する。

## v1.7.6 Remediation Contract Posture

- Contracts-first review completed for remediation discussion-20260329195516830.
- Remediation は既存内部モジュールのワークフロー層修正（static-first default, full-harness entrypoint, 3-layer eval reconciliation, strategy/contract upgrade, UI-bearing detection fix, render evidence wiring, browser QA findings, mode exposure, doc normalization, migration support）であり、新規外部 stable contract は不要。
- したがって Contract Index の `0 items` は意図的な none-rationale であり、remediation スコープに整合する。

## v1.7.8 Contract Posture

- Contracts-first review completed for `CAP-0034..CAP-0037 / spec-0034..spec-0037`.
- Canonical Convergence は既存内部モジュールの canonical architecture への収束を行う変更であり、外部向け stable contract は新設しない。
- 主な変更対象: discussion sidecar templates, UIX-VAL validators, prototyping SKILL.md, CLI commands, reviewer assets, migration validators — 全て内部モジュール。
- したがって Contract Index の `0 items` は意図的な none-rationale であり、discussion-20260330035428071 のスコープ境界に整合する。

## ER Diagram

QFAI はデータベースを使用しないため、ER Diagram は省略する。
