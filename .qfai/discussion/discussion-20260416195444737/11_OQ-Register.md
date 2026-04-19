# 11_OQ-Register — Open Question レジスタ

> **ステータス確認**: 全 OQ の `Disposition` は `resolved` または `deferred`。`open` は **ゼロ件**。

---

## OQ テーブル

| OQ-ID | Title | Gate | Disposition | Owner | Rationale | Options | Recommendation | Next-Decision-Point | Due | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| OQ-0001 | `terminationReason` enum → `finalDecision` / `reviewerSignoff.status` マッピング | discussion | resolved | agent | SRC-0001 rev10 sec3-1 に「設計内で1通りに固定する」と明示されており、自動 termination は常に放棄（`abandoned`）扱いとなる。`accepted` への遷移は人間によるサインオフが別途必要。 | A) 全非受理値を `abandoned` にマップ（推奨） / B) `plateau` のみ `accepted` にマップ / C) 値ごとに個別マッピング定義 | A: `abandoned`/`max-iterations`/`plateau` → `finalDecision=abandoned`, `reviewerSignoff.status=abandoned` | discussion完了まで | 2026-04-16 | SRC-0001 sec3-1, SRC-0006 監査レポート |
| OQ-0002 | `refSemantics.ts` 新規ファイル vs 既存モジュールインライン定義 | sdd | deferred | agent | 実装詳細であり REQ-0006/REQ-0007 の達成を妨げない。SDD フェーズのアーキテクチャレビューで決定することが適切。 | A) 新規 `refSemantics.ts` として切り出す / B) 既存モジュールにインライン（推奨暫定） / C) SDD フェーズで決定 | C: SDD フェーズで決定。それまでは既存モジュールへのインライン実装で進める。 | SDD フェーズ開始時に再起票し `packages/qfai/src/core/` モジュール構成レビューで決定 | sdd フェーズ開始時 | SRC-0001 sec7-2, OQ-0002 discussion log |
| OQ-0003 | `runtimeGate` / `specCoverage` も `assertConcreteArtifactRefs()` を適用すべきか | discussion | resolved | agent | SRC-0001 WS-3 は「全カテゴリ」と明示しており、`runtimeGate`/`specCoverage` を除外する根拠がない。一貫性（NFR-0004）観点からも全8カテゴリへの適用が正しい。 | A) 全8カテゴリに同ヘルパーを適用（推奨） / B) `runtimeGate`/`specCoverage` は別ルール | A: 全8カテゴリに `assertConcreteArtifactRefs()` を適用 | discussion完了まで | 2026-04-16 | SRC-0001 sec6-3-1, SRC-0006 |
| OQ-0004 | `declaredRef` でアンカーなしのベアファイルパスは有効か | discussion | resolved | agent | traceability chain の目的は特定の宣言箇所を指すことであり、ファイル全体への参照は精度不足。SRC-0001 の「line/anchor refs」という表現もアンカー必須を示唆している。 | A) ベアパスも有効（ファイル全体を指す） / B) 常にアンカー必須（推奨）(`#L<n>` または宣言アンカー) | B: `declaredRef` は常に `#L<n>` または `#<anchor>` を含む必要がある | discussion完了まで | 2026-04-16 | SRC-0001 sec6-4-1, SRC-0002 |

---

## サマリー

| Disposition | 件数 |
|---|---|
| resolved | 3 |
| deferred | 1 |
| **open** | **0** |
