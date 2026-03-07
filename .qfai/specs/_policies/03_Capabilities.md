# 03 Capabilities

## Capability order rule

- Capabilities are listed in execution order.
- Spec directories are generated from this order (`spec-0001`, `spec-0002`, ...).
- Keep IDs stable once published.

## CAP Catalog

| CAP ID   | Statement (what)                              | Success metrics (optional)                         | Notes (optional)                       |
| -------- | --------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| CAP-0001 | プロジェクト初期化 (qfai init)                | .qfai/ 構造・ラッパー・設定が正常に生成される      | ワークスペースの初期セットアップ       |
| CAP-0002 | スペックバリデーション (qfai validate)        | 50以上のルールで全検証パス、exit code 制御が正確    | コアバリデーション機能                 |
| CAP-0003 | レポート生成 (qfai report)                    | Markdown/JSON 形式でレポートが正確に出力される      | バリデーション結果の可視化             |
| CAP-0004 | 診断ツール (qfai doctor)                      | 設定・構造の問題を正確に検出・報告する              | バリデーション前の事前診断             |
| CAP-0005 | ガードレール抽出 (qfai guardrails)            | ガードレール一覧・フィルタ・整合性チェックが動作する | ドリフト防止のための意思決定ガードレール |
| CAP-0006 | プロトタイピング検証 (qfai prototyping)       | UI フィデリティ自動生成・検証が正確に動作する       | DOM クローリングによる UI 整合性検証   |

## Authoring rules

- This file is the policy-layer SSOT for capability mapping across all specs.
- Do not copy spec-level details (US/AC/BR/EX/TC) into this file.
