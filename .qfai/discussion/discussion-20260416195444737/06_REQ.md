# 06_REQ — 機能要件定義

---

## 要件一覧

### REQ-0001: ターミナル状態機械の実装

| 項目 | 内容 |
|---|---|
| **ID** | REQ-0001 |
| **タイトル** | `fullHarness` ターミナル状態機械の実装 |
| **ワークストリーム** | WS-1 |
| **優先度** | must |
| **ステータス** | draft |
| **SRC** | SRC-0001, SRC-0002, SRC-0006 |
| **説明** | `fullHarness` の outcome フィールド（`status`, `terminationReason`, `finalDecision`, `reviewerSignoff`）は2状態（`in-progress` / `completed`）の状態機械に従う。runtime はこの遷移を実装し、バリデータは制約を強制する。 |
| **受け入れ基準** | - `status` フィールドは `in-progress` または `completed` のいずれかである<br>- 状態遷移は `in-progress` → `completed` のみ有効<br>- バリデータが状態ごとのフィールド制約を検証する<br>- 制約違反はすべて即エラー（warning なし） |
| **関連 US** | US-001, US-005 |
| **関連 NFR** | NFR-0002, NFR-0004 |

---

### REQ-0002: `in-progress` バンドルのフィールドは pending

| 項目 | 内容 |
|---|---|
| **ID** | REQ-0002 |
| **タイトル** | `status=in-progress` 時のフィールド制約 |
| **ワークストリーム** | WS-1 |
| **優先度** | must |
| **ステータス** | draft |
| **SRC** | SRC-0001, SRC-0002 |
| **説明** | `status=in-progress` のとき、`terminationReason` フィールドは存在してはならない（absent）。`finalDecision` は `pending`、`reviewerSignoff.status` は `pending` でなければならない。 |
| **受け入れ基準** | - `status=in-progress` かつ `terminationReason` が存在する場合はエラー<br>- `status=in-progress` かつ `finalDecision ≠ pending` の場合はエラー<br>- `status=in-progress` かつ `reviewerSignoff.status ≠ pending` の場合はエラー |
| **関連 US** | US-001 |
| **関連 NFR** | NFR-0002, NFR-0004 |

---

### REQ-0003: `completed` バンドルは `terminationReason` を必須とする

| 項目 | 内容 |
|---|---|
| **ID** | REQ-0003 |
| **タイトル** | `status=completed` 時の `terminationReason` 必須制約 |
| **ワークストリーム** | WS-1 |
| **優先度** | must |
| **ステータス** | draft |
| **SRC** | SRC-0001, SRC-0002 |
| **説明** | `status=completed` のとき、`terminationReason` は `abandoned`、`max-iterations`、または `plateau` のいずれかでなければならない。absent は許可されない。 |
| **受け入れ基準** | - `status=completed` かつ `terminationReason=absent` の場合はエラー<br>- `status=completed` かつ `terminationReason` が未知の値の場合はエラー<br>- 有効値（`abandoned`, `max-iterations`, `plateau`）はすべて受け入れる |
| **関連 US** | US-001 |
| **関連 NFR** | NFR-0002, NFR-0004 |

---

### REQ-0004: `finalDecision` / `reviewerSignoff` の一貫性

| 項目 | 内容 |
|---|---|
| **ID** | REQ-0004 |
| **タイトル** | `terminationReason` → `finalDecision` / `reviewerSignoff.status` マッピング |
| **ワークストリーム** | WS-1 |
| **優先度** | must |
| **ステータス** | draft |
| **SRC** | SRC-0001, SRC-0002 |
| **説明** | `status=completed` のとき、`finalDecision` および `reviewerSignoff.status` は `terminationReason` と一貫したマッピングに従う。OQ-0001 で解決されたマッピング: `abandoned`/`max-iterations`/`plateau` はいずれも `finalDecision=abandoned`、`reviewerSignoff.status=abandoned` にマップされる。 |
| **受け入れ基準** | - `terminated` バンドルで `finalDecision=pending` の場合はエラー<br>- `terminated` バンドルで `reviewerSignoff.status=pending` の場合はエラー<br>- `terminationReason=abandoned` → `finalDecision=abandoned` かつ `reviewerSignoff.status=abandoned` で通過<br>- `terminationReason=max-iterations` → 同上<br>- `terminationReason=plateau` → 同上 |
| **関連 US** | US-001 |
| **関連 NFR** | NFR-0002, NFR-0004 |

---

### REQ-0005: スクリーンコントラクトへの canonical sourceRef 使用

| 項目 | 内容 |
|---|---|
| **ID** | REQ-0005 |
| **タイトル** | `buildScreenContractInputs()` が canonical sourceRef を直接使用 |
| **ワークストリーム** | WS-2 |
| **優先度** | must |
| **ステータス** | draft |
| **SRC** | SRC-0001, SRC-0002, SRC-0005 |
| **説明** | `buildScreenContractInputs()` は `readCanonicalScreenContracts()` が返す各スクリーンの `sourceRef` を直接利用する。ルートスラグからアンカーを生成するロジックは削除する。出力フォーマット: `.qfai/discussion/<pack>/uiux/40_screen_contracts.md#<screenId>` |
| **受け入れ基準** | - `buildScreenContractInputs()` の出力 ref がルートスラグアンカーを含まない<br>- `readCanonicalScreenContracts()` の `sourceRef` と完全一致する<br>- ルートスラグ生成コードが `screenContracts.ts` から削除されている |
| **関連 US** | US-002, US-005 |
| **関連 NFR** | NFR-0001, NFR-0004 |

---

### REQ-0006: イテレーション証拠 ref カテゴリの厳格な具体性検証

| 項目 | 内容 |
|---|---|
| **ID** | REQ-0006 |
| **タイトル** | 全8カテゴリの非空・具体的 artifact ref 検証 |
| **ワークストリーム** | WS-3 |
| **優先度** | must |
| **ステータス** | draft |
| **SRC** | SRC-0001, SRC-0004, SRC-0006 |
| **説明** | `fullHarness.iterations[].evidenceRefs` の全8カテゴリ（`render`, `browserQa`, `uiObservation`, `discussion`, `screenContract`, `trend`, `runtimeGate`, `specCoverage`）は非空であり、かつすべてのエントリが `assertConcreteArtifactRefs()` ヘルパーを通過する具体的な artifact ref でなければならない。OQ-0003 で `runtimeGate` と `specCoverage` も同ヘルパーを適用することが解決された。 |
| **受け入れ基準** | - 空配列はエラー（全8カテゴリ）<br>- プレースホルダー文字列（空文字・`"TODO"`・`"pending"` 等）はエラー<br>- `runtimeGate` と `specCoverage` も `assertConcreteArtifactRefs()` でチェック<br>- 複数イテレーション中の任意のイテレーションで違反があればエラー |
| **関連 US** | US-003, US-005 |
| **関連 NFR** | NFR-0002, NFR-0003, NFR-0004 |

---

### REQ-0007: `declaredRef` の semantic バリデーション

| 項目 | 内容 |
|---|---|
| **ID** | REQ-0007 |
| **タイトル** | `specs[].coverageRefs[].declaredRef` を `.qfai/specs/` パス + anchor に限定 |
| **ワークストリーム** | WS-4 |
| **優先度** | must |
| **ステータス** | draft |
| **SRC** | SRC-0001, SRC-0002, SRC-0005, SRC-0006 |
| **説明** | `declaredRef` は正規表現 `/^\.qfai\/specs\/.+#(L\d+\|\S+)$/` に一致しなければならない。ベアファイルパス（アンカーなし）は無効（OQ-0004 resolved）。`.qfai/discussion/` パス・スクリーン contract ref・render evidence・Browser QA ref も無効。 |
| **受け入れ基準** | - `.qfai/specs/` 以外のパスはエラー<br>- `#L<n>` または `#<anchor>` を含まないパスはエラー<br>- `.qfai/discussion/` パスはエラー<br>- 違反は即エラー（warning なし） |
| **関連 US** | US-004, US-005 |
| **関連 NFR** | NFR-0001, NFR-0002, NFR-0004 |

---

### REQ-0008: runtime / validator / tests / README の同期

| 項目 | 内容 |
|---|---|
| **ID** | REQ-0008 |
| **タイトル** | WS-1〜WS-4 の変更を runtime・validator・tests・README で同期 |
| **ワークストリーム** | WS-5（同期） |
| **優先度** | must |
| **ステータス** | draft |
| **SRC** | SRC-0001 |
| **説明** | WS-1〜WS-4 で加えた変更は、runtime・validator・テスト・README がすべて一貫して反映されている必要がある。どれか1つが古い実装のままであることは許可されない。 |
| **受け入れ基準** | - `README.md` が WS-1〜WS-4 の API 変更を反映<br>- `pnpm format:check && pnpm lint && pnpm check-types` 通過<br>- 全テストスイート GREEN<br>- `qfai validate` が production path 出力を通過 |
| **関連 US** | US-005 |
| **関連 NFR** | NFR-0001, NFR-0002, NFR-0003, NFR-0004 |

---

### REQ-0009: 各ワークストリームのネガティブフィクスチャカバレッジ

| 項目 | 内容 |
|---|---|
| **ID** | REQ-0009 |
| **タイトル** | WS-1〜WS-4 それぞれに最低1件のネガティブフィクスチャ |
| **ワークストリーム** | WS-1〜WS-4 |
| **優先度** | must |
| **ステータス** | draft |
| **SRC** | SRC-0001, SRC-0006 |
| **説明** | 各バリデーションルールが実際に機能していることを証明するため、各ワークストリームに対してバリデーターが正しくエラーを返すことを検証するネガティブフィクスチャを用意する。 |
| **受け入れ基準** | - WS-1: `terminationReason` 制約違反フィクスチャ（最低3件: in-progress + reason, completed + absent reason, pending on completed）<br>- WS-2: slug-based anchor フィクスチャ（最低1件）<br>- WS-3: 各カテゴリ空配列フィクスチャ（最低8件）<br>- WS-4: ベアパス・discussion ref フィクスチャ（最低2件） |
| **関連 US** | US-001, US-002, US-003, US-004 |
| **関連 NFR** | NFR-0003 |
