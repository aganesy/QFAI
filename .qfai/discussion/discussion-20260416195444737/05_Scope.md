# 05_Scope — スコープ定義と成功基準

---

## スコープ概要

### In Scope（対象）

| # | 内容 | 対応 WS | 主要ファイル |
|---|---|---|---|
| 1 | `fullHarness` ターミナル状態機械の実装（`in-progress` / `completed` 遷移ロジック） | WS-1 | `runtime.ts`, `history.ts` |
| 2 | `terminationReason` → `finalDecision` / `reviewerSignoff.status` マッピングの実装 | WS-1 | `execution.ts`, `runtime.ts` |
| 3 | バリデータによる状態機械制約の強制（fail-closed） | WS-1 | `prototypingEvidence.ts` |
| 4 | `buildScreenContractInputs()` を `readCanonicalScreenContracts()` の `sourceRef` に一元化 | WS-2 | `screenContracts.ts` |
| 5 | ルートスラグアンカー生成コードの削除 | WS-2 | `screenContracts.ts` |
| 6 | `assertConcreteArtifactRefs()` ヘルパーの実装 | WS-3 | `l2Evidence.ts`, `prototypingEvidence.ts` |
| 7 | 全8カテゴリの非空・具体性チェック適用 | WS-3 | `prototypingEvidence.ts` |
| 8 | `declaredRef` の semantic 検証（`.qfai/specs/` + anchor 強制） | WS-4 | `specCoverage.ts`, `execution.ts` |
| 9 | 上記変更に対応するテストの追加・修正（ネガティブフィクスチャ含む） | WS-1〜4 | `fullHarnessRuntime.test.ts`, `prototypingEvidence.test.ts`, `prototypingExecution.productionPath.test.ts` |
| 10 | `README.md` の WS-1〜WS-4 反映 | WS-5（同期） | `README.md` |

### Out of Scope（非対象）

| # | 除外理由 |
|---|---|
| `.qfai/**` への変更 | 運用ディレクトリは今回スコープ外。設計書 rev10 で明示的に除外 |
| calibration pack 再設計 | 別タスク（別 PR） |
| スコアリング rubric 再設計 | 別タスク（別 PR） |
| Browser QA オーケストレーション再設計 | 別タスク（別 PR） |
| non-UI prototyping 再導入 | 廃止済みとして明示 |
| standard/low-cost mode 再導入 | 廃止済みとして明示 |
| マイグレーションサポート・互換エイリアス | 破壊的変更ポリシーにより不要 |
| レガシーフィクスチャの維持 | 廃棄ポリシーにより削除 |
| `refSemantics.ts` の新規作成 | OQ-0002 により SDD フェーズに defer |
| `prototypingEvidence.semanticRefs.test.ts` の新規作成 | OQ-0002 により SDD フェーズに defer |

---

## 成功基準（DoD: Definition of Done）

### 機能的成功基準

| # | 基準 | 検証方法 |
|---|---|---|
| FC-01 | `status=in-progress` 時に `terminationReason` が存在するとバリデーターがエラーを返す | テスト（ネガティブフィクスチャ） |
| FC-02 | `status=completed` 時に `terminationReason` が absent だとバリデーターがエラーを返す | テスト（ネガティブフィクスチャ） |
| FC-03 | `terminationReason` の全3値（`abandoned`, `max-iterations`, `plateau`）が正しいマッピングで resolved | テスト（各値の happy path） |
| FC-04 | `buildScreenContractInputs()` の出力 `ref` が `readCanonicalScreenContracts()` の `sourceRef` と一致する | テスト |
| FC-05 | slug-based anchor を持つ ref をバリデーターが拒否する | テスト（ネガティブフィクスチャ） |
| FC-06 | 全8カテゴリで空配列がエラーとなる | テスト（各カテゴリのネガティブフィクスチャ） |
| FC-07 | `runtimeGate` / `specCoverage` で `assertConcreteArtifactRefs()` が呼ばれる | コードレビュー + テスト |
| FC-08 | `declaredRef` がベアパス（アンカーなし）の場合エラーとなる | テスト（ネガティブフィクスチャ） |
| FC-09 | `declaredRef` が `.qfai/discussion/` パスの場合エラーとなる | テスト（ネガティブフィクスチャ） |
| FC-10 | production path テスト（`prototypingExecution.productionPath.test.ts`）が GREEN | CI |

### 品質的成功基準

| # | 基準 | 検証方法 |
|---|---|---|
| QC-01 | `pnpm format:check` が通過 | CI |
| QC-02 | `pnpm lint` が通過（warning ゼロ） | CI |
| QC-03 | `pnpm check-types` が通過 | CI |
| QC-04 | 全テストスイート GREEN | CI |
| QC-05 | `any` 型・`@ts-ignore` の新規追加なし | コードレビュー |
| QC-06 | warning-only パスの新規追加なし（すべて fail-closed） | コードレビュー |
| QC-07 | `README.md` が WS-1〜WS-4 の変更を反映 | コードレビュー |

---

## REQ トレーサビリティ概要

| REQ | 対応 WS | 成功基準 |
|---|---|---|
| REQ-0001 | WS-1 | FC-01, FC-02, FC-03 |
| REQ-0002 | WS-1 | FC-01 |
| REQ-0003 | WS-1 | FC-02 |
| REQ-0004 | WS-1 | FC-03 |
| REQ-0005 | WS-2 | FC-04, FC-05 |
| REQ-0006 | WS-3 | FC-06, FC-07 |
| REQ-0007 | WS-4 | FC-08, FC-09 |
| REQ-0008 | WS-5 | FC-10, QC-07 |
| REQ-0009 | WS-1〜4 | FC-01〜FC-09 のネガティブフィクスチャ |
