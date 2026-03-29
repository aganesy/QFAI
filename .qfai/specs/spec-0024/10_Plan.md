# 10 Plan

- Spec: spec-0024
- Parent: CAP-0024
- Focus: Render Evidence Automation
- Scope boundary: capture + validation + docs / report only
- Non-goals: browser QA full audit, screenshot diff / baseline, automated repair, external critique adapter

## 実装戦略

### Grounded slice

この plan は、少なくとも次の slice が discussion 側で既に grounded している前提で進める。

- `qfai prototyping` に render evidence を追加する
- Playwright は optional にする
- captured / skipped / failed を structured で残す
- render evidence は JSON と file path を正とする
- report と docs は next-step guidance を持つ
- v1.7.1 では browser QA の full audit には進まない

### 変更対象ファイル

| 区分         | 変更対象                                                   | 役割                                         |
| ------------ | ---------------------------------------------------------- | -------------------------------------------- |
| CLI/runtime  | `packages/qfai/src/cli/commands/prototyping.ts`            | render capture の起点と persistence wiring   |
| Config       | `packages/qfai/src/core/config.ts`                         | `uiux.renderEvidence` の normalization       |
| Types        | `packages/qfai/src/core/types.ts`                          | `renders[]` と typed outcome の追加          |
| Helper       | `packages/qfai/src/core/uiux/renderEvidence.ts`            | lazy Playwright capture と outcome 生成      |
| Helper types | `packages/qfai/src/core/uiux/renderEvidenceTypes.ts`       | capture result / viewport / path の型定義    |
| Validators   | `packages/qfai/src/core/validators/prototypingEvidence.ts` | shape / file existence / coverage validation |
| Validators   | `packages/qfai/src/core/validators/renderCritique.ts`      | render evidence を一次情報として読む         |
| Validators   | `packages/qfai/src/core/validators/designFidelity.ts`      | responsive 根拠の補助参照                    |
| Validators   | `packages/qfai/src/core/validators/navigationFlow.ts`      | route coverage と render route の整合補助    |
| Report       | `packages/qfai/src/core/report.ts`                         | missing / skipped / failed の guidance       |
| Init assets  | `packages/qfai/assets/init/.qfai/evidence/README.md`       | render bundle 説明の更新                     |
| Root docs    | `README.md`, `CHANGELOG.md`                                | 利用者向けの変更点要約                       |
| Tests        | `packages/qfai/tests/cli/prototyping.test.ts`              | CLI journeys の検証                          |
| Tests        | `packages/qfai/tests/core/prototypingEvidence.test.ts`     | render bundle の検証                         |
| Tests        | `packages/qfai/tests/core/renderCritique.test.ts`          | legacy markdown 併存の検証                   |
| Tests        | `packages/qfai/tests/core/designFidelity.test.ts`          | responsive evidence の補助検証               |
| Tests        | `packages/qfai/tests/core/navigationFlow.test.ts`          | route coverage の補助検証                    |
| Tests        | `packages/qfai/tests/integration/**`                       | filesystem / capture / validation の統合確認 |
| Tests        | `packages/qfai/tests/e2e/**`                               | US-level CLI journey の最小確認              |

## Contract posture

- External DB/API/UI contracts: `0 items`
- Rationale: spec-0024 は QFAI 自体の外部 surface を増やさず、既存 `qfai prototyping` の内部 evidence / validator / report / docs を拡張する。
- Reference: `_policies/05_Contracts.md`, `DR-0048`

## Phase 1: データモデルと config を先に固める

### 目的

- capture 実装の前に、`renders[]` の shape と `uiux.renderEvidence` の正規化を固定する。
- helper / validator / report が同じ型を読むようにする。

### 実施内容

1. `renderEvidenceTypes.ts` を新設し、viewport、status、path、timestamp、reason を typed で定義する。
2. `types.ts` に `uiFidelity.screens[].renders[]` を追加し、captured / skipped / failed の union を表現する。
3. `config.ts` に `uiux.renderEvidence` を追加する。
4. CLI override の優先順位を整理する。
5. `outputDir` と `baseUrl` は存在しない場合でも従来互換を保つ。
6. `viewports` は default を `desktop` / `mobile` にして、tablet は opt-in に留める。

### 確認ポイント

- JSON に large blob を入れず、file path のみを保持できること。
- config が absent でも legacy projects の挙動が変わらないこと。
- helper が config を直接破壊しないこと。

## Phase 2: render capture helper を分離して実装する

### 目的

- `prototyping.ts` を肥大化させず、capture の責務を helper に閉じ込める。
- Playwright が無い環境でも typed outcome で継続できるようにする。

### 実施内容

1. `renderEvidence.ts` に route normalization と viewport expansion を置く。
2. Playwright は dynamic import にし、未導入時は throw ではなく `skipped` outcome を返す。
3. capture 成功時は screenshot と HTML snapshot を指定命名で保存する。
4. route 単位の partial failure を許容し、screen 全体を捨てない。
5. `captured / skipped / failed` の outcome を CLI へ返す。
6. `--render-out` と `--base-url` の CLI override を helper へ伝播する。

### 確認ポイント

- filesystem write の失敗が route 全体の abort に直結しないこと。
- base URL 未到達や browser launch failure が理由付きで残ること。
- capture helper が browser QA full audit に拡張されていないこと。

## Phase 3: CLI wiring と persistence を接続する

### 目的

- 既存 `qfai prototyping` の flow に render evidence を差し込む。
- 現行の autogen flow を壊さず、render evidence を追加情報として保存する。

### 実施内容

1. `prototyping.ts` で `--autogen-ui-fidelity` と `--render-evidence` の組み合わせを解釈する。
2. autogen 無効時は render request を no-op にせず、明示的な skipped state を残す。
3. capture 結果を `prototyping.json` の `uiFidelity.screens[].renders[]` に書き込む。
4. route ごとの asset path を deterministic に生成する。
5. 失敗時のログは最小限かつ具体的にする。
6. 既存の markdown-only evidence との共存を維持する。

### 確認ポイント

- 同一入力で同一 path 体系になること。
- `skipped` が未実行扱いではなく evidence として残ること。
- render capture の追加が他の prototyping 行為に副作用を出さないこと。

## Phase 4: validators を段階的に追加する

### 目的

- capture の存在だけでなく、形・整合・欠落理由を validation できるようにする。
- validate / report が render evidence を理解できるようにする。

### 実施内容

1. `prototypingEvidence.ts` で `renders[]` の shape、必須 path、file existence を検証する。
2. default / high / strict の扱いを severity policy としてまとめる。
3. `renderCritique.ts` は render evidence を一次情報として優先し、markdown critique は補助として読む。
4. `designFidelity.ts` は responsive 根拠不足の補助 warning を出せるようにする。
5. `navigationFlow.ts` は route coverage と render capture の不一致を補助的に見られるようにする。
6. 既存 markdown-only projects を壊さない分岐を残す。

### 確認ポイント

- captured entry の欠落 file が error になること。
- all skipped の扱いが profile に応じて説明可能であること。
- legacy markdown-only path が回帰しないこと。

## Phase 5: docs / assets / report を同期させる

### 目的

- 利用者が render evidence の意味と次アクションを迷わず理解できるようにする。

### 実施内容

1. `packages/qfai/assets/init/.qfai/evidence/README.md` に render bundle の説明を追記する。
2. default path convention を README に明記する。
3. `report.ts` に missing / skipped / failed の guidance を追加する。
4. root `README.md` と `CHANGELOG.md` に利用者向け要約を入れる。
5. docs と validator が同じ用語を使うように揃える。

### 確認ポイント

- README と validator が異なる語彙を使っていないこと。
- report が「なぜ重要か」と「次に何をするか」を両方返せること。
- docs だけ先行してコードが追いつかない状態を作らないこと。

## Validation and Test Strategy

### L2 Unit

- `packages/qfai/tests/core/prototypingEvidence.test.ts`
- `packages/qfai/tests/core/renderCritique.test.ts`
- `packages/qfai/tests/core/designFidelity.test.ts`
- `packages/qfai/tests/core/navigationFlow.test.ts`

対象:

- shape validation
- file existence validation
- skipped / failed / captured の正規化
- profile-dependent severity
- markdown-only compatibility
- responsive evidence の補助検証

### L3 Integration

- `packages/qfai/tests/integration/**`

対象:

- temporary filesystem への evidence persistence
- render helper と validator の接続
- init README / report guidance の整合
- partial failure の保存結果

### L5 E2E

- `packages/qfai/tests/e2e/**`

対象:

- `qfai prototyping` の primary journey
- `--autogen-ui-fidelity --render-evidence` の happy path
- Playwright unavailable 時の degraded path

### CLI tests

- `packages/qfai/tests/cli/prototyping.test.ts`

対象:

- flag parsing
- CLI override priority
- output path / base URL / viewport expansion
- no-op 化しない skipped flow

### Verification commands

- `pnpm format:check`
- `pnpm lint`
- `pnpm check-types`
- `pnpm test`
- `qfai validate --fail-on error`

### Evidence and review gate

- `.qfai/report/preflight_summary.md` を最新 discussion に合わせて更新する。
- `.qfai/report/validate.log` は最新成果物に対して再生成し、`error=0` を completion gate とする。
- `.qfai/report/specs-coverage/spec-0024.md` を読み、`QFAI-COV-207` を density-smell signal として記録する。
- `.qfai/evidence/sdd-spec-0024.md` に phase order、Work Orders Summary、validate/review evidence を記録する。
- `.qfai/review/review-<timestamp>/` で full roster を実行し、最終 reviewer を含む `PASS` を completion gate とする。

## ATDD Annotation Guidance

- `tests/e2e/**` は US-level の CLI journey に使う。
- `tests/integration/**` は TC-level の filesystem / helper / validator 連携に使う。
- `tests/api/**` はこの spec では原則不要。
- `tests/e2e/**` には `QFAI:SPEC-0024:US-XXXX` を付ける。
- `tests/integration/**` には `QFAI:SPEC-0024:TC-XXXX` を付ける。
- `tests/api/**` はこの spec では原則 N/A とし、`CON-API-*` 注釈を要求しない。
- `tests/cli/**` は command smoke として使ってよいが、E2E / Integration の代替にしない。
- AC annotation は任意だが、US→TC の追跡は崩さない。
- unknown ID を注釈しない。
- `tests/api/**` に `TC` 注釈を置かない。

## Phase 6: v1.7.6 Remediation — Render Evidence CLI Wiring (DR-0081)

### 目的

- REQ-0024-0008 の未達（placeholder が CLI 出力に残っている）を解消する。
- `renderCritique.ts` の render evidence 一次ソース接続を `prototyping.ts` CLI フローに完全に貫通させる。

### 実施内容

1. `prototyping.ts` の CLI 出力パスで render evidence フィールド（screenshot hash、タイムスタンプ、file path）を実際に読み取り出力する。
2. render target unreachable 時は明示的な "no evidence captured" エラーを CLI に返す（stub 出力禁止）。
3. 0 byte の render output を検出し、empty フラグと warning を記録する。
4. 非 UI surface の場合、render evidence セクションを完全に省略する（placeholder なし）。
5. evidence の pending → captured 遷移がアトミックになるよう書き込みロジックを修正する。
6. 同一入力での再実行が同一 content hash を生成することを確認する（idempotency）。

### 確認ポイント

- TC-0024-0018..TC-0024-0023 が全て GREEN になること。
- CLI 出力に placeholder 文字列が含まれないこと。
- 0 byte ファイルが warning なしで通過しないこと。
- non-UI surface で render evidence section が存在しないこと。

### 変更対象ファイル

| 区分        | 変更対象                                                        | 役割                                              |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------- |
| CLI/runtime | `packages/qfai/src/cli/commands/prototyping.ts`                 | evidence fields を CLI 出力に実配線               |
| Validators  | `packages/qfai/src/core/validators/renderCritique.ts`           | 一次ソース接続の完結、0 byte 検出追加             |
| Tests       | `packages/qfai/tests/cli/prototyping.test.ts`                   | TC-0024-0018/0019/0021/0022/0023 対応             |
| Tests       | `packages/qfai/tests/core/prototypingEvidence.test.ts`          | TC-0024-0020 対応                                 |
| Tests       | `packages/qfai/tests/integration/**`                            | real wiring / 0 byte / non-UI surface の統合確認  |

## Risks and Mitigations

| Risk                                                | Mitigation                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| Playwright optional 化で capture 成功率が読みにくい | typed skipped outcome と guidance を必ず残す                     |
| CLI 改修で prototyping flow が壊れる                | helper 分離と unit test 先行で局所化する                         |
| evidence JSON が肥大化する                          | image data を埋め込まず path のみ保存する                        |
| legacy markdown-only projects が壊れる              | render evidence を optional source として扱う                    |
| validator の strictness が過剰になる                | default / high / strict の扱いを明示し、profile ごとにテストする |
| docs とコードがズレる                               | 同一 PR で docs / assets / code / tests をまとめる               |

## Suggested Implementation Order

1. `renderEvidenceTypes.ts` と `config.ts` を更新する。
2. `renderEvidence.ts` を新設して typed outcome を返す。
3. `prototyping.ts` から helper を呼び、`prototyping.json` に書き込む。
4. `prototypingEvidence.ts` を拡張して shape / file existence / coverage を検証する。
5. `renderCritique.ts`、`designFidelity.ts`、`navigationFlow.ts` を追随させる。
6. init README と report guidance を更新する。
7. unit / integration / e2e を順に積み上げる。
8. `qfai validate --fail-on error` で pack と code の整合を確認する。
9. (v1.7.6 remediation) `prototyping.ts` CLI 出力パスで evidence fields を実配線する (DR-0081)。
10. (v1.7.6 remediation) 0 byte 検出、non-UI surface 省略、idempotency を実装し TC-0024-0018..0023 を GREEN にする。
