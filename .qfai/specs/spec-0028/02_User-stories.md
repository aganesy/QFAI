# 02 User Stories

## US Catalog

- US-0028-0001: Static-First Default Recovery
- US-0028-0002: Render Evidence as Optional Capability
- US-0028-0003: Backend Abstraction Without Web Lock-In
- US-0028-0004: Browser QA Structured Outputs
- US-0028-0005: Non-Web Project Safety

## US-0028-0001: Static-First Default Recovery

- Parent: CAP-0028
- Source: discussion-20260329130000123, REQ-0028-0001, REQ-0028-0002, REQ-0028-0003, REQ-0028-0010
- Goal: QFAI user として、`/qfai-prototyping` の default path が static-first obligations のみで完了判定されるようにしたい。runtime-heavy な環境準備を baseline prototyping に強制されないため。
- Non-goals: runtime-heavy checks の廃止（opt-in / 上位フェーズへ移動のみ）、mode 自動選択
- Notes: DEC-0001 (static-first default) に基づく。API non-404, DB existence, UI route reachability は default hard gate から除外される。standard / low-cost / full-harness mode 間で obligation 混線を防ぐ (DEC-0005)。

### Example Seeds

| Perspective         | Example                                                                                 | Status |
| ------------------- | --------------------------------------------------------------------------------------- | ------ |
| Happy path          | Default mode で source/route/state/contract-level obligations のみ評価し完了            | seed   |
| Negative path       | Default mode が API non-404 や DB existence を強制 -> 設計違反                          | seed   |
| Edge / boundary     | Low-cost mode と standard mode の境界で obligation が混ざらない                         | seed   |
| Permission / role   | N/A: CLI 実行者に特別な role 分岐はない                                                 | seed   |
| State transition    | Runtime-heavy default 旧挙動 -> static-first default 新挙動、opt-in runtime mode は維持 | seed   |
| Idempotency / retry | 同一 mode/capability 条件では連続実行しても同じ completion expectation                  | seed   |

## US-0028-0002: Render Evidence as Optional Capability

- Parent: CAP-0028
- Source: discussion-20260329130000123, REQ-0028-0004, REQ-0028-0005
- Goal: Visual/runtime evidence が必要な QFAI user として、screenshot, viewport metadata, DOM/HTML snapshot reference が capability 有効時のみ capture されるようにしたい。default usage を軽量に保ちつつ、richer evidence を利用可能にするため。
- Non-goals: evidence quality の自動判定を hard gate にすること、evidence schema の詳細版管理 (v1.7.6 deferred)
- Notes: DEC-0002 (optional capability with captured/skipped/failed) に基づく。partial capture をサポートし、個々の evidence element に独立した status を持つ (NFR-0028-0004)。

### Example Seeds

| Perspective         | Example                                                                                             | Status |
| ------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| Happy path          | Render evidence enabled: screenshot, viewport metadata, DOM snapshot ref が `captured` で記録される | seed   |
| Negative path       | Capability 未登録時に evidence を要求せず `skipped` として扱う                                      | seed   |
| Edge / boundary     | Screenshot は `captured` だが DOM snapshot が unavailable -> partial status を表現                  | seed   |
| Permission / role   | N/A: capability toggle のみで role 制御はない                                                       | seed   |
| State transition    | Capability off -> on 切替で evidence fields 追加、default obligations は不変                        | seed   |
| Idempotency / retry | 再実行時に captured/skipped/failed status 語彙は同じ schema で出力される                            | seed   |

## US-0028-0003: Backend Abstraction Without Web Lock-In

- Parent: CAP-0028
- Source: discussion-20260329130000123, REQ-0028-0006, REQ-0028-0007
- Goal: QFAI maintainer として、browser/visual-review backend を capability abstraction で登録できるようにしたい。Playwright, agent-browser, future backends が共存できつつ mandatory default にならないため。
- Non-goals: Playwright 固定 backend、backend 実装の完成（abstraction 先行）
- Notes: DEC-0003 (provider abstraction with optional registration) に基づく。backend 未登録でも default prototyping は失敗しない (NFR-0028-0001)。

### Example Seeds

| Perspective         | Example                                                                            | Status |
| ------------------- | ---------------------------------------------------------------------------------- | ------ |
| Happy path          | Playwright style backend と screenshot-only fallback が同一 abstraction で宣言可能 | seed   |
| Negative path       | Web backend 未登録でも default prototyping が失敗しない                            | seed   |
| Edge / boundary     | Future mobile/desktop backend 追加でも browser 前提の必須項目が漏れ込まない        | seed   |
| Permission / role   | N/A                                                                                | seed   |
| State transition    | Backend registration 追加後に browser QA phase が有効化される                      | seed   |
| Idempotency / retry | 同一 backend declaration では backend resolution 結果が安定する                    | seed   |

## US-0028-0004: Browser QA Structured Outputs

- Parent: CAP-0028
- Source: discussion-20260329130000123, REQ-0028-0008, REQ-0028-0009, REQ-0028-0010
- Goal: Browser QA を実行する QFAI user として、smoke, interaction, visual, accessibility の各 phase が structured findings と repair suggestions を返すようにしたい。follow-up work を actionable かつ mode-aware にするため。
- Non-goals: finding taxonomy の完全正規化 (v1.7.6 deferred, OQ-0002)、critique correctness を hard gate にすること
- Notes: DEC-0004 (structured findings + repair suggestions) に基づく。各 phase は独立に skip/実行可能。output schema は phase 拡張しても互換を維持する。

### Example Seeds

| Perspective         | Example                                                                                          | Status |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| Happy path          | Smoke/interaction/visual/accessibility 各 phase が structured finding + repair suggestion を返す | seed   |
| Negative path       | Backend 不在時は hard fail ではなく skip/fail-open semantics                                     | seed   |
| Edge / boundary     | Visual phase のみ unsupported でも smoke/interaction/accessibility を独立評価可能                | seed   |
| Permission / role   | N/A                                                                                              | seed   |
| State transition    | Smoke only から full phase 実行へ拡張しても output schema は互換維持                             | seed   |
| Idempotency / retry | Finding normalization が同一入力に対して安定する                                                 | seed   |

## US-0028-0005: Non-Web Project Safety

- Parent: CAP-0028
- Source: discussion-20260329130000123, REQ-0028-0011, REQ-0028-0012
- Goal: Non-web/non-visual project user として、browser/evidence features が fail-open or skip cleanly するようにしたい。自分のプロジェクトが無関係な dependency にブロックされないため。
- Non-goals: non-web project に browser capability を強制推奨すること
- Notes: NFR-0028-0006 (0 new universal deps) に基づく。docs/report/tests は static/runtime boundary と optional capability semantics を説明する (REQ-0028-0012)。

### Example Seeds

| Perspective         | Example                                                                                       | Status |
| ------------------- | --------------------------------------------------------------------------------------------- | ------ |
| Happy path          | Non-web project で browser/evidence capability なしでも warning/error 増加なく通過            | seed   |
| Negative path       | Non-web project に browser setup を要求 -> 方針違反                                           | seed   |
| Edge / boundary     | Mixed artifacts repo でも project classification と capability declaration の整合で誤爆しない | seed   |
| Permission / role   | N/A                                                                                           | seed   |
| State transition    | Non-web project が後で backend capability を導入しても default behavior は維持される          | seed   |
| Idempotency / retry | Capability 未設定時の skip semantics は再実行でも同一                                         | seed   |
