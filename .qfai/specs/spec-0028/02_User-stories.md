# 02 User Stories

## US Catalog

- US-0028-0001: Static-First Default Recovery
- US-0028-0002: Render Evidence as Optional Capability
- US-0028-0003: Backend Abstraction Without Web Lock-In
- US-0028-0004: Browser QA Structured Outputs
- US-0028-0005: Non-Web Project Safety
- US-0028-0006: Browser QA Runner Returns Structured Findings (v1.7.6 Remediation)
- US-0028-0007: Runtime Evidence Real Status + Browser QA Actual Runners (v1.7.11 Completion)

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

## US-0028-0006: Browser QA Runner Returns Structured Findings (v1.7.6 Remediation)

- Parent: CAP-0028
- Source: discussion-20260329195516830, REQ-0028-0013, REQ-0009
- Goal: As a QFAI user running full-harness prototyping, I want the browser QA runner to return structured findings (not empty) so that each finding contains severity, location, and description and can be acted on downstream.
- Non-goals: Full cross-provider finding normalization (deferred OQ-0002); critique correctness as hard gate
- Notes: v1.7.6 remediation pass for REQ-0009. Runner must implement actual phase execution — stub/empty-array returns are not acceptable. full-harness mode required; standard mode gets "not available" message.

### Example Seeds

| Perspective         | Example                                                                                  | Status |
| ------------------- | ---------------------------------------------------------------------------------------- | ------ |
| Happy path          | Browser QA returns structured JSON with severity, location, description per finding      | seed   |
| Negative path       | Browser launch fails; runner returns structured error object, not empty array            | seed   |
| Edge / boundary     | QA finds 0 issues; runner returns empty findings array with `"status": "clean"` metadata | seed   |
| Permission / role   | Full-harness mode required; standard mode invoking QA returns "not available" message    | seed   |
| State transition    | QA runner transitions from `initializing` → `scanning` → `complete`; each state logged   | seed   |
| Idempotency / retry | Same page scanned twice; identical findings array returned                               | seed   |

## US-0028-0007: Runtime Evidence Real Status + Browser QA Actual Runners (v1.7.11 Completion)

- Parent: CAP-0028
- Source: REQ-0013, REQ-0014, REQ-0015, REQ-0016, REQ-0017, REQ-0018, DR-0103, DR-0104
- Goal: As a QFAI user, I want runtime render evidence to use the real captured/skipped/failed status model (no "requested") and browser QA to use actual phase runners producing real findings, so that evidence and QA results are honest and actionable end-to-end.
- Non-goals: Adding new status values beyond captured/skipped/failed; changing phase runner interface
- Notes: DR-0103 removes "requested" from status vocabulary. DR-0104 mandates all 4 browser QA phases execute actual analysis with honest reporting. Mode-specific evidence expectations must be enforced per mode (standard/low-cost/full-harness). Empty findings are permitted only when truly nothing is found (with "status": "clean" metadata). Foundation-only comments must be removed.

### Example Seeds

| Perspective         | Example                                                                                                     | Status |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| Happy path          | Render evidence uses captured/skipped/failed; browser QA returns actual findings per phase                  | seed   |
| Negative path       | Evidence with "requested" status → validation FAIL; browser QA with empty findings + no clean status → FAIL | seed   |
| Edge / boundary     | Full-harness mode with all 4 phases producing real findings; standard mode returns "not available"          | seed   |
| Permission / role   | N/A: mode-based, not role-based                                                                             | seed   |
| State transition    | Foundation-only runner → actual runner with real findings; "requested" → removed from vocabulary            | seed   |
| Idempotency / retry | Same configuration re-execution produces same status vocabulary and same findings structure                 | seed   |
