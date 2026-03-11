---
name: "pr-fix"
description: "PR本文修正、review thread 解消、CI 修復、green 確認までを行う skill。GitHub CLI と PowerShell が使える repo で、PR 修正とレビュー解消を進めるときに使う。merge/tag は `pr-merge` skill で扱う。"
---

# pr-fix

この skill は、PR の本文整形、review thread の確認、CI 修復、green 確認までを扱う。merge/tag は `pr-merge` skill に委譲する。

## Definition of Done

以下をすべて満たしたときだけ、この skill は完了扱いとする。

1. `scripts/pr-fix/run-pr-fix.ps1` を `-DryRun` なしで実行し、終了まで完走している。
2. `RequiredZeroStreak` 回連続で `unresolved review thread = 0` かつ `CI green` を script 出力で確認している。
3. script が出力する handoff 情報（`tmp/pr-fix/pr-<PR番号>-handoff.json`）を取得している。
4. 最終報告で handoff 情報を明示し、merge/tag は `pr-merge` skill へ引き継ぐとしている。

以下は完了扱いにしない。

- dry-run が通っただけ
- 手動で review thread を resolve しただけ
- 手動で CI green を確認しただけ
- handoff JSON を script から取得していない状態

## 禁止事項

- script 完走前に「`pr-fix` 完了」と報告しない。
- 手動補完を script 完走の代替として扱わない。
- script が壊れているのに、その事実を伏せて `pr-merge` へ進めない。

## まず読むファイル

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ci.yml`
- `package.json`

## 最初の実行

最初は必ず dry-run で実行する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pr-fix/run-pr-fix.ps1 -PrNumber <PR番号> -DryRun -SleepSeconds 0 -RequiredZeroStreak 1
```

## 進め方

1. `git status --short`、`git branch --show-current`、`gh pr view <PR番号> --json number,title,body,baseRefName,headRefName,statusCheckRollup,url` を確認する。
2. dry-run が PR 本文不備を検出したら、preview を確認し、必要なら `-DryRun` を外して本文を補正する。
3. dry-run が unresolved review thread を出したら、thread ごとの指摘を解消する。必要なローカル gate を実行し、commit/push する。
4. script が表示する `gh api` コマンド、または script 内の confirm で reply/resolve を実行する。
5. CI が落ちている場合は、失敗 job を `.github/workflows/ci.yml` と `package.json` の gate に引き当てて修正し、再度 commit/push する。
6. unresolved が 0 件かつ CI が green になったら、`-DryRun` なしの監視モードで実行する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pr-fix/run-pr-fix.ps1 -PrNumber <PR番号>
```

1. `RequiredZeroStreak` 回連続で unresolved 0 / CI green を満たしたら、script が handoff 情報を出して終了することを確認する。
2. `tmp/pr-fix/pr-<PR番号>-handoff.json` の内容を確認し、merge/tag は `pr-merge` skill に引き継ぐ。

## stop 条件

- `gh auth status` が失敗
- PR の base が `main` ではない
- PR 本文を title/body/diff から再構成できない
- CI failure を修正できない
- `run-pr-fix.ps1` が runtime error / 偽陽性 / reply/resolve 不全で完走できない
- handoff JSON を script が出力できない

## script 不具合時の扱い

- script が完走できない場合、この skill は未完了として扱う。
- 手動で PR を整えても、それは「暫定復旧」であり `pr-fix` 完了ではない。
- 暫定復旧を行った場合は、最終報告で以下を必ず明記する。
  - script がどこで失敗したか
  - 手動で補完した内容
  - handoff 未取得であること
  - `pr-merge` に進めないこと

## 完了報告で必ず書くこと

- 実行コマンド（dry-run / 監視モード）
- `RequiredZeroStreak` の達成結果
- handoff JSON のパス
- 未解決事項の有無

## 補足

- `-Tag` は後方互換のため残っているが、この skill では無視される。
- `-SleepSeconds` の既定値は `60`、`-RequiredZeroStreak` の既定値は `30`。
- script は `tmp/pr-fix/` に preview と snapshot を書き出す。これは review 補助用で、commit 対象ではない。
