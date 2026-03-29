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

---

## 6. [v1.7.7 Remediation] Implementation Plan

Source: discussion-20260329195516830, DR-0080, DR-0081, DR-0082

### Phase R1: Mode Flag and Default Behavior (Priority: P0)

Addresses US-0006-0006, US-0006-0007, US-0006-0008, US-0006-0009; REQ-0001, REQ-0010

| File | Change |
| ---- | ------ |
| `packages/qfai/src/cli/commands/prototyping.ts` | Add `--mode <low-cost\|standard\|full-harness>` option with default `low-cost`. Wire mode value into prototyping engine. Emit active mode in output. |
| `packages/qfai/src/core/prototyping/index.ts` | Add mode-aware dispatch: low-cost → static-only path, standard → static-then-runtime path, full-harness → routing guidance only. |
| `packages/qfai/src/core/prototyping/modeRouter.ts` | New file: encapsulate mode dispatch logic and routing guidance emission for full-harness. |
| `.qfai/assistant/skills/qfai-prototyping/SKILL.md` | Update skill contract: add mode definitions section with completion criteria per mode; mark default as low-cost (static-first). |

### Phase R2: Error Handling for Invalid Mode (Priority: P0)

Addresses US-0006-0009, AC-0006-0014, BR-0006-0015

| File | Change |
| ---- | ------ |
| `packages/qfai/src/cli/commands/prototyping.ts` | Add mode validation before execution; emit QFAI-PROTO-010 Issue with valid modes list on invalid input; exit 1. |
| `packages/qfai/src/core/prototyping/types.ts` | Add `PrototypingMode` enum (low-cost, standard, full-harness) and mode-related error types. |

### Phase R3: Tests for Remediation Items (Priority: P0)

| Test File | Annotations | Scope |
| --------- | ----------- | ----- |
| `tests/integration/prototyping/modeDispatch.test.ts` | QFAI:SPEC-0006:TC-0006-0011, TC-0006-0014, TC-0006-0015 | Low-cost mode static-only constraint, default mode resolution, idempotency |
| `tests/integration/prototyping/modeDispatch.test.ts` | QFAI:SPEC-0006:TC-0006-0016, TC-0006-0017 | Standard mode static-then-runtime ordering |
| `tests/integration/prototyping/modeDispatch.test.ts` | QFAI:SPEC-0006:TC-0006-0018, TC-0006-0019 | Full-harness routing guidance, no artifacts |
| `tests/integration/prototyping/modeDispatch.test.ts` | QFAI:SPEC-0006:TC-0006-0021, TC-0006-0022 | Invalid mode error output |
| `tests/integration/prototyping/modeDispatch.test.ts` | QFAI:SPEC-0006:TC-0006-0023, TC-0006-0024 | Default mode equals low-cost, no state leakage |
| `tests/e2e/prototyping-modes.test.ts` | QFAI:SPEC-0006:US-0006-0006 | Static-first end-to-end without runtime |
| `tests/e2e/prototyping-modes.test.ts` | QFAI:SPEC-0006:US-0006-0008 | CLI --help mode flag surface |
| `tests/e2e/prototyping-modes.test.ts` | QFAI:SPEC-0006:TC-0006-0012, TC-0006-0013 | Edge: empty-source, read-only filesystem |
| `tests/e2e/prototyping-modes.test.ts` | QFAI:SPEC-0006:TC-0006-0020 | --help includes mode flag with all three values |

### Phase R4: Skill Contract Update (Priority: P1)

- Update `qfai-prototyping` SKILL.md to add explicit mode contract section per REQ-0003
- Document completion criteria per mode (evidence level, runtime requirements, reviewer expectations)
- Cross-reference spec-0031 for full-harness mode details

### Remediation Risk Mitigation

| Risk | Mitigation |
| ---- | ---------- |
| Existing tests assume no --mode flag | Confirm all existing tests pass with default standard behavior; default changed from low-cost to standard per DR-0084 |
| Standard mode runtime phase failure masking static success | Preserve static output independently; runtime failure appended as Issue, not as replacement of static output |
| Full-harness routing guidance ambiguity | Message must be deterministic and include exact skill invocation command |

## 7. [v1.7.7 Mode Switch UX] Implementation Plan

Source: qfai_prototyping_mode_switch_ux_proposal.md, DR-0084

### Phase M1: Discussion Artifact Recommendation (Priority: P1)

Addresses US-0006-0010; AC-0006-0016

| File | Change |
| ---- | ------ |
| `packages/qfai/src/core/prototyping/discussionReader.ts` | New file: read discussion artifact (discussion output or sidecar YAML) and extract `prototyping.recommended_mode` and `prototyping.rationale` fields. Return null if absent. |
| `packages/qfai/src/core/prototyping/types.ts` | Add `DiscussionRecommendation` type: `{ recommended_mode: PrototypingMode | null; rationale: string | null }`. |

### Phase M2: Precedence Resolution (Priority: P0)

Addresses US-0006-0011; AC-0006-0015 (updated), AC-0006-0017, AC-0006-0018; DR-0084

| File | Change |
| ---- | ------ |
| `packages/qfai/src/core/prototyping/modeResolver.ts` | New file: implement precedence chain (1. CLI --mode, 2. discussion recommended_mode, 3. system default=standard). Return `{ effective_mode, mode_source, recommended_mode, rationale }`. |
| `packages/qfai/src/core/prototyping/modeRouter.ts` | Update: integrate modeResolver before mode dispatch. Replace hardcoded low-cost default with precedence resolution. |
| `packages/qfai/src/cli/commands/prototyping.ts` | Update default mode from `low-cost` to invoke modeResolver when no --mode flag is given. |

### Phase M3: Effective Mode Logging (Priority: P1)

Addresses US-0006-0012; AC-0006-0019

| File | Change |
| ---- | ------ |
| `packages/qfai/src/core/prototyping/modeLogger.ts` | New file: structured log output with fields: mode_source, recommended_mode, effective_mode, rationale, evidence_expectations. Output to both stdout and evidence artifact. |
| `packages/qfai/src/core/prototyping/index.ts` | Integrate modeLogger at prototyping entry point; emit mode resolution log before phase dispatch. |

### Phase M4: Non-Visual Surface Mode Behavior (Priority: P1)

Addresses US-0006-0013; AC-0006-0020, AC-0006-0021

| File | Change |
| ---- | ------ |
| `packages/qfai/src/core/prototyping/surfaceAdapter.ts` | New file: detect surface type (from project config or discussion artifact), set visual-review evidence to n/a for non-visual surfaces. |
| `packages/qfai/src/core/prototyping/evidenceWriter.ts` | Update: when surface is non-visual, mark visual-review evidence fields as `n/a` instead of failing. |

### Phase M5: Tests for Mode Switch UX (Priority: P0)

| Test File | Annotations | Scope |
| --------- | ----------- | ----- |
| `tests/integration/prototyping/modeResolver.test.ts` | QFAI:SPEC-0006:TC-0006-0025..TC-0006-0029 | Precedence resolution: CLI override, discussion recommendation, system default, missing discussion fallback |
| `tests/integration/prototyping/discussionReader.test.ts` | QFAI:SPEC-0006:TC-0006-0030..TC-0006-0033 | Discussion artifact reading: valid, missing, invalid recommended_mode |
| `tests/integration/prototyping/modeLogger.test.ts` | QFAI:SPEC-0006:TC-0006-0034..TC-0006-0037 | Mode logging structure: all three sources, evidence expectations per mode |
| `tests/integration/prototyping/surfaceAdapter.test.ts` | QFAI:SPEC-0006:TC-0006-0038..TC-0006-0041 | Non-visual surface: n/a visual evidence, no browser failure |
| `tests/e2e/prototyping-modes.test.ts` | QFAI:SPEC-0006:US-0006-0010..US-0006-0013 | E2E: discussion recommendation consumption, precedence, logging, non-visual surface |

### Mode Switch UX Risk Mitigation

| Risk | Mitigation |
| ---- | ---------- |
| Default change from low-cost to standard breaks existing test expectations | Update test assertions; verify all TC-0006-0011..0024 pass with new default. Existing --mode low-cost tests unaffected. |
| Discussion artifact format not yet standardized | discussionReader treats absent/invalid recommendation as null; falls back gracefully to system default |
| Surface type detection accuracy | Initial implementation relies on explicit project config; auto-detection deferred |
| Mode logging overhead in CI | Structured log is minimal (5 fields); no measurable performance impact expected |
