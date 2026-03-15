---
name: "pr-fix"
description: "PR本文修正、review thread 解消、CI 修復に加え、追加レビュー指摘の遅延到着を検知するため live monitor を完了まで回す skill。GitHub CLI と PowerShell が使える repo で、PR 修正から handoff 生成まで進めるときに使う。merge/tag は `pr-merge` skill で扱う。"
---

# pr-fix

この skill は、PR の本文整形、review thread の確認、CI 修復、late review 指摘を拾うための live monitor、handoff 生成までを扱う。merge/tag は `pr-merge` skill に委譲する。

## まず読むファイル

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ci.yml`
- `package.json`
- `scripts/pr-fix/run-pr-fix.ps1`

## 最初の実行

最初は必ず dry-run で実行する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pr-fix/run-pr-fix.ps1 -PrNumber <PR番号> -DryRun -SleepSeconds 0 -RequiredZeroStreak 1
```

## PR 対象の決め方

- `-PrNumber` を指定した場合は、その PR を対象にする。
- `-PrNumber` を省略した場合は、現在の作業ブランチに紐づく PR を対象にする。
- 現在ブランチの PR 番号は次で解決する。

```powershell
$pr = gh pr view --json number,headRefName,baseRefName,url
```

- 例: 現在ブランチの PR が #169 の場合は、`-PrNumber 169` 相当として扱う。

## 監視の目的と完了条件

- 監視の目的は CI の green を 1 回確認することではなく、追加レビュー指摘の遅延到着を検知すること。
- unresolved 0 / CI green を単発で満たしても完了扱いにしない。
- 修正後は必ず live monitor を実行し、60 秒間隔で 30 回連続 clean poll を満たすまで終了しない。
- `tmp/pr-fix/pr-<PR番号>-handoff.json` が生成されて初めて `pr-fix` 完了とみなす。

## 進め方

1. `git status --short`、`git branch --show-current`、`gh pr view <PR番号> --json number,title,body,baseRefName,headRefName,statusCheckRollup,url` を確認する。
2. dry-run が PR 本文不備を検出したら、preview を確認し、必要なら `-DryRun` を外して本文を補正する。
3. dry-run が unresolved review thread を出したら、thread ごとの指摘を解消する。必要なローカル gate を実行し、commit/push する。
4. script が表示する `gh api` コマンド、または script 内の confirm で reply/resolve を実行する。
5. CI が落ちている場合は、失敗 job を `.github/workflows/ci.yml` と `package.json` の gate に引き当てて修正し、再度 commit/push する。
6. unresolved が 0 件かつ CI が green でも完了にしない。必ず live monitor を起動して late review 指摘の再流入を監視する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pr-fix/run-pr-fix.ps1 -PrNumber <PR番号>
```

- 60 秒間隔で `RequiredZeroStreak` 回連続の clean poll を満たしたら、script は handoff 情報を出して終了する。`handoff.json` が無い状態で `pr-fix` を完了扱いにしない。merge/tag は `pr-merge` skill に引き継ぐ。

## stop 条件

- `gh auth status` が失敗
- PR の base が `main` ではない
- PR 本文を title/body/diff から再構成できない
- CI failure を修正できない
- live monitor 完了前に handoff へ進めようとしている

## 補足

- `-Tag` は後方互換のため残っているが、この skill では無視される。
- `-SleepSeconds` の既定値は `60`、`-RequiredZeroStreak` の既定値は `30`。
- live 監視モード（`-DryRun` なし）では `-SleepSeconds` / `-RequiredZeroStreak` の上書きは不可。必要な調整は dry-run 時のみ行う。
- 監視は late review 指摘の検知が主目的であり、CI green は clean poll 条件の一部にすぎない。
- script は `tmp/pr-fix/` に preview と snapshot を書き出し、完了時は handoff JSON も出力する。これらは review 補助用で、commit 対象ではない。
