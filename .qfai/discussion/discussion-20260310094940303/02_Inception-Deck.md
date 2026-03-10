# 02_Inception-Deck

## Q1: なぜ我々はここにいるのか？

QFAI の specs を完全な形にし、実装チーム（AI Agent 含む）が迷いなく開発を進められる状態にするため。
現在の specs は構造的に 99.5% 完成しているが、実装計画（10_Plan.md）レベルで具体性が不足している箇所がある。

## Q2: エレベータピッチ

> 実装開始時にバリデータ一覧やフォーマット仕様が不明で追加調査が必要になるリスクを排除するために、
> QFAI Specs Completeness Audit は、
> 7つの特定されたギャップを解決する Discussion Pack を作成し、
> /qfai-sdd への確実なハンドオフを実現する。

## Q3: パッケージデザイン

- **名前**: QFAI Specs Completeness Audit
- **タグライン**: "実装ブロッカーをゼロにする"
- **差別化**: 既存の高品質 spec を崩さず、実装計画レベルの具体性だけを補完

## Q4: やらないことリスト

| やること | やらないこと |
|----------|------------|
| 10_Plan.md への具体的記述追加方針 | US/AC/BR/EX/TC の再構築 |
| バリデータ列挙とフェーズマッピング方針 | 新規 CAP の追加 |
| spec 間相互参照の明示方針 | _policies 層の変更 |
| ガードレール解析フォーマット定義方針 | コントラクト追加 |

## Q5: ご近所さんを知る

| 関係者 | 関わり方 |
|--------|----------|
| AI Agent（qfai-sdd 実行者） | 本 discussion の結果を元に spec 更新を実行 |
| QA Engineer | テストケースの整合性を確認 |
| aganesy（Owner） | 方針承認 |

## Q6: 解決策の概要

```mermaid
flowchart TD
    A[Specs Audit 完了] --> B{7 GAPs 特定}
    B --> C[GAP-01: Validator 列挙]
    B --> D[GAP-02: Schema Versioning]
    B --> E[GAP-03: i18n 戦略]
    B --> F[GAP-04: Guardrail Format]
    B --> G[GAP-05: Dependency 明示]
    B --> H[GAP-06: Cross-ref 補完]
    B --> I[GAP-07: Rule-TC Map]
    C --> J[REQ として記録]
    D --> J
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
    J --> K[OQ 解決]
    K --> L[Review Gate PASS]
    L --> M[/qfai-sdd ハンドオフ]
```

## Q7: 何がリスクか

| リスク | 影響 | 軽減策 |
|--------|------|--------|
| GAP 修正が既存トレーサビリティを壊す | HIGH | 10_Plan.md のみ修正対象とし、US/AC/BR/EX/TC は変更しない |
| バリデータ列挙が不完全 | MEDIUM | 既存コードベースと spec-0002 の AC/BR を突合して検証 |
| フォーマット定義が過剰仕様 | LOW | ミニマル定義に留め、詳細は実装フェーズで決定 |

## Q8: サイズ感

- 影響 spec: 7 spec（全 10 中）
- 修正対象ファイル: 最大 7 件（各 spec の 10_Plan.md または 04_Business-Rules.md）
- 見積もり: /qfai-sdd にて 1 回のパスで完了可能

## Q9: 優先順位と妥協

| 優先度 | 項目 |
|--------|------|
| 必須 | GAP-01（Validator 列挙） - 実装への影響が最大 |
| 必須 | GAP-04（Guardrail Format） - 実装への影響が中程度 |
| 推奨 | GAP-02, 03, 05, 06, 07 - 影響は小さいが完全性のため対処 |

## Q10: 何をもって完了とするか

- 7 つの GAP 全てに対して REQ が記録されている
- OQ Register の open が 0 件
- Review Gate で PASS
- /qfai-sdd へのハンドオフ準備完了
