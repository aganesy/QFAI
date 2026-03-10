# 10 Plan

- Spec: spec-0002
- Parent: CAP-0002

## 実装戦略

### 主要モジュール

| モジュール             | パス                                                        | 操作 | 説明                                                              |
| ---------------------- | ----------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| validate コマンド      | `packages/qfai/src/cli/commands/validate.ts`                | 修正 | CLI エントリポイント。--phase, --fail-on, --format オプション処理 |
| validate コア          | `packages/qfai/src/core/validate.ts`                        | 修正 | バリデータオーケストレーション。全バリデータ順次実行・Issue 集約  |
| バリデータ群           | `packages/qfai/src/core/validators/` (33+ files)            | 修正 | 個別バリデータ実装                                                |
| バリデータインデックス | `packages/qfai/src/core/validators/index.ts`                | 修正 | バリデータ登録・フェーズマッピング                                |
| フェーズポリシー       | `packages/qfai/src/core/phasePolicy.ts`                     | 修正 | full/atdd/tdd/refinement フェーズ定義                             |
| failOn ロジック        | `packages/qfai/src/cli/lib/failOn.ts`                       | 修正 | 終了コード判定（error/warning/never）                             |
| ウェイバー             | `packages/qfai/src/core/waivers.ts`                         | 修正 | waivers.yml 読み込み・suppress/downgrade 適用                     |
| ランログ               | `packages/qfai/src/core/runLog.ts`                          | 修正 | run-YYYYMMDDTHHMMSS/ ディレクトリ生成・ログ書き込み               |
| ID 検証                | `packages/qfai/src/core/validators/ids.ts`                  | 修正 | CAP/US/AC/BR/EX/TC 形式・重複チェック                             |
| トレーサビリティ       | `packages/qfai/src/core/validators/traceability.ts`         | 修正 | AC->TC, BR->EX, EX->TC 参照整合性                                 |
| ATDD アノテーション    | `packages/qfai/src/core/validators/atddCodeTraceability.ts` | 修正 | テストファイル内 QFAI アノテーション検証                          |
| ディスカッションパック | `packages/qfai/src/core/validators/discussionPack.ts`       | 修正 | 15ファイル存在・内容・OQ ゲートチェック                           |
| コントラクト検証       | `packages/qfai/src/core/validators/contracts.ts`            | 修正 | UI/API/DB コントラクト ID 整合性                                  |
| Mermaid 検証           | `packages/qfai/src/core/validators/mermaidFence.ts`         | 修正 | mermaid フェンスブロック形式チェック                              |
| スペックレイアウト     | `packages/qfai/src/core/specLayout.ts`                      | 修正 | レイヤードスペック必須ファイル定義                                |
| 型定義                 | `packages/qfai/src/core/types.ts`                           | 修正 | Issue, ValidationResult, Summary 等の型定義                       |

### validate.json 出力スキーマ

```json
{
  issues: Issue[],
  summary: { errors: number, warnings: number, infos: number },
  metadata: { timestamp, phase, duration, version }
}
```

## テスト戦略

### L5 E2E テスト（tests/e2e/）

| テストファイル                       | アノテーション              | 検証内容                                        |
| ------------------------------------ | --------------------------- | ----------------------------------------------- |
| `tests/e2e/validate-basic.test.ts`   | QFAI:SPEC-0002:US-0002-0001 | 正常スペックでの validate 実行、Issue 集約確認  |
| `tests/e2e/validate-phase.test.ts`   | QFAI:SPEC-0002:US-0002-0002 | --phase full/atdd/tdd/refinement のスコープ制御 |
| `tests/e2e/validate-fail-on.test.ts` | QFAI:SPEC-0002:US-0002-0003 | --fail-on error/warning/never の終了コード確認  |
| `tests/e2e/validate-github.test.ts`  | QFAI:SPEC-0002:US-0002-0004 | --format github の出力形式・100件上限確認       |
| `tests/e2e/validate-json.test.ts`    | QFAI:SPEC-0002:US-0002-0005 | validate.json 出力のスキーマ検証                |
| `tests/e2e/validate-runlog.test.ts`  | QFAI:SPEC-0002:US-0002-0006 | ランログディレクトリ生成確認                    |
| `tests/e2e/validate-waivers.test.ts` | QFAI:SPEC-0002:US-0002-0007 | ウェイバー suppress/downgrade 確認              |

### L3 Integration テスト（tests/integration/）

| テストファイル                                     | アノテーション                                                        | 検証内容                                   |
| -------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| `tests/integration/validate-orchestration.test.ts` | QFAI:SPEC-0002:TC-0002-0001, TC-0002-0002                             | バリデータオーケストレーション・終了コード |
| `tests/integration/validate-phase.test.ts`         | QFAI:SPEC-0002:TC-0002-0003, TC-0002-0004                             | フェーズフィルタリングロジック             |
| `tests/integration/validate-fail-on.test.ts`       | QFAI:SPEC-0002:TC-0002-0005, TC-0002-0006, TC-0002-0007, TC-0002-0008 | failOn 判定ロジック                        |
| `tests/integration/validate-github-format.test.ts` | QFAI:SPEC-0002:TC-0002-0009, TC-0002-0010                             | GitHub Actions 出力形式・切り詰め          |
| `tests/integration/validate-json-output.test.ts`   | QFAI:SPEC-0002:TC-0002-0011                                           | validate.json スキーマ検証                 |
| `tests/integration/validate-runlog.test.ts`        | QFAI:SPEC-0002:TC-0002-0012                                           | ランログ生成ロジック                       |
| `tests/integration/validate-waivers.test.ts`       | QFAI:SPEC-0002:TC-0002-0013, TC-0002-0014                             | ウェイバー適用ロジック                     |
| `tests/integration/validator-spec-files.test.ts`   | QFAI:SPEC-0002:TC-0002-0015, TC-0002-0016                             | 必須ファイル存在チェック                   |
| `tests/integration/validator-ids.test.ts`          | QFAI:SPEC-0002:TC-0002-0017, TC-0002-0018                             | ID 形式・重複チェック                      |
| `tests/integration/validator-traceability.test.ts` | QFAI:SPEC-0002:TC-0002-0019, TC-0002-0020                             | トレーサビリティエッジ検証                 |
| `tests/integration/validator-atdd.test.ts`         | QFAI:SPEC-0002:TC-0002-0021, TC-0002-0022                             | ATDD アノテーション検証                    |
| `tests/integration/validator-discussion.test.ts`   | QFAI:SPEC-0002:TC-0002-0023, TC-0002-0024                             | ディスカッションパック検証                 |
| `tests/integration/validator-contracts.test.ts`    | QFAI:SPEC-0002:TC-0002-0025, TC-0002-0026                             | コントラクト ID 整合性                     |
| `tests/integration/validator-mermaid.test.ts`      | QFAI:SPEC-0002:TC-0002-0027, TC-0002-0028                             | Mermaid フェンス形式検証                   |
| `tests/integration/validate-idempotent.test.ts`    | QFAI:SPEC-0002:TC-0002-0029                                           | 冪等性検証（2回実行で同一結果）            |

### L4 API テスト

- 対象外: QFAI は API サービスではないため

## 依存関係

- spec-0001（qfai init）: `.qfai/` ディレクトリ構造が存在する前提でバリデーションを実行する
- テスト時は一時ディレクトリに `.qfai/` 構造をセットアップすることで spec-0001 への実行時依存を回避可能

## バリデータ一覧

以下は spec-0002 の AC・BR から導出された全バリデータの一覧である。各バリデータは V-XXXX 形式の ID を持ち、フェーズマッピングにより実行スコープが制御される。

### フェーズマッピング凡例

- **full**: 全バリデータ実行（デフォルト）
- **atdd**: ATDD アノテーション関連バリデータのみ
- **tdd**: トレーサビリティ + ID 関連バリデータ
- **refinement**: 構造 + フォーマット関連バリデータ

### スペック構造バリデータ

| ID | バリデータ名 | 説明 | フェーズ |
| --- | --- | --- | --- |
| V-0001 | specRequiredFiles | spec-XXXX/ 配下の必須ファイル（01_Spec.md ~ 08_Open-questions.md）存在チェック（BR-0002-0013, AC-0002-0014） | refinement |
| V-0002 | specFileNaming | spec-XXXX/ 配下のファイル名が NN_Name.md 形式に準拠しているかチェック | refinement |
| V-0003 | policiesRequiredFiles | _policies/ 配下の必須ファイル（01_Objective ~ 10_delta）存在チェック（BR-0002-0013） | refinement |
| V-0004 | policiesFileNaming | _policies/ 配下のファイル名が NN_Name.md 形式に準拠しているかチェック | refinement |
| V-0005 | specDirNaming | spec-XXXX ディレクトリ名が 4桁ゼロパディング形式に準拠しているかチェック | refinement |

### ID フォーマットバリデータ

| ID | バリデータ名 | 説明 | フェーズ |
| --- | --- | --- | --- |
| V-0006 | capIdFormat | CAP-XXXX 形式の ID フォーマット検証（BR-0002-0014, AC-0002-0016） | tdd |
| V-0007 | usIdFormat | US-XXXX-YYYY 形式の ID フォーマット検証（BR-0002-0014） | tdd |
| V-0008 | acIdFormat | AC-XXXX-YYYY 形式の ID フォーマット検証（BR-0002-0014） | tdd |
| V-0009 | brIdFormat | BR-XXXX-YYYY 形式の ID フォーマット検証（BR-0002-0014） | tdd |
| V-0010 | exIdFormat | EX-XXXX-YYYY 形式の ID フォーマット検証（BR-0002-0014） | tdd |
| V-0011 | tcIdFormat | TC-XXXX-YYYY 形式の ID フォーマット検証（BR-0002-0014） | tdd |
| V-0012 | idUniqueness | 同一スペック内の ID 重複検出（BR-0002-0015, AC-0002-0017） | tdd |

### トレーサビリティバリデータ

| ID | バリデータ名 | 説明 | フェーズ |
| --- | --- | --- | --- |
| V-0013 | traceAcToTc | AC → TC の参照エッジ存在チェック（BR-0002-0016, AC-0002-0018） | tdd |
| V-0014 | traceBrToEx | BR → EX の参照エッジ存在チェック（BR-0002-0016） | tdd |
| V-0015 | traceExToTc | EX → TC の参照エッジ存在チェック（BR-0002-0016） | tdd |
| V-0016 | traceOrphanTc | TC が AC から参照されていない孤立検出 | tdd |
| V-0017 | traceOrphanEx | EX が BR から参照されていない孤立検出 | tdd |

### ATDD アノテーションバリデータ

| ID | バリデータ名 | 説明 | フェーズ |
| --- | --- | --- | --- |
| V-0018 | atddAnnotationFormat | テストファイル内の QFAI:SPEC_XXXX:US_YYYY / TC_YYYY 形式検証（BR-0002-0017, AC-0002-0020） | atdd |
| V-0019 | atddAnnotationRef | ATDD アノテーションが参照する US/TC ID の実在チェック | atdd |
| V-0020 | atddTestsDirExistence | testsDir 不在時のスキップ判定（BR-0002-0018, AC-0002-0021） | atdd |
| V-0021 | atddCoverage | 全 US に対応する ATDD テストファイルの網羅率チェック | atdd |

### ディスカッションパックバリデータ

| ID | バリデータ名 | 説明 | フェーズ |
| --- | --- | --- | --- |
| V-0022 | dpackFileCount | ディスカッションパックの 15 必須ファイル存在チェック（BR-0002-0019, AC-0002-0022） | refinement |
| V-0023 | dpackFileContent | ディスカッションパック各ファイルの必須セクション・内容チェック | refinement |
| V-0024 | dpackBlockingOq | 08_Open-questions.md 内の status=open OQ 検出（BR-0002-0020, AC-0002-0023） | refinement |

### コントラクトバリデータ

| ID | バリデータ名 | 説明 | フェーズ |
| --- | --- | --- | --- |
| V-0025 | contractIdFormat | CON-UI-XXXX / CON-API-XXXX / CON-DB-XXXX 形式の ID 検証（BR-0002-0021, AC-0002-0024） | tdd |
| V-0026 | contractRefIntegrity | スペック内のコントラクト参照先の実在チェック（BR-0002-0022, AC-0002-0025） | tdd |
| V-0027 | contractOrphan | 定義されたコントラクトがどこからも参照されていない孤立検出 | tdd |

### Mermaid 図バリデータ

| ID | バリデータ名 | 説明 | フェーズ |
| --- | --- | --- | --- |
| V-0028 | mermaidFenceFormat | mermaid フェンスブロックの開始・終了形式チェック（BR-0002-0023, AC-0002-0026） | refinement |
| V-0029 | mermaidBusinessFlowRequired | _policies/04_Business-Flow.md の mermaid ブロック必須チェック（BR-0002-0024, AC-0002-0027） | refinement |

### ウェイバーバリデータ

| ID | バリデータ名 | 説明 | フェーズ |
| --- | --- | --- | --- |
| V-0030 | waiverYmlSchema | waivers.yml のスキーマ検証（suppress/downgrade ルール構造）（BR-0002-0011, BR-0002-0012） | full |
| V-0031 | waiverTargetExistence | waivers.yml 内で参照されている Issue コードが実在するかチェック | full |

### ランログバリデータ

| ID | バリデータ名 | 説明 | フェーズ |
| --- | --- | --- | --- |
| V-0032 | runLogDirNaming | run-YYYYMMDDTHHMMSS/ ディレクトリ名形式チェック（BR-0002-0010, AC-0002-0011） | full |
| V-0033 | runLogContent | ランログ内の validate.json スキーマ整合性チェック（BR-0002-0009） | full |

### 横断バリデータ

| ID | バリデータ名 | 説明 | フェーズ |
| --- | --- | --- | --- |
| V-0034 | idempotency | 2回連続実行で同一 validate.json 出力を保証（BR-0002-0025, AC-0002-0028） | full |
| V-0035 | fileGlobLimit | fast-glob ファイル探索の 10,000 件上限チェック・truncated フラグ設定（BR-0002-0028） | full |

## リスクと軽減策

| リスク                                    | 影響度 | 軽減策                                                                           |
| ----------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| バリデータ数増加によるパフォーマンス劣化  | 高     | NFR-0001/0002 に基づくパフォーマンスベンチマーク。バリデータ並列実行の検討       |
| 誤検知（False Positive）の多発            | 高     | NFR-0010 に基づき FP 率 5% 未満を維持。各バリデータに FP 回帰テストを追加        |
| ウェイバー適用による意図しない Issue 消失 | 中     | NFR-0011 準拠。suppressed=true フラグで内部保持し、--verbose で表示可能に        |
| fast-glob の 10,000 件上限超過            | 中     | NFR-0003 準拠。上限到達時に警告メッセージ出力。ストリーム処理で効率化            |
| レイヤードスペック形式への移行期の互換性  | 中     | spec-pack 形式とレイヤード形式の両方を検出するバリデータロジック。移行ガイド提供 |

## 実装順序

1. **US-0002-0001**: バリデーション実行（基盤オーケストレーション。全 US の前提条件）
2. **US-0002-0008**: スペック必須ファイル検証（最も基本的なバリデータ）
3. **US-0002-0009**: ID フォーマット検証（パース基盤）
4. **US-0002-0010**: トレーサビリティ検証（ID 検証の上に構築）
5. **US-0002-0014**: Mermaid 図検証（独立バリデータ）
6. **US-0002-0013**: コントラクト検証（独立バリデータ）
7. **US-0002-0012**: ディスカッションパック検証（独立バリデータ）
8. **US-0002-0011**: ATDD アノテーション検証（テストファイル走査が必要）
9. **US-0002-0002**: バリデーションフェーズ制御（バリデータ登録後にフィルタリング実装）
10. **US-0002-0005**: バリデーション結果 JSON 出力（集約結果の永続化）
11. **US-0002-0006**: ランログ生成（実行メタデータの保存）
12. **US-0002-0003**: 終了コード制御（集約結果に基づく判定）
13. **US-0002-0004**: GitHub Actions 出力（出力フォーマッタ）
14. **US-0002-0007**: ウェイバー適用（最終段。Issue 集約後に適用）
