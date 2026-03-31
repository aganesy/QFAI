# 02 User Stories

## US Catalog

- US-0024-0001: CLI から render evidence capture を起動できる
- US-0024-0002: `uiFidelity.screens[].renders[]` に normalized render bundle を保持できる
- US-0024-0003: renderer 不在時も degraded mode で継続できる
- US-0024-0004: `qualityProfile` に応じて render evidence 欠落の severity を調整できる
- US-0024-0005: legacy critique workflow を壊さずに render evidence を opportunistic に使う
- US-0024-0006: prototyping 実行時に real render evidence が CLI 出力に到達する (v1.7.6 remediation)
- US-0024-0007: actual capture status が placeholder を置換する (v1.7.11 completion)

## US-0024-0001: CLI から render evidence capture を起動できる

- Parent: CAP-0024
- Source: discussion-20260325144633348, REQ-0024-0001, REQ-0024-0002, REQ-0024-0003
- Goal: QFAI 利用者として、`qfai prototyping` に render evidence 用 option を追加したい。既存 command のまま rendered output の証跡収集を有効化できるようにするため。
- Non-goals: 新しい top-level command の追加
- Notes: `--render-evidence`, `--viewports`, `--render-out`, `--base-url` を受け付け、CLI flag は config を override する

### Example Seeds

| Perspective         | Example                                                                                    | Status |
| ------------------- | ------------------------------------------------------------------------------------------ | ------ |
| Happy path          | `--autogen-ui-fidelity --render-evidence --viewports desktop,mobile` で asset が保存される | seed   |
| Negative path       | `--render-evidence` 指定だが `--autogen-ui-fidelity` 無効で skipped reason が残る          | seed   |
| Edge / boundary     | `--viewports desktop` の単一指定でも viewport metadata が保持される                        | seed   |
| Permission / role   | CI 環境で browser 未導入でも command 全体は継続する                                        | seed   |
| State transition    | route ごとに captured / failed が混在しても screen は保持される                            | seed   |
| Idempotency / retry | 同一 command 再実行で deterministic な asset naming を維持する                             | seed   |

## US-0024-0002: normalized render bundle を保持できる

- Parent: CAP-0024
- Source: discussion-20260325144633348, REQ-0024-0004, REQ-0024-0005
- Goal: validator / report maintainer として、viewport 単位の evidence state を型付きで保持したい。JSON を一次ソースとして欠落・失敗・成功を判定できるようにするため。
- Non-goals: 画像や HTML 本文の inline 保持
- Notes: render entry は `viewport`, `status`, `width`, `height` を持ち、`captured` は `imagePath` と `htmlPath` を必須にする

### Example Seeds

| Perspective         | Example                                                | Status |
| ------------------- | ------------------------------------------------------ | ------ |
| Happy path          | `/orders` の desktop/mobile が captured で path を持つ | seed   |
| Negative path       | captured だが `htmlPath` 欠落で validator error        | seed   |
| Edge / boundary     | `custom` viewport でも正整数 size なら許可             | seed   |
| Permission / role   | docs consumer が JSON path だけで asset を辿れる       | seed   |
| State transition    | skipped から captured に再実行で更新される             | seed   |
| Idempotency / retry | same route rerun でも state の意味が変わらない         | seed   |

## US-0024-0003: renderer 不在時も degraded mode で継続できる

- Parent: CAP-0024
- Source: discussion-20260325144633348, REQ-0024-0006, REQ-0024-0010
- Goal: Playwright を常備できない利用者として、capture 不可でも autogen と validation の主フローを止めたくない。degraded state を把握しつつ導入障壁を上げないため。
- Non-goals: capture failure の silent ignore
- Notes: Playwright 未導入・launch failure・baseUrl unreachable を reason で区別する

### Example Seeds

| Perspective         | Example                                                     | Status |
| ------------------- | ----------------------------------------------------------- | ------ |
| Happy path          | failOpen 環境で skipped reason を記録して JSON 生成まで継続 | seed   |
| Negative path       | reason 欠落で validator error                               | seed   |
| Edge / boundary     | 一部 viewport だけ failed でも他 viewport は captured       | seed   |
| Permission / role   | CI は skipped、ローカルは captured の差分を許容             | seed   |
| State transition    | skipped after install Playwright で captured に移る         | seed   |
| Idempotency / retry | baseUrl 起動後の再実行で skipped が解消される               | seed   |

## US-0024-0004: qualityProfile に応じて render evidence 欠落の severity を調整できる

- Parent: CAP-0024
- Source: discussion-20260325144633348, REQ-0024-0007, REQ-0024-0009
- Goal: quality gate maintainer として、default/high/strict で evidence 欠落の重さを変えたい。first release では導入を促しつつ strict 環境では hard gate にできるようにするため。
- Non-goals: skeleton mode での render requirement 強制
- Notes: shape invalid と captured file missing は全 profile で error

### Example Seeds

| Perspective         | Example                                       | Status |
| ------------------- | --------------------------------------------- | ------ |
| Happy path          | default profile で missing renders が warning | seed   |
| Negative path       | strict profile で all skipped が error        | seed   |
| Edge / boundary     | high profile で mobile 欠落のみ error         | seed   |
| Permission / role   | team policy で strict を採用する              | seed   |
| State transition    | same evidence を profile 変更で再評価する     | seed   |
| Idempotency / retry | rerun without changes keeps same severity     | seed   |

## US-0024-0005: legacy critique workflow を壊さずに render evidence を opportunistic に使う

- Parent: CAP-0024
- Source: discussion-20260325144633348, REQ-0024-0008, REQ-0024-0009, REQ-0024-0011
- Goal: 既存利用者として、markdown critique 中心の project が v1.7.1 で突然壊れないでほしい。新モデルへ段階的に移行できるようにするため。
- Non-goals: critique markdown の必須化
- Notes: `renderCritique.ts` は `renders[]` があれば viewport existence の一次ソースとして扱う

### Example Seeds

| Perspective         | Example                                                     | Status |
| ------------------- | ----------------------------------------------------------- | ------ |
| Happy path          | markdown-only project が従来どおり validate される          | seed   |
| Negative path       | responsive score があるのに evidence 無しで warning         | seed   |
| Edge / boundary     | render evidence あり、markdown critique 無しで warning のみ | seed   |
| Permission / role   | docs-only consumer は markdown summary を参照できる         | seed   |
| State transition    | legacy project が render-evidence enabled に移行            | seed   |
| Idempotency / retry | evidence 追加で false positive が解消される                 | seed   |

## US-0024-0006: prototyping 実行時に real render evidence が CLI 出力に到達する

- Parent: CAP-0024
- Source: v1.7.6 remediation, REQ-0024-0008, DR-0081
- Goal: QFAI 利用者として、prototyping 実行中に render evidence の実データ（screenshot hash、タイムスタンプ、ファイルパス）が CLI 出力に反映されるようにしたい。内部実装が placeholder のままでは CLI の公開動作として不誠実であるため、実配線を完了させる。
- Non-goals: visual diff / browser QA full audit、render evidence のリッチ UI 表示
- Notes: DR-0081 で "wire to CLI" を採用済み。`renderCritique.ts` の一次ソース接続を `prototyping.ts` の CLI フローに貫通させる。render target unreachable の場合は explicit "no evidence captured" エラーを返す。

### Example Seeds

| Perspective         | Example                                                                                                    | Status |
| ------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| Happy path          | prototyping 完了; CLI が screenshot hash、タイムスタンプ、file path を含む real render evidence を出力する | seed   |
| Negative path       | render target 到達不可; CLI が "no evidence captured" を明示したエラーを出力する（stub 不可）              | seed   |
| Edge / boundary     | render 完了だが output が 0 bytes; evidence が empty としてフラグされ warning が記録される                 | seed   |
| Permission / role   | 非 UI surface; render evidence セクションが出力から省略される（placeholder なし）                          | seed   |
| State transition    | evidence が "pending" から "captured" にアトミックに遷移; 中間 placeholder が残らない                      | seed   |
| Idempotency / retry | 未変更ソースで prototype を再実行; 同じ content hash の evidence が生成される                              | seed   |

## US-0024-0007: actual capture status が placeholder を置換する (v1.7.11 completion)

- Parent: CAP-0024
- Source: REQ-0013, REQ-0014, REQ-0015, DR-0103
- Goal: QFAI 利用者として、render evidence の status が captured/skipped/failed の 3 値のみで表現されるようにしたい。"requested" status が存在すると実際の capture 結果を反映しておらず不誠実であるため、actual capture status model に置換する。
- Non-goals: 新しい status 値の追加、capture tooling の変更
- Notes: DR-0103 で "requested" を廃止し captured/skipped/failed の 3 状態モデルを採用済み。"captured" は必ず execution evidence（screenshot hash / timestamp / file path）を伴わなければならない。

### Example Seeds

| Perspective         | Example                                                                                   | Status |
| ------------------- | ----------------------------------------------------------------------------------------- | ------ |
| Happy path          | render evidence status が captured/skipped/failed のいずれかで、execution evidence を伴う | seed   |
| Negative path       | evidence に "requested" status が含まれる場合 → validation FAIL                           | seed   |
| Edge / boundary     | captured status だが execution evidence (hash/timestamp/path) が欠落 → validation FAIL    | seed   |
| Permission / role   | CI 環境で capture 不可の場合は skipped (not "requested") で記録                           | seed   |
| State transition    | 旧 "requested" status → 新 3 値モデルへの migration で "requested" が残らない             | seed   |
| Idempotency / retry | 同一条件での再実行で status vocabulary が captured/skipped/failed に閉じる                | seed   |
