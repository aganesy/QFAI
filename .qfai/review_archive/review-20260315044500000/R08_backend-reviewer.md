# Review: backend-reviewer

## Reviewer

- ID: R08
- Name: backend-reviewer
- Scope: sdd

## Checklist

- [x] バックエンド・API・データ一貫性への影響を確認する
- [x] 運用・信頼性の懸念事項を確認する
- [x] YAML スキーマの妥当性を確認する
- [x] ファイル構造の整合性を確認する

## Findings

### YAML スキーマ妥当性の確認

`04_Business-Rules.md` の BR-0012-0001 を確認した。

- `review-roster.yml` への追加エントリに必須フィールドが定義されている：`id`（文字列）、`name`（文字列）、`scope`（配列・1 要素以上）、`can_be_na`（boolean）、`must_check`（配列・1 要素以上）。
- devils-advocate は `can_be_na: false`、pattern-doubler は `can_be_na: true` で登録される（AC-0012-0001, AC-0012-0002）。
- スキーマ検証は `qfai validate` コマンドが実施する（BR-0012-0001、`10_Plan.md` Phase A 完了基準）。
- ネガティブパスの検証として、`must_check` 空配列（TC-0012-0002）・`scope` 空配列（TC-0012-0004）のバリデーション FAIL が TC に明記されている。

YAML スキーマの要件定義・バリデーション戦略は適切と判断する。

### ファイル構造整合性の確認

`10_Plan.md` の主要モジュール表を確認した。変更対象ファイルが以下のとおり明記されている。

| ファイル                                          | 操作 | 説明                         |
| ------------------------------------------------- | ---- | ---------------------------- |
| `.qfai/assistant/steering/review-roster.yml`      | 修正 | 2 エントリ追加               |
| `.qfai/assistant/instructions/agent-selection.md` | 修正 | 2 エージェントの役割定義追加 |
| 全 9 SKILL.md                                     | 修正 | 委任ステップ追加             |
| 全 9 `rcp_footer.md`                              | 修正 | レビュー記録欄追加           |
| `.qfai/assistant/steering/review-gate.rules.yml`  | 修正 | ゲートルール 2 エントリ追加  |

`09_delta.md` の Impact セクションでも変更対象ファイルが一致して列挙されており、ファイル構造の整合性は確保されている。

### データ一貫性・後方互換性の確認

- BR-0012-0010 により既存 10 レビュアーの全フィールド（`id`・`name`・`scope`・`can_be_na`・`must_check`）の変更が禁止されている（NFR-0003 準拠）。
- TC-0012-0022/0023 でスナップショット比較・変更禁止検証が定義されており、データ一貫性テストが構築されている。
- `review-gate.rules.yml` の更新はゲートルール追加のみで、既存ルールの変更を伴わない（`10_Plan.md` Phase C-2）。

### 運用・信頼性の確認

- 無限ループリスクは BR-0012-0004（3 回連続 FAIL でアドバイザリー降格）および NFR-0007 によって制御されている。
- review-gate.rules.yml による gates 管理はロースターエントリと整合することが Phase C の完了基準として定義されている。
- 外部依存なし・データベース変更なし・API 変更なし（`10_Plan.md` 依存関係セクション）。

### 指摘事項

1. **NFR-0004「変更ファイル数 5 以下」の解釈が曖昧**: `10_Plan.md` の変更ファイルは実質 21 件以上（review-roster.yml + agent-selection.md + 9×SKILL.md + 9×rcp_footer.md + review-gate.rules.yml）となる。NFR-0004 の「5 ファイル以下」が「新規ファイル追加数」を指すのか「変更ファイル総数」を指すのかが spec 内で明文化されていない。BR か AC への解釈定義が望ましい（R01 qa-lead も同様の指摘あり）。

## Verdict: PASS

YAML スキーマの必須フィールド定義・バリデーション戦略・ネガティブパス TC が適切に設計されている。変更対象ファイルが spec 全体で一貫して列挙され、ファイル構造の整合性が確保されている。後方互換性制約（NFR-0003・BR-0012-0010）と運用リスク対策（NFR-0007・BR-0012-0004）も明文化されている。NFR-0004 の解釈曖昧性は軽微であり、全体として PASS 水準に達している。
