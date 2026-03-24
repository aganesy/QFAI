# 06 Test Cases

10 items.

| TC-ID        | Title                                      | Level       | EX-Ref       | AC-Refs                    |
| ------------ | ------------------------------------------ | ----------- | ------------ | -------------------------- |
| TC-0021-0001 | デスクトップ批評の実施確認                 | integration | EX-0021-0001 | AC-0021-0001               |
| TC-0021-0002 | モバイル批評の実施確認                     | integration | EX-0021-0001 | AC-0021-0002               |
| TC-0021-0003 | コードオンリーレビュー拒否                 | unit        | EX-0021-0003 | AC-0021-0003               |
| TC-0021-0004 | 下流読取順序の検証                         | integration | EX-0021-0002 | AC-0021-0004               |
| TC-0021-0005 | DDP 未定義時の処理停止                     | unit        | EX-0021-0004 | AC-0021-0005               |
| TC-0021-0006 | 批評エビデンスの記録内容検証               | integration | EX-0021-0005 | AC-0021-0006               |
| TC-0021-0007 | エビデンスの再現可能性検証                 | integration | EX-0021-0005 | AC-0021-0007               |
| TC-0021-0008 | 反復改善ループの完了条件検証               | integration | EX-0021-0006 | AC-0021-0008               |
| TC-0021-0009 | taskFidelity 全項目 PASS の正常検証        | integration | EX-0021-0008 | AC-0021-0009, AC-0021-0010 |
| TC-0021-0010 | taskFidelity step count 超過の REVISE 検証 | unit        | EX-0021-0009 | AC-0021-0009, AC-0021-0010 |

## TC-0021-0001: デスクトップ批評の実施確認

**Level:** integration
**EX Refs:** EX-0021-0001
**AC Refs:** AC-0021-0001

Setup: 初回レンダリング済みプロトタイプを用意する。
Action: クリティークループを実行し、デスクトップビューポート（≥1024px）での批評を確認する。
Verify:

- デスクトップ批評が実施されている
- layout / hierarchy / CTA visibility の評価が含まれている

## TC-0021-0002: モバイル批評の実施確認

**Level:** integration
**EX Refs:** EX-0021-0001
**AC Refs:** AC-0021-0002

Setup: 初回レンダリング済みプロトタイプを用意する。
Action: クリティークループを実行し、モバイルビューポート（≤480px）での批評を確認する。
Verify:

- モバイル批評が実施されている
- タッチターゲットサイズ / スクロール導線 / 折り返しレイアウトの評価が含まれている

## TC-0021-0003: コードオンリーレビュー拒否

**Level:** unit
**EX Refs:** EX-0021-0003
**AC Refs:** AC-0021-0003

Setup: レンダリング結果を含まないコード差分のみの提出物を用意する。
Action: クリティークループのゲートチェックを実行する。
Verify:

- レビューが拒否される
- 「レンダリング結果を添付してください」のメッセージが返される

## TC-0021-0004: 下流読取順序の検証

**Level:** integration
**EX Refs:** EX-0021-0002
**AC Refs:** AC-0021-0004

Setup: DDP、Design Token、UI Contract、HTML Mock、Flow/Navigation が揃った artifact を用意する。
Action: 下流スキルの入力読み取り順序を確認する。
Verify:

- DDP → Design Token → UI Contract → HTML Mock → Flow/Navigation の順序で読み取られている

## TC-0021-0005: DDP 未定義時の処理停止

**Level:** unit
**EX Refs:** EX-0021-0004
**AC Refs:** AC-0021-0005

Setup: DDP が未定義の artifact を用意する（UI Contract と HTML Mock は存在する）。
Action: 下流スキルで処理を開始しようとする。
Verify:

- 処理が停止する
- 「DDP が未定義です」のエラーメッセージが返される

## TC-0021-0006: 批評エビデンスの記録内容検証

**Level:** integration
**EX Refs:** EX-0021-0005
**AC Refs:** AC-0021-0006

Setup: クリティークループを完了させる。
Action: 記録されたエビデンスの内容を確認する。
Verify:

- 批評日時が記録されている
- 対象ビューポート（desktop / mobile）が記録されている
- 判定結果（PASS / REVISE）が記録されている
- 指摘事項リストが記録されている

## TC-0021-0007: エビデンスの再現可能性検証

**Level:** integration
**EX Refs:** EX-0021-0005
**AC Refs:** AC-0021-0007

Setup: 同一 artifact と同一 rubric を用意する。
Action: クリティークを 2 回実行し、エビデンスを比較する。
Verify:

- 判定基準と評価項目が一致している
- 結果の再現性が確認できる

## TC-0021-0008: 反復改善ループの完了条件検証

**Level:** integration
**EX Refs:** EX-0021-0006
**AC Refs:** AC-0021-0008

Setup: 初回批評で REVISE 判定を含むプロトタイプを用意する。
Action: 指摘事項を修正し、再度クリティークループを実行する。
Verify:

- 全指摘事項が解決（PASS）になるまでループが継続する
- 最終 PASS 時のエビデンスが記録される
- 両ビューポート（desktop + mobile）が PASS であること

## TC-0021-0009: taskFidelity 全項目 PASS の正常検証

**Level:** integration
**EX Refs:** EX-0021-0008
**AC Refs:** AC-0021-0009, AC-0021-0010

Setup: max_primary_steps = 5 を持つ DDP と、step count 3 の primary flow を実装したプロトタイプを用意する。4 状態（empty / loading / error / success）をすべて実装し、primary CTA を viewport 内に表示する。
Action: クリティークループ内で taskFidelity 評価を実行する。
Verify:

- step count（3）が max_primary_steps（5）以下と判定される
- primary CTA が可視と判定される
- 4 状態すべてが実装済みと確認される
- taskFidelity 判定が PASS となる
- エビデンスに taskFidelity 評価結果が記録される

## TC-0021-0010: taskFidelity step count 超過の REVISE 検証

**Level:** unit
**EX Refs:** EX-0021-0009
**AC Refs:** AC-0021-0009, AC-0021-0010

Setup: max_primary_steps = 5 を持つ DDP と、step count 8 の primary flow を実装したプロトタイプを用意する。また loading state を意図的に未実装とする。
Action: クリティークループ内で taskFidelity 評価を実行する。
Verify:

- step count（8）> max_primary_steps（5）の超過が検出される
- loading state の未実装が検出される
- クリティーク結果が REVISE と判定される
- 指摘事項として「step count 超過」と「loading state 未実装」が記録される
- エビデンスに taskFidelity 評価結果（未達項目）が含まれる
