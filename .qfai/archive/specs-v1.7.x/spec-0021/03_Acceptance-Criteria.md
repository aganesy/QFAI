# 03 Acceptance Criteria

10 items.

## AC-0021-0001: デスクトップビューポート批評の実施

**US Ref:** US-0021-0001

```gherkin
Given プロトタイプの初回レンダリングが完了している
When クリティークループを実行する
Then デスクトップビューポート（≥1024px）での批評が実施される
And 批評結果に layout / hierarchy / CTA visibility の評価が含まれる
```

## AC-0021-0002: モバイルビューポート批評の実施

**US Ref:** US-0021-0001

```gherkin
Given プロトタイプの初回レンダリングが完了している
When クリティークループを実行する
Then モバイルビューポート（≤480px）での批評が実施される
And 批評結果にタッチターゲットサイズ / スクロール導線 / 折り返しレイアウトの評価が含まれる
```

## AC-0021-0003: コードオンリーレビューの拒否

**US Ref:** US-0021-0001

```gherkin
Given レビュー対象がコード差分のみで提出された
When クリティークループのゲートチェックを実行する
Then レンダリング結果が添付されていないためレビューが拒否される
And 「レンダリング結果を添付してください」のメッセージが返される
```

## AC-0021-0004: 下流読取順序の検証

**US Ref:** US-0021-0002

```gherkin
Given 下流スキルが UI-bearing artifact を処理する
When 入力ファイルの読み取り順序を確認する
Then DDP → Design Token → UI Contract → HTML Mock → Flow/Navigation の順序で読み取られている
```

## AC-0021-0005: DDP 未定義時の処理停止

**US Ref:** US-0021-0002

```gherkin
Given DDP（Design Direction Pack）が未定義の artifact
When 下流スキルが処理を開始しようとする
Then 処理が停止し「DDP が未定義です。先に Design Direction Pack を定義してください」のエラーが返される
```

## AC-0021-0006: 批評結果のエビデンス記録

**US Ref:** US-0021-0003

```gherkin
Given クリティークループが完了した
When 批評結果を確認する
Then 批評日時、対象ビューポート、判定結果（PASS/REVISE）、指摘事項がエビデンスとして記録されている
```

## AC-0021-0007: エビデンスの再現可能性

**US Ref:** US-0021-0003

```gherkin
Given 同一 artifact に対して同一 rubric でクリティークを再実行した
When 前回のエビデンスと比較する
Then 判定基準と評価項目が一致し、結果の再現性が確認できる
```

## AC-0021-0008: 反復改善ループの完了条件

**US Ref:** US-0021-0001

```gherkin
Given デスクトップ・モバイル両批評で指摘事項がある
When 修正を行い再度クリティークループを実行する
Then 全指摘事項が解決（PASS）になるまでループが継続する
And 最終 PASS 時のエビデンスが記録される
```

## AC-0021-0009: taskFidelity 評価項目のクリティーク実施

**US Ref:** US-0021-0004

```gherkin
Given レンダリング済み UI のクリティークループを実行する
When taskFidelity 評価を行う
Then primary task の step count が max_primary_steps 以下であることが検証される
And primary CTA の可視性（画面上での視認性）が評価される
And empty state・loading state・error state・success state の 4 状態実装が確認される
And primary flow の click count が計測される
```

## AC-0021-0010: taskFidelity 未達時の REVISE 判定

**US Ref:** US-0021-0004

```gherkin
Given taskFidelity 評価を実行した
When primary task step count が max_primary_steps を超過している、または primary CTA が視認不能である
Then クリティーク結果が REVISE と判定される
And taskFidelity の未達項目が指摘事項として記録される
And エビデンスに taskFidelity 評価結果が含まれる
```
