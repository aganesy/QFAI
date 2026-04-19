# 12_OQ-Resolution-Log — OQ 解決ログ

---

## 解決タイムライン

### 2026-04-16T19:54:44Z — ディスカッションパック生成開始

ディスカッションパック `discussion-20260416195444737` の生成を開始。設計書 rev10（SRC-0001）・監査レポート（SRC-0006）を一次ソースとして分析開始。

---

### 2026-04-16T19:55:00Z — OQ-0001 解決

**OQ**: `terminationReason` enum の各値が `finalDecision` / `reviewerSignoff.status` にどうマップされるか

**分析プロセス**:
1. 設計書 rev10（SRC-0001）の WS-1 定義を確認
2. v1.7.15-10 監査レポート（SRC-0006）の terminal semantics 節を確認
3. 選択肢 A（全値を `abandoned` にマップ）・B（`plateau` のみ `accepted`）・C（個別マッピング）を評価

**決定**:
- `abandoned` → `finalDecision=abandoned`, `reviewerSignoff.status=abandoned`
- `max-iterations` → `finalDecision=abandoned`, `reviewerSignoff.status=abandoned`
- `plateau` → `finalDecision=abandoned`, `reviewerSignoff.status=abandoned`

**根拠**: 自動 termination は設計上「人間によるレビューサインオフなしに `accepted` にはなれない」という原則に基づく。`accepted` への遷移は別途の reviewer action が必要。

**Disposition**: `resolved`

---

### 2026-04-16T19:55:30Z — OQ-0002 defer 決定

**OQ**: `refSemantics.ts` を新規ファイルとして導入すべきか、既存モジュールにインラインで定義すべきか

**分析プロセス**:
1. WS-3（`assertConcreteArtifactRefs()`）と WS-4（`declaredRef` 正規表現）の実装候補を確認
2. 今回の PR スコープ（`packages/qfai/src/core/` 内のファイル修正）において、新規ファイル追加は機能要件を満たすために必須ではないことを確認
3. SDD フェーズでのアーキテクチャレビューが適切と判断

**決定**: SDD フェーズに defer。今回の PR では既存モジュール（`l2Evidence.ts`, `specCoverage.ts`）にインラインで実装し、将来的に切り出しを検討する。

**影響範囲**: REQ-0006, REQ-0007 の達成は影響を受けない。

**Disposition**: `deferred`（gate: `sdd`）

---

### 2026-04-16T19:56:00Z — OQ-0003 解決

**OQ**: `runtimeGate` と `specCoverage` も `assertConcreteArtifactRefs()` ヘルパーを使用すべきか

**分析プロセス**:
1. 設計書 rev10（SRC-0001）の WS-3「全カテゴリ」という記述を確認
2. 8カテゴリの列挙（`render`, `browserQa`, `uiObservation`, `discussion`, `screenContract`, `trend`, `runtimeGate`, `specCoverage`）が WS-3 定義に含まれることを確認
3. `runtimeGate` / `specCoverage` のみを除外する設計上の根拠が存在しないことを確認

**決定**: `runtimeGate` と `specCoverage` を含む全8カテゴリに `assertConcreteArtifactRefs()` ヘルパーを適用する。

**根拠**: 一貫性（NFR-0004）。「全カテゴリ」に例外を設ける場合は設計書に明示が必要だが、その記述がない。

**Disposition**: `resolved`

---

### 2026-04-16T19:56:30Z — OQ-0004 解決

**OQ**: `declaredRef` でアンカーなしのベアファイルパスは有効か

**分析プロセス**:
1. 設計書 rev10（SRC-0001）の WS-4「`declaredRef` は `.qfai/specs/` パスかつ line/anchor refs」という記述を確認
2. traceability chain の目的（特定の宣言箇所を指す）を確認
3. ベアパスを許可した場合のリスク（ファイル全体への参照・リンク切れ検出困難）を評価

**決定**: `declaredRef` は常に `#L<n>`（行アンカー）または `#<anchor>`（宣言アンカー）を含む必要がある。ベアファイルパスは無効。

**根拠**: traceability の精度確保と、ファイル移動時のリンク切れ検出を容易にするため。

**正規表現（実装目安）**: `/^\.qfai\/specs\/.+#(L\d+|\S+)$/`

**Disposition**: `resolved`

---

## サマリー

| OQ ID | Disposition | 解決日時 |
|---|---|---|
| OQ-0001 | resolved | 2026-04-16T19:55:00Z |
| OQ-0002 | deferred (gate: sdd) | 2026-04-16T19:55:30Z |
| OQ-0003 | resolved | 2026-04-16T19:56:00Z |
| OQ-0004 | resolved | 2026-04-16T19:56:30Z |
