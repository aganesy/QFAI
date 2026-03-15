# 10 Plan

<!-- markdownlint-disable MD029 MD040 -->

- Spec: spec-0012
- Parent: CAP-0012

## 実装戦略

### 主要モジュール

| モジュール                 | パス                                                | 操作 | 説明                                                                             |
| -------------------------- | --------------------------------------------------- | ---- | -------------------------------------------------------------------------------- |
| ロースター設定             | `.qfai/assistant/steering/review-roster.yml`        | 修正 | devils-advocate / pattern-doubler の 2 エントリを既存 10 名の後に追加            |
| デリゲーション役割定義     | `.qfai/assistant/instructions/agent-selection.md`   | 修正 | 両エージェントの役割名・責務・委任ルール・選択シナリオを追加                     |
| qfai-discussion SKILL.md   | `.qfai/assistant/skills/qfai-discussion/SKILL.md`   | 修正 | 両エージェントへのレビュー委任ステップ追加（既存ステップ 11・12 番目）           |
| qfai-sdd SKILL.md          | `.qfai/assistant/skills/qfai-sdd/SKILL.md`          | 修正 | 両エージェントへのレビュー委任ステップ追加                                       |
| qfai-configure SKILL.md    | `.qfai/assistant/skills/qfai-configure/SKILL.md`    | 修正 | 両エージェントへのレビュー委任ステップ追加                                       |
| qfai-prototyping SKILL.md  | `.qfai/assistant/skills/qfai-prototyping/SKILL.md`  | 修正 | 両エージェントへのレビュー委任ステップ追加                                       |
| qfai-atdd SKILL.md         | `.qfai/assistant/skills/qfai-atdd/SKILL.md`         | 修正 | 両エージェントへのレビュー委任ステップ追加                                       |
| qfai-tdd-red SKILL.md      | `.qfai/assistant/skills/qfai-tdd-red/SKILL.md`      | 修正 | 両エージェントへのレビュー委任ステップ追加                                       |
| qfai-tdd-green SKILL.md    | `.qfai/assistant/skills/qfai-tdd-green/SKILL.md`    | 修正 | 両エージェントへのレビュー委任ステップ追加                                       |
| qfai-tdd-refactor SKILL.md | `.qfai/assistant/skills/qfai-tdd-refactor/SKILL.md` | 修正 | 両エージェントへのレビュー委任ステップ追加                                       |
| qfai-verify SKILL.md       | `.qfai/assistant/skills/qfai-verify/SKILL.md`       | 修正 | 両エージェントへのレビュー委任ステップ追加                                       |
| RCP フッター群             | 各スキルの `rcp_footer.md`（9 ファイル）            | 修正 | devils-advocate / pattern-doubler のレビュー記録欄を既存 10 レビュアーの後に追加 |
| ゲートルール               | `.qfai/assistant/steering/review-gate.rules.yml`    | 修正 | devils-advocate / pattern-doubler の FAIL 判定・アドバイザリー降格ルールを追加   |

### フェーズ別実装計画

#### Phase A — Roster & Delegation（ロースターとデリゲーション）

1. `review-roster.yml` に `devils-advocate`（インデックス 10、`can_be_na: false`）を追加する
2. `review-roster.yml` に `pattern-doubler`（インデックス 11、`can_be_na: true`）を追加する
3. `agent-selection.md` に devils-advocate の役割名・責務・委任ルール・選択シナリオを追加する
4. `agent-selection.md` に pattern-doubler の役割名・責務・委任ルール・選択シナリオを追加する

**完了基準**: `qfai validate` が YAML スキーマエラーなしで PASS する。インデックス 10・11 の確認。

#### Phase B — Skill Integration（スキル統合）

5. 全 9 SKILL.md（qfai-discussion, qfai-sdd, qfai-configure, qfai-prototyping, qfai-atdd, qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor, qfai-verify）に devils-advocate レビュー委任ステップを追加する
6. 同 9 ファイルに pattern-doubler レビュー委任ステップを追加する

**完了基準**: 9 ファイル全てに両エージェントの委任ステップが存在し、順序が「既存 10 → devils-advocate → pattern-doubler」であること。

#### Phase C — RCP & Gate（RCP フッターとゲートルール）

7. 各スキルの `rcp_footer.md`（9 ファイル）に devils-advocate / pattern-doubler のレビュー記録欄を追加する
8. `review-gate.rules.yml` に devils-advocate のゲートルール（代替案必須、3 回連続 FAIL でアドバイザリー降格）を追加する
9. `review-gate.rules.yml` に pattern-doubler のゲートルール（ID 付きパターンの倍増目標・カウント方法）を追加する

**完了基準**: RCP フッターに両エージェントの記録欄が存在する。ゲートルールがロースターエントリと整合する。

#### Phase D — Validation（バリデーション）

10. `qfai validate` を実行して全構造バリデーションが PASS することを確認する
11. 既存 10 レビュアーの設定に差分がないことを確認する（後方互換性）

**完了基準**: `qfai validate` でエラー 0 件。既存設定への変更なし。

## テスト戦略

### テストレベル

- **L3（Integration）のみ**: 全テストケースは設定ファイル構造バリデーション。TypeScript コード変更がないため L4/L5 は対象外。

### テストファイル配置

注記: 本 PR は TypeScript 実装変更を含まないため、以下は将来のテスト計画を示す参照パス（実装予定）である。
実際のテスト資産を追加する場合は `packages/qfai/tests/{core,cli,assets}` 配下へ配置して別 PR で実施する。

| テストファイル                                            | アノテーション                                                                                    | 検証内容                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `packages/qfai/tests/core/spec-0012-roster-registration.test.ts` | QFAI:SPEC-0012:TC-0012-0001, TC-0012-0002, TC-0012-0003, TC-0012-0004, TC-0012-0005, TC-0012-0006 | ロースター登録・スキーマ検証・実行順序           |
| `packages/qfai/tests/core/spec-0012-fail-blocking.test.ts`       | QFAI:SPEC-0012:TC-0012-0007, TC-0012-0008, TC-0012-0011, TC-0012-0012, TC-0012-0026, TC-0012-0029 | FAIL ブロッキング動作・代替案必須ルール          |
| `packages/qfai/tests/core/spec-0012-advisory-demotion.test.ts`   | QFAI:SPEC-0012:TC-0012-0009, TC-0012-0010, TC-0012-0025                                           | アドバイザリー降格・カウンターリセット・性能予算 |
| `packages/qfai/tests/core/spec-0012-delegation-roles.test.ts`    | QFAI:SPEC-0012:TC-0012-0013, TC-0012-0014                                                         | agent-selection.md 役割定義完全性                |
| `packages/qfai/tests/core/spec-0012-skill-integration.test.ts`   | QFAI:SPEC-0012:TC-0012-0015, TC-0012-0016, TC-0012-0017                                           | 全 9 SKILL.md への委任ステップ統合               |
| `packages/qfai/tests/core/spec-0012-rcp-footer.test.ts`          | QFAI:SPEC-0012:TC-0012-0018, TC-0012-0019                                                         | RCP フッター更新・追加漏れ検出                   |
| `packages/qfai/tests/core/spec-0012-pattern-count.test.ts`       | QFAI:SPEC-0012:TC-0012-0020, TC-0012-0021, TC-0012-0027, TC-0012-0028                             | パターン倍増カウント・行動原則                   |
| `packages/qfai/tests/core/spec-0012-backward-compat.test.ts`     | QFAI:SPEC-0012:TC-0012-0022, TC-0012-0023                                                         | 既存 10 レビュアーの後方互換性                   |
| `packages/qfai/tests/core/spec-0012-performance.test.ts`         | QFAI:SPEC-0012:TC-0012-0024                                                                       | レビューサイクル時間 2T 以内                     |

### アノテーション形式

```
// QFAI:SPEC-0012:TC-XXXX
```

### TC カバレッジマトリクス

| TC-ID        | AC-Refs                                  | EX-Ref       | テストファイル                        |
| ------------ | ---------------------------------------- | ------------ | ------------------------------------- |
| TC-0012-0001 | AC-0012-0001                             | EX-0012-0001 | spec-0012-roster-registration.test.ts |
| TC-0012-0002 | AC-0012-0001                             | EX-0012-0002 | spec-0012-roster-registration.test.ts |
| TC-0012-0003 | AC-0012-0002                             | EX-0012-0003 | spec-0012-roster-registration.test.ts |
| TC-0012-0004 | AC-0012-0002                             | EX-0012-0004 | spec-0012-roster-registration.test.ts |
| TC-0012-0005 | AC-0012-0001, AC-0012-0002               | EX-0012-0005 | spec-0012-roster-registration.test.ts |
| TC-0012-0006 | AC-0012-0011                             | EX-0012-0006 | spec-0012-roster-registration.test.ts |
| TC-0012-0007 | AC-0012-0003                             | EX-0012-0007 | spec-0012-fail-blocking.test.ts       |
| TC-0012-0008 | AC-0012-0004                             | EX-0012-0008 | spec-0012-fail-blocking.test.ts       |
| TC-0012-0009 | AC-0012-0005                             | EX-0012-0009 | spec-0012-advisory-demotion.test.ts   |
| TC-0012-0010 | AC-0012-0005                             | EX-0012-0010 | spec-0012-advisory-demotion.test.ts   |
| TC-0012-0011 | AC-0012-0006                             | EX-0012-0011 | spec-0012-fail-blocking.test.ts       |
| TC-0012-0012 | AC-0012-0006                             | EX-0012-0012 | spec-0012-fail-blocking.test.ts       |
| TC-0012-0013 | AC-0012-0007                             | EX-0012-0013 | spec-0012-delegation-roles.test.ts    |
| TC-0012-0014 | AC-0012-0007                             | EX-0012-0014 | spec-0012-delegation-roles.test.ts    |
| TC-0012-0015 | AC-0012-0008                             | EX-0012-0015 | spec-0012-skill-integration.test.ts   |
| TC-0012-0016 | AC-0012-0008                             | EX-0012-0016 | spec-0012-skill-integration.test.ts   |
| TC-0012-0017 | AC-0012-0008                             | EX-0012-0015 | spec-0012-skill-integration.test.ts   |
| TC-0012-0018 | AC-0012-0009                             | EX-0012-0017 | spec-0012-rcp-footer.test.ts          |
| TC-0012-0019 | AC-0012-0009                             | EX-0012-0018 | spec-0012-rcp-footer.test.ts          |
| TC-0012-0020 | AC-0012-0010                             | EX-0012-0019 | spec-0012-pattern-count.test.ts       |
| TC-0012-0021 | AC-0012-0010                             | EX-0012-0020 | spec-0012-pattern-count.test.ts       |
| TC-0012-0022 | AC-0012-0011                             | EX-0012-0021 | spec-0012-backward-compat.test.ts     |
| TC-0012-0023 | AC-0012-0011                             | EX-0012-0022 | spec-0012-backward-compat.test.ts     |
| TC-0012-0024 | AC-0012-0012                             | EX-0012-0023 | spec-0012-performance.test.ts         |
| TC-0012-0025 | AC-0012-0012                             | EX-0012-0024 | spec-0012-advisory-demotion.test.ts   |
| TC-0012-0026 | AC-0012-0001, AC-0012-0003, AC-0012-0006 | EX-0012-0025 | spec-0012-fail-blocking.test.ts       |
| TC-0012-0027 | AC-0012-0002, AC-0012-0004, AC-0012-0010 | EX-0012-0027 | spec-0012-pattern-count.test.ts       |
| TC-0012-0028 | AC-0012-0002, AC-0012-0004, AC-0012-0010 | EX-0012-0028 | spec-0012-pattern-count.test.ts       |
| TC-0012-0029 | AC-0012-0001, AC-0012-0006               | EX-0012-0026 | spec-0012-fail-blocking.test.ts       |

- **合計**: 29 TC、全て L3（Integration）

## リスクと軽減策

| リスク                                           | 影響度 | 軽減策                                                                                                                             |
| ------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 無限ループ（全否定が永続的に FAIL を返し続ける） | 高     | OQ-0001 解決策：3 回連続 FAIL でアドバイザリー降格（BR-0012-0013, AC-0012-0005）。降格後はブロッキング力が消失しサイクルが前進する |
| 既存 10 レビュアーへの意図しない変更             | 高     | NFR-0003 準拠。Phase D でスナップショット比較を必須とする（TC-0012-0022, TC-0012-0023）                                            |
| レビューサイクル時間の予算超過                   | 中     | NFR-0001 準拠。2 エージェント追加後の総サイクル時間を 2T 以内に収める（TC-0012-0024, TC-0012-0025）                                |
| 9 SKILL.md への統合漏れ                          | 中     | TC-0012-0017 で 9 ファイル全件を一括検証する自動テストを実装する                                                                   |
| RCP フッター更新漏れ                             | 低     | TC-0012-0019 で片方漏れパターンを明示的にテストする                                                                                |
| devils-advocate の代替案なし FAIL 多発           | 低     | NFR-0007 準拠。代替案なし FAIL は即時無効化し再判定を要求する（AC-0012-0006, TC-0012-0011, TC-0012-0029）                          |

## 依存関係

- 外部依存なし（設定ファイル・ドキュメント変更のみ）
- データベース・API 変更なし
- TypeScript コード変更なし（Out of Scope）
- spec-0001（qfai init）が前提：`.qfai/` ディレクトリ構造が存在すること

## 実装順序

1. **Phase A-1**: `review-roster.yml` に devils-advocate 追加（TC-0012-0001, TC-0012-0002 が先行検証可能に）
2. **Phase A-2**: `review-roster.yml` に pattern-doubler 追加（TC-0012-0003, TC-0012-0004 が検証可能に）
3. **Phase A-3**: 実行順序確認（TC-0012-0005, TC-0012-0006 が検証可能に）
4. **Phase A-4**: `agent-selection.md` に両エージェントの役割定義追加（TC-0012-0013, TC-0012-0014 が検証可能に）
5. **Phase B**: 全 9 SKILL.md に両エージェントの委任ステップ追加（TC-0012-0015, TC-0012-0016, TC-0012-0017 が検証可能に）
6. **Phase C-1**: 全 9 `rcp_footer.md` に両エージェントの記録欄追加（TC-0012-0018, TC-0012-0019 が検証可能に）
7. **Phase C-2**: `review-gate.rules.yml` にゲートルール追加（TC-0012-0007〜TC-0012-0012, TC-0012-0020〜TC-0012-0021 が検証可能に）
8. **Phase D**: `qfai validate` 実行・後方互換性確認（TC-0012-0022, TC-0012-0023 が最終確認）
