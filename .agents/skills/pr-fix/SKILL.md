---
name: "pr-fix"
description: "PR本文修正、review thread 解消、CI 修復、green 確認までを行う skill。GitHub CLI と PowerShell が使える repo で、PR 修正とレビュー解消を進めるときに使う。merge/tag は別 skill で扱う。"
---

# pr-fix

この skill は、PR の本文整形、review thread の確認、CI 修復、green 確認までを扱う。merge/tag は別 skill に委譲する。

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
6. unresolved が 0 件かつ CI が green になったら、必要に応じて監視モードで実行する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pr-fix/run-pr-fix.ps1 -PrNumber <PR番号>
```

1. `RequiredZeroStreak` 回連続で unresolved 0 / CI green を満たしたら、script は handoff 情報を出して終了する。merge/tag は別 skill に引き継ぐ。

## stop 条件

- `gh auth status` が失敗
- PR の base が `main` ではない
- PR 本文を title/body/diff から再構成できない
- CI failure を修正できない

## 補足

- `-Tag` は後方互換のため残っているが、この skill では無視される。
- `-SleepSeconds` の既定値は `60`、`-RequiredZeroStreak` の既定値は `30`。
- script は `tmp/pr-fix/` に preview と snapshot を書き出す。これは review 補助用で、commit 対象ではない。
