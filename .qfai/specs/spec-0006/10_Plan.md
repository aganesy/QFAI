# 10 Plan

- Spec: spec-0006
- Parent: CAP-0006
- Role: Architect + TestStrategist

## 1. 実装戦略

### 新規作成

| ファイル                                               | 責務                                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/qfai/src/core/prototyping/index.ts`          | プロトタイピングエンジン本体。UI フィデリティ検証パイプラインを統括する                                                                    |
| `packages/qfai/src/core/prototyping/domCrawler.ts`     | US-0006-0001: jsdom による DOM クローリング。--base-url で指定された URL をフェッチし、DOM ツリーを解析する                                |
| `packages/qfai/src/core/prototyping/contractParser.ts` | US-0006-0002: .qfai/contracts/ui/ 配下の YAML ファイルから screens[].elements[] 構造をパースし、期待ラベル・セレクタ・data-qfai を抽出する |
| `packages/qfai/src/core/prototyping/markerDetector.ts` | US-0006-0003: DOM 内の data-qfai 属性を検出し、UI コントラクトとの対応関係をマッピングする                                                 |
| `packages/qfai/src/core/prototyping/evidenceWriter.ts` | US-0006-0004: .qfai/evidence/prototyping.json への構造化出力。uiFidelity オブジェクトスキーマに準拠                                        |
| `packages/qfai/src/core/prototyping/skeletonMode.ts`   | US-0006-0005: --base-url 未指定時の skeleton モード。uiFidelity.screens=[] + level="L1" で出力                                             |
| `packages/qfai/src/core/prototyping/types.ts`          | UiFidelity, Screen, Element, PrototypingResult 等の型定義                                                                                  |
| `packages/qfai/src/cli/commands/prototyping.ts`        | CLI エントリポイント。--autogen-ui-fidelity, --base-url オプション処理                                                                     |

### 修正

| ファイル                         | 変更内容                       |
| -------------------------------- | ------------------------------ |
| `packages/qfai/src/cli/index.ts` | prototyping サブコマンドの登録 |
| `package.json`                   | jsdom の devDependencies 追加  |

## 2. テスト戦略

### L5 E2E テスト (`tests/e2e/`)

| テストファイル                  | アノテーション              | 検証内容                                                   |
| ------------------------------- | --------------------------- | ---------------------------------------------------------- |
| `tests/e2e/prototyping.test.ts` | QFAI:SPEC-0006:US-0006-0001 | --autogen-ui-fidelity --base-url での DOM クローリング成功 |
| `tests/e2e/prototyping.test.ts` | QFAI:SPEC-0006:US-0006-0002 | UI コントラクト YAML からの期待値抽出                      |
| `tests/e2e/prototyping.test.ts` | QFAI:SPEC-0006:US-0006-0003 | data-qfai マーカーの検出とマッピング                       |
| `tests/e2e/prototyping.test.ts` | QFAI:SPEC-0006:US-0006-0004 | prototyping.json への証跡出力                              |
| `tests/e2e/prototyping.test.ts` | QFAI:SPEC-0006:US-0006-0005 | skeleton モードでの L1 evidence 記録                       |

### L3 Integration テスト (`tests/integration/`)

| テストファイル                                         | アノテーション              | 検証内容                                                           |
| ------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------ |
| `tests/integration/prototyping/domCrawler.test.ts`     | QFAI:SPEC-0006:TC-0006-0001 | jsdom mock での DOM クローリング成功（screens[] にマッチング結果） |
| `tests/integration/prototyping/domCrawler.test.ts`     | QFAI:SPEC-0006:TC-0006-0002 | URL タイムアウト時の QFAI-PROTO-001 エラー Issue                   |
| `tests/integration/prototyping/contractParser.test.ts` | QFAI:SPEC-0006:TC-0006-0003 | YAML パースでの label, selector, data-qfai 抽出                    |
| `tests/integration/prototyping/markerDetector.test.ts` | QFAI:SPEC-0006:TC-0006-0004 | data-qfai 属性検出と UI コントラクト照合                           |
| `tests/integration/prototyping/markerDetector.test.ts` | QFAI:SPEC-0006:TC-0006-0005 | 不一致時の QFAI-PROTO-002 Issue 報告                               |
| `tests/integration/prototyping/evidenceWriter.test.ts` | QFAI:SPEC-0006:TC-0006-0006 | prototyping.json の uiFidelity スキーマ検証                        |
| `tests/integration/prototyping/skeletonMode.test.ts`   | QFAI:SPEC-0006:TC-0006-0007 | skeleton モードでの screens=[] + level="L1" 出力                   |
| `tests/integration/prototyping/idempotency.test.ts`    | QFAI:SPEC-0006:TC-0006-0008 | 同一条件での2回実行で timestamp 以外同一出力                       |

### L4 API テスト

- 対象外（QFAI は API サービスではない）

### テスト環境の注意点

- DOM クローリングテストでは jsdom mock を使用する。実際の HTTP リクエストは発行しない
- E2E テストでは、テスト用の静的 HTML ファイルをローカルサーブして jsdom に渡すか、HTML 文字列を直接 jsdom に渡すアプローチを採用する

## 3. 依存関係

| 依存先                                | 依存内容                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| spec-0001 (qfai init)                 | .qfai/ ディレクトリ構造と qfai.config.yaml が init で生成されていることが前提       |
| UI コントラクト (.qfai/contracts/ui/) | contractParser が YAML ファイルをパースする対象。コントラクト YAML のスキーマに依存 |
| jsdom (npm)                           | DOM クローリングのランタイム依存。dependencies として追加                           |

### 3.1 spec-0001 (qfai init): `.qfai/` ディレクトリ構造の生成

prototyping コマンドは init 済みのプロジェクトを前提とする。`qfai init` によって `.qfai/` ディレクトリ構造（`contracts/`、`evidence/` 等）が生成されていなければ、prototyping コマンドは実行時エラーとする。init 未実行時のガードチェックを prototyping エンジン起動時に行う。

### 3.2 spec-0002 (qfai validate): validate.json スキーマ

prototyping の evidence.json は validate と統合される。prototyping 結果を validate が読み取る際の JSON スキーマ互換性が必要。evidenceWriter が出力する `prototyping.json` の `uiFidelity` オブジェクトは、spec-0002 で定義される validate.json スキーマの拡張フィールドとして取り込まれる。スキーマバージョニングにより後方互換性を維持する。

### 3.3 UI contract YAML: `.qfai/contracts/ui/` 配下の UI コントラクト定義

prototyping はコントラクト定義から期待要素を抽出する。contractParser は `.qfai/contracts/ui/` 配下の YAML ファイルを読み込み、`screens[].elements[]` 構造から期待ラベル・セレクタ・`data-qfai` 属性を抽出する。コントラクト YAML のスキーマ変更時は contractParser のパースロジックも追従が必要となる。

## 4. リスクと軽減策

| リスク                                    | 影響                                                 | 軽減策                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| jsdom の DOM 解析精度が実ブラウザと異なる | SPA/CSR コンテンツが正しく解析されない               | 初期スコープは SSR/静的 HTML に限定し、SPA 対応は将来スコープとする。ドキュメントに制約として明記する   |
| UI コントラクト YAML スキーマの未確定     | contractParser のパースロジックが不安定になる        | screens[].elements[] の最小スキーマを型定義で確定し、拡張は後方互換で追加する                           |
| jsdom の依存サイズ                        | パッケージサイズの増大                               | jsdom は dependencies（devDependencies ではなく）に追加する必要があるが、ランタイムで必要なため許容する |
| 冪等性の保証                              | timestamp 以外のフィールドが実行ごとに変動する可能性 | evidence 出力時に timestamp を分離し、DOM 解析結果はソート済みで出力する                                |
| --base-url で指定されたサーバーの可用性   | CI 環境でのテスト不安定化                            | テストでは jsdom mock を使用し、実サーバーへの依存を排除する                                            |

## 5. 実装順序

1. **US-0006-0002**: contractParser - UI コントラクト期待値抽出（DOM クローリング結果との照合に必要な期待値を先に確立）
2. **US-0006-0001**: domCrawler - DOM クローリング（jsdom セットアップと HTML フェッチ・解析）
3. **US-0006-0003**: markerDetector - data-qfai マーカー検出（domCrawler の結果と contractParser の期待値を利用）
4. **US-0006-0004**: evidenceWriter - 証跡出力（全検証結果を prototyping.json に構造化出力）
5. **US-0006-0005**: skeletonMode - skeleton モード（--base-url 未指定時の分岐処理。evidenceWriter を再利用）
