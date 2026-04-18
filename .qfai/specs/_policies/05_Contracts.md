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

QFAI は GUI を持たない CLI ツールである。`/qfai-prototyping` スキルは対象プロジェクトの UI コントラクトを検証する機能であり、QFAI 自体の UI コントラクトではない。

| Short ID | Screen | Declared ID | File | Purpose |
| -------- | ------ | ----------- | ---- | ------- |

## Mapping Rules

- QFAI は CLI ツールのため、DB/API/UI コントラクトは全て 0 items である。
- `validate.json` は内部契約として扱い、Contract Index には含めない。
- 将来的にコントラクトが必要になった場合は、本ファイルにエントリを追加する。

## v1.7.16 Contract Posture

- Contracts-first review completed for discussion-20260418093755100（QFAI Package Design Quality Pipeline Restructure; spec-0010 / spec-0012 / spec-0014 UPDATE）.
- 追加バリデータ（UIX-VAL-T01〜T04, UIX-VAL-DS01〜DS02, PROT-DS01）、SKILL.md 拡張（Step 0, Step 11.3, Step 11.5, 反復ゲート, 5-step cycle, DESIGN.md準拠チェック）、テンプレート追加（`uiux/12_design_system.md`）および references 新設（`design-md-brand-catalog.md`）は全て QFAI パッケージ内部の SSOT/SKILL/バリデータ拡張であり、外部向け DB/API/UI contract は新設しない。
- したがって Contract Index の `0 items` は意図的な none-rationale であり、spec-0010 / spec-0012 / spec-0014 のスコープ境界に整合する。
- 既存 discussion-pack / prototyping.json への後方互換性は NFR-0001（discussion-20260418093755100）により担保する（新フィールドは任意拡張、UIX-VAL-T01/T02 は既存パック非影響のため ERROR 直接導入可）。

## v1.7.1 Contract Posture

- Contracts-first review completed for `CAP-0024 / spec-0024`.
- Render Evidence Automation は `/qfai-prototyping` スキルの内部 evidence schema、validator、report、docs を拡張する変更である。
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

## v1.7.9 Contract Posture

- Contracts-first review completed for convergence discussion `discussion-20260330153902875`.
- v1.7.9 は validate/discussion/prototyping/docs の truthfulness と canonical wiring を修正する correction release であり、QFAI 自体の外部 stable DB/API/UI contract は新設しない。
- discussion sidecar family、render evidence status、browser QA findings、review routing は内部モジュール間の convergence 対象であり、Contract Index の stable surface には昇格しない。
- したがって Contract Index の `0 items` は v1.7.9 でも意図的な none-rationale である。

## v1.7.11 Contract Posture

- Contracts-first review completed for v1.7.11 completion release (`discussion-20260331120000000`).
- v1.7.11 は v1.7.9 監査で未完だった実装収束を完了する completion/correction/integration release である。
- 10 workstreams (A-J) は全て QFAI 内部モジュールの canonical model 収束を行う変更であり、外部向け stable contract は新設しない。
  - Workstream A: discussion skill 内部の 4-axis 除去・3-layer 教示 — 内部スキル変更
  - Workstream B: init/packaged assets のテンプレート置換 — 内部アセット変更
  - Workstream C: 04_Sources.md schema 完成 — 内部テンプレート変更
  - Workstream D/E: strategy/contracts spec の strong schema 化 — 内部テンプレート変更
  - Workstream F: canonical validator entrypoint 統合 — 内部バリデータ変更
  - Workstream G: render evidence actual capture — 内部エビデンス変更
  - Workstream H: browser QA actual phase runner — 内部 QA 変更
  - Workstream I: prototyping contract truth — 内部ワークフロー変更
  - Workstream J: docs/steering/tests normalization — 内部ドキュメント変更
- したがって Contract Index の `0 items` は v1.7.11 でも意図的な none-rationale であり、discussion-20260331120000000 のスコープ境界に整合する。

## v1.7.12 Contract Posture

- Contracts-first review completed for v1.7.12 convergence correction release (`discussion-20260401215536131`).
- v1.7.12 は cross-layer architectural drift を解消し、discussion-pack/spec-pack/validators/prototyping/docs/tests を 1 つの truthful model に収束させる correction release である。
- 6 bundles (A-F) は全て QFAI 内部モジュールの canonical model 収束を行う変更であり、外部向け stable contract は新設しない。
  - Bundle A: discussion-pack テンプレート正規化（3-layer ファミリー置換）— 内部スキル/テンプレート変更
  - Bundle B: spec-pack 正規化（HTML/CSS mock optional 化、prototyping truth）— 内部 spec 変更
  - Bundle C: validator/runtime/browser QA 収束 — 内部バリデータ変更
  - Bundle D: prototyping 責務統一（skill-centered truth）— 内部ワークフロー変更
  - Bundle E: docs/steering/changelog 正規化 — 内部ドキュメント変更
  - Bundle F: test truth 置換 + parity guards — 内部テスト変更
- したがって Contract Index の `0 items` は v1.7.12 でも意図的な none-rationale であり、discussion-20260401215536131 のスコープ境界および DR-0106..0109 に整合する。

## v1.7.15 Contract Posture

- Contracts-first review completed for v1.7.15 runtime truthfulness hardening (`discussion-20260414072809763`).
- v1.7.15 は `packages/qfai` 内部の runtime/validator/bundleWriter/docs/tests を改定する単一 PR release であり、外部向け stable contract は新設しない。
- 主な変更対象: `runFullHarness()` request 契約、l2Evidence.ts 新設、CalibrationLoader strict 化、screen-level UiObservation、bundleWriter schema v2、validator 14 項目 error 昇格 — 全て内部モジュール。
- したがって Contract Index の `0 items` は v1.7.15 でも意図的な none-rationale であり、discussion-20260414072809763 のスコープ境界に整合する。

## v1.7.15 rev4 Contract Posture

- Contracts-first review completed for v1.7.15 rev4 single-PR completion (`discussion-20260414195449523`).
- v1.7.15 rev4 は 5 件の監査残留齟齬を是正する内部 runtime/validator/evidence/docs 変更であり、外部向け stable contract は新設しない。
- 主な変更対象: mode.ts cli/full-harness reject、screenContracts.ts パーサー、uiObservation.ts screen-level 再構築、runtimeGateBuilder.ts canonical route、l2Evidence.ts structured parse、prototypingEvidence.ts validator — 全て内部モジュール。
- したがって Contract Index の `0 items` は v1.7.15 rev4 でも意図的な none-rationale であり、discussion-20260414195449523 のスコープ境界に整合する。

## v1.7.15 rev5 Contract Posture

- Contracts-first review completed for v1.7.15 rev5 single-PR completion design (`discussion-20260415014056471`).
- v1.7.15 rev5 は `packages/qfai` 内部の prototyping runtime / measurement / validators / CLI / docs を対象とした単一 PR リリースであり、外部向け stable contract は新設しない。
- 主な変更対象:
  - WS-1: `mode.ts` / `execution.ts` / `cli/commands/prototyping.ts` / `prototypingEvidence.ts` — all-mode non-UI surface rejection
  - WS-2: `runtimeObservation.ts`（新設）/ `runtimeGateBuilder.ts` / `specCoverage.ts` — observed-only ledger
  - WS-3: `browserQaPerScreen.ts`（新設）/ `uiObservation.ts` / `runtime.ts` — per-screen Browser QA mandatory
  - WS-4: `actionCoverage.ts`（新設）/ `uiObservation.ts` / `uiFidelityBuilder.ts` / `prototypingEvidence.ts` — action coverage semantics
  - WS-5: `harness/runtime.ts` — runFullHarness() standalone fail-closed (required adapters/screenContracts)
  - WS-6: `packResolver.ts`（新設）/ `structuredArtifactReaders.ts`（新設）/ `l2Evidence.ts` / `prototypingEvidence.ts` — calibration pack as SSOT
  - docs/README/SKILL: reality sync for new contracts
- 全て QFAI 内部モジュール。外部向け stable DB/API/UI contract は新設しない。
- したがって Contract Index の `0 items` は v1.7.15 rev5 でも意図的な none-rationale であり、discussion-20260415014056471 のスコープ境界に整合する。

## v1.7.15 rev6 Contract Posture

- Contracts-first review completed for v1.7.15 rev6 single-PR completion design (`discussion-20260415161758193`).
- v1.7.15 rev6 は `packages/qfai` 内部の prototyping mode/surface enforcement / surfacePolicy.ts 新設 / CalibrationLoader internal resolution / evidenceRefs semantics / reviewerSignoff semantics / uiFidelityBuilder 修正 / stale docs・tests 整理を対象とした単一 PR リリースであり、外部向け stable contract は新設しない。
- 主な変更対象:
  - WS-1: `cli/commands/prototyping.ts` / `execution.ts` / `prototypingEvidence.ts` — full-harness only enforcement
  - WS-2: `surfacePolicy.ts`（新設）/ `execution.ts` / `prototypingEvidence.ts` — surface allowlist SSOT
  - WS-3: `harness/runtime.ts` — runFullHarness() scalar params removed; CalibrationLoader internal resolution
  - WS-4: `runtimeGateBuilder.ts` / `specCoverage.ts` / `prototypingEvidence.ts` — concrete evidenceRefs enforcement
  - WS-5: `harness/runtime.ts` / `prototypingEvidence.ts` — reviewerSignoff status semantics
  - WS-6: `prototyping/uiFidelityBuilder.ts` / `prototypingEvidence.ts` — screenId matching; uiContractId hard-error
  - WS-7: `packages/qfai/assets/**` / `packages/qfai/README.md` / `tests/**` — stale semantics removal
- 全て QFAI 内部モジュール。外部向け stable DB/API/UI contract は新設しない。
- したがって Contract Index の `0 items` は v1.7.15 rev6 でも意図的な none-rationale であり、discussion-20260415161758193 のスコープ境界に整合する。

## v1.7.15 rev7 Contract Posture

- Contracts-first review completed for v1.7.15 rev7 single-PR completion design (`discussion-20260415203030886`).
- v1.7.15 rev7 は `packages/qfai` 内部の prototyping subsystem の 6 contract gap + WS-7 minor fix を対象とした単一 PR リリースであり、外部向け stable contract は新設しない。
- 主な変更対象:
  - WS-1: `execution.ts` — CalibrationPack upstream resolution; `runtime.ts` — CalibrationLoader import removal; `FullHarnessRequest` type change
  - WS-2: `execution.ts` — uiFidelity fail-closed guard (status/missingRequired/screen checks)
  - WS-3: `specCoverage.ts` / `prototypingEvidence.ts` — concrete evidenceRefs enforcement; `isConcreteArtifactRef()` helper
  - WS-4: `prototypingEvidence.ts` — calibrationRef metadata comparison against actual pack; hardcoded "1.0.0" heuristic removal
  - WS-5: `prototyping/errors.ts` (新設) — 6 distinct error classes; narrow catch blocks replacing wide catch-all
  - WS-6: `config.ts` — scalar calibration fields removed; obsolete field error; `qfai.config.yaml` template; `README.md`
  - WS-7: `surfacePolicy.ts` — rejection message generated from PROTOTYPING_SUPPORTED_SURFACES constant
- 全て QFAI 内部モジュール。外部向け stable DB/API/UI contract は新設しない。
- したがって Contract Index の `0 items` は v1.7.15 rev7 でも意図的な none-rationale であり、discussion-20260415203030886 のスコープ境界に整合する。

## v1.7.15 rev8 Contract Posture

- Contracts-first review completed for v1.7.15 rev8 single-PR completion design (`discussion-20260416023323603`).
- v1.7.15 rev8 は `packages/qfai` 内部の prototyping subsystem の ref grammar 統一 + runtimeGate validator 拡張を対象とした単一 PR リリースであり、外部向け stable contract は新設しない。
- 主な変更対象:
  - WS-1: `prototyping/pathUtils.ts` (新設) — `toRepoRelativeArtifactRef`, `assertConcreteArtifactRef`, `isConcreteArtifactRef` リーフモジュール
  - WS-2: `validators/prototypingEvidence.ts` — `runtimeGate.evidenceRefs: string[]` 型追加; parser 読み取り; 欠如/空配列/不正形式 → validator error
  - WS-3: `prototyping/specCoverage.ts`, `prototyping/execution.ts`, `prototyping/measurement.ts` (条件付き) — 全 5 ref サイトを pathUtils.ts の共有ヘルパーで統一
  - WS-4: 新テストファイル `prototypingExecution.productionPath.test.ts` — positive closure + negative injection
- 全て QFAI 内部モジュール。外部向け stable DB/API/UI contract は新設しない。
- TC-3 (breaking change): `runtimeGate.evidenceRefs` なしの既存 evidence bundle は rev8 以降 validation に失敗する。migration shim なし。
- したがって Contract Index の `0 items` は v1.7.15 rev8 でも意図的な none-rationale であり、discussion-20260416023323603 のスコープ境界に整合する。

## v1.7.15 rev9 Contract Posture

- Contracts-first review completed for v1.7.15 rev9 leaf-field traceability closure (`discussion-20260416092414328`).
- v1.7.15 rev9 は `packages/qfai` 内部の validator leaf-field validation 拡張 + bundleWriter schema strict化 + test fixture 置換 + README 同期を対象とした単一 PR リリースであり、外部向け stable contract は新設しない。
- 主な変更対象:
  - WS-1: `validators/prototypingEvidence.ts` — `runtimeGate.ui[]` 行レベル3フィールド（declaredRef 必須+concrete, renderEvidenceRefs[] 非空+concrete, browserQaEvidenceRefs[] 非空+concrete）、`axes[].evidenceRefs[]` per-axis 非空+concrete、`reviewerLogs[].evidenceRefs[]` 非空+concrete の validator 拡張。`isConcreteArtifactRef()` (pathUtils.ts) を全ケースで再利用
  - WS-2: `evidence/bundleWriter.ts` — `runtimeGate.ui[].declaredRef` required 化（optional→required）; 全 leaf array を required non-nullable 型に変更。条件付きで `runtimeObservation.ts` / `runtimeGateBuilder.ts` の null 出力経路を閉じる
  - WS-3: `tests/core/prototypingEvidence.test.ts` — 15 件の leaf-field 負例（7 ui[] + 5 axis + 3 reviewer）追加; `prototypingExecution.productionPath.test.ts` — leaf 具体参照 closure assertion + negative injection; 全 `tests/core/` fixture の synthetic token `evidenceRefs` を concrete refs に置換
  - WS-4: `packages/qfai/README.md` — concrete-ref contract の全 leaf フィールドを明記（top-level のみ strict という誤解を排除）
- 全て QFAI 内部モジュール。外部向け stable DB/API/UI contract は新設しない。
- TC-3 (breaking change): `runtimeGate.ui[].declaredRef` なし / leaf 配列 empty / synthetic token を含む既存 evidence bundle は rev9 以降 validation に失敗する。backward compatibility は明示的に放棄。migration shim なし。
- したがって Contract Index の `0 items` は v1.7.15 rev9 でも意図的な none-rationale であり、discussion-20260416092414328 のスコープ境界に整合する。

## v1.7.15 rev10 Contract Posture

- Contracts-first review completed for v1.7.15 rev10 semantic closure hardening (`discussion-20260416195444737`).
- v1.7.15 rev10 は `packages/qfai` 内部の prototyping subsystem の semantic closure hardening を対象とした単一 PR リリースであり、外部向け stable contract は新設しない。
- 主な変更対象:
  - WS-1: `validators/prototypingEvidence.ts`, `prototyping/execution.ts`, `prototyping/runtime.ts`, `prototyping/history.ts` — fullHarness terminal state machine: in-progress（terminationReason 欠如必須, finalDecision=pending, reviewerSignoff.status=pending）vs completed（terminationReason ∈ {abandoned,max-iterations,plateau} 必須, finalDecision=abandoned, reviewerSignoff.status=abandoned）。全制約 fail-closed 強制
  - WS-2: `evidence/screenContracts.ts` — `buildScreenContractInputs()` が `readCanonicalScreenContracts()` の sourceRef を直接利用。slug ベースのアンカー生成コード削除
  - WS-3: `evidence/l2Evidence.ts`, `validators/prototypingEvidence.ts` — 全 8 evidenceRefs カテゴリ（render/browserQa/uiObservation/discussion/screenContract/trend/runtimeGate/specCoverage）に `assertConcreteArtifactRefs()` を適用。`assertConcreteArtifactRefs()` (plural) は `pathUtils.ts` に array-level wrapper として追加（OQ-0002 SDD 解決: DR-0012-0054）
  - WS-4: `validators/specCoverage.ts`, `prototyping/execution.ts` — `specs[].coverageRefs[].declaredRef` が `/^\.qfai\/specs\/.+#(L\d+|\S+)$/` にマッチすること。bare path, discussion ref, screen contract ref は全て無効（OQ-0004 解決: DR-0012-0056）
- 全て QFAI 内部モジュール。外部向け stable DB/API/UI contract は新設しない。
- TC-3 (breaking change): in-progress+terminationReason が存在 / completed+terminationReason 欠如 / bare declaredRef / empty evidenceRefs category を含む既存 evidence bundle は rev10 以降 validation に失敗する。backward compatibility は明示的に放棄。migration shim なし。
- したがって Contract Index の `0 items` は v1.7.15 rev10 でも意図的な none-rationale であり、discussion-20260416195444737 のスコープ境界に整合する。

## v1.7.15-rev11 Contract Posture

- Contracts-first review completed for v1.7.15-rev11 (spec-0012 update).
- Semantic Closure Hardening (WS-1/WS-2/WS-3) は `packages/qfai/src/core/` 内部モジュールのみへの変更であり、外部向け stable contract は新設しない。
- `runMeasurement()` / `validatePanelScore()` は `index.ts` からの export を削除するが、これらは元々外部契約ではなく internal helper である。
- したがって Contract Index の `0 items` は意図的な none-rationale であり、spec-0012 のスコープ境界に整合する。

## ER Diagram

QFAI はデータベースを使用しないため、ER Diagram は省略する。
