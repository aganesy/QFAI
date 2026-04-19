# 99_delta — 採択決定レコード

---

## メタデータ

| 項目 | 値 |
|---|---|
| Discussion ID | discussion-20260416195444737 |
| 記録日 | 2026-04-16 |
| フェーズ | discussion |

---

## 採択決定（Adopted Decisions）

### AD-0001: terminationReason 全3値を `abandoned` にマップする

**決定内容**: `terminationReason` の `abandoned`・`max-iterations`・`plateau` はすべて `finalDecision=abandoned`, `reviewerSignoff.status=abandoned` にマップされる。

**決定根拠**: 自動 termination は「人間によるレビューサインオフなしに `accepted` にはなれない」という設計原則。`accepted` への遷移は reviewer action が別途必要。

**元 OQ**: OQ-0001 → resolved  
**影響 REQ**: REQ-0001, REQ-0004  
**影響ファイル**: `runtime.ts`, `execution.ts`, `prototypingEvidence.ts`, `fullHarnessRuntime.test.ts`

---

### AD-0002: `declaredRef` は常にアンカー付きの `.qfai/specs/` パスのみ有効

**決定内容**: `declaredRef` は `/^\.qfai\/specs\/.+#(L\d+|\S+)$/` に一致するパスのみ有効。ベアファイルパス・discussion ref・screen contract ref・render evidence・Browser QA ref はすべて無効。

**決定根拠**: traceability chain の精度確保。ファイル全体への参照では宣言箇所の特定ができず、traceability の目的を達せない。

**元 OQ**: OQ-0004 → resolved  
**影響 REQ**: REQ-0007  
**影響ファイル**: `specCoverage.ts`, `execution.ts`, `prototypingExecution.productionPath.test.ts`

---

### AD-0003: 全8カテゴリに `assertConcreteArtifactRefs()` を適用する

**決定内容**: `fullHarness.iterations[].evidenceRefs` の全8カテゴリ（`render`, `browserQa`, `uiObservation`, `discussion`, `screenContract`, `trend`, `runtimeGate`, `specCoverage`）に対して `assertConcreteArtifactRefs()` ヘルパーを適用する。`runtimeGate` と `specCoverage` も例外なく対象とする。

**決定根拠**: 設計書 rev10（SRC-0001）の「全カテゴリ」という記述。一貫性（NFR-0004）の観点から例外を設けない。

**元 OQ**: OQ-0003 → resolved  
**影響 REQ**: REQ-0006  
**影響ファイル**: `l2Evidence.ts`, `prototypingEvidence.ts`, `prototypingEvidence.test.ts`

---

### AD-0004: `buildScreenContractInputs()` はルートスラグ生成を廃止し `sourceRef` 直接利用

**決定内容**: `screenContracts.ts` の `buildScreenContractInputs()` はルートスラグからアンカーを生成するロジックを削除し、`readCanonicalScreenContracts()` が返す `sourceRef` をそのまま使用する。

**決定根拠**: canonical sourceRef の一元化（WS-2）。ルートスラグは URL 設計の変更で失効するリスクがあり、`sourceRef` は常に安定した参照を提供する。

**影響 REQ**: REQ-0005  
**影響ファイル**: `screenContracts.ts`

---

### AD-0005: `refSemantics.ts` の新規ファイル導入を SDD フェーズに defer

**決定内容**: `assertConcreteArtifactRefs()` や `declaredRef` 正規表現を専用ファイルに切り出すかどうかは、今回の PR スコープ外とし SDD フェーズで判断する。

**決定根拠**: 実装詳細であり機能要件の達成を妨げない。今回の PR では既存モジュールへのインライン実装で進める。

**元 OQ**: OQ-0002 → deferred (gate: sdd)  
**影響 REQ**: なし（機能的 DoD には影響なし）  
**参照**: 13_Deferred.md DEF-0001

---

## Drift Events（ドリフトイベント）

> 今回のディスカッションパック生成中に発生したドリフトイベントはなし。

---

## Rejected Visual Directions（却下ビジュアル方向性）

> `ui_bearing: false`（non-UI パック）のため、このセクションは非適用。
