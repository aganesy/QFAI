---
name: "pr-fix"
description: "PR本文修正、review thread 解消、CI 修復、green 確認までを行う skill。GitHub CLI と PowerShell が使える repo で、PR 修正とレビュー解消を進めるときに使う。merge/tag は `pr-merge` skill で扱う。"
---

# pr-fix

この skill は、PR 本文整形、review thread の確認、CI 修復、strict live monitor 完走までを扱う。merge/tag は `pr-merge` skill に委譲する。

## Definition of Done

以下をすべて満たしたときだけ、この skill は完了扱いとする。

1. `scripts/pr-fix/run-pr-fix.ps1` を `-DryRun` なしで正規コマンド実行し、終了まで完走している。
2. script 出力で `60` 秒ごとの poll と `30` 回連続の `Clean PR poll X/30` を確認している。
3. `unresolved review thread = 0` かつ `CI green` の状態を `30` 回連続で満たしたことを script が判定している。
4. script が出力する handoff 情報（`tmp/pr-fix/pr-<PR番号>-handoff.json`）を取得している。
5. script が出力する監視状態（`tmp/pr-fix/pr-<PR番号>-monitor-status.json`）を確認している。
6. 最終報告で handoff 情報を明示し、merge/tag は `pr-merge` skill へ引き継ぐとしている。

以下は完了扱いにしない。

- dry-run が通っただけ
- 手動で review thread を resolve しただけ
- 手動で CI green を確認しただけ
- `tmp/pr-fix/pr-<PR番号>-handoff.json` を script から取得していない状態
- `30` 回連続 clean に到達する前に live monitor を止めた状態

## 禁止事項

- script 完走前に「`pr-fix` 完了」と報告しない。
- 手動補完を script 完走の代替として扱わない。
- live monitor 実行時に `-SleepSeconds` / `-RequiredZeroStreak` を上書きしない。
- script が issue を検知して停止したのに、remediation 前提を無視して `pr-merge` へ進めない。

## まず読むファイル

- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ci.yml`
- `package.json`

## 最初の実行

最初は必ず dry-run で実行する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pr-fix/run-pr-fix.ps1 -PrNumber <PR番号> -DryRun -SleepSeconds 0 -RequiredZeroStreak 1
```

## strict live monitor

live 監視の正規コマンドは次のみ。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pr-fix/run-pr-fix.ps1 -PrNumber <PR番号>
```

live monitor では次を固定値として扱う。

- `SleepSeconds = 60`
- `RequiredZeroStreak = 30`

`-SleepSeconds` / `-RequiredZeroStreak` の上書きは dry-run でのみ許可する。live では禁止。

## 進め方

1. `git status --short`、`git branch --show-current`、`gh pr view <PR番号> --json number,title,body,baseRefName,headRefName,statusCheckRollup,url` を確認する。
2. dry-run が PR 本文不備を検出したら、preview を確認し、必要なら本文を補正する。
3. dry-run または live monitor が unresolved review thread を 1 件でも検知したら、その時点で task は未完了として扱う。
4. unresolved review thread がある場合は、thread ごとの指摘を即 remediation する。必要なローカル gate を実行し、commit/push し、thread reply/resolve を行う。
5. CI failure を 1 件でも検知したら、その時点で task は未完了として扱う。失敗 job を `.github/workflows/ci.yml` と `package.json` の gate に引き当てて修正し、再度 commit/push する。
6. issue を remediation して commit/push したら、同じ live monitor コマンドを再実行する。
7. live monitor 中に `pending / in_progress` を見た場合、clean ではない。streak は `0` に戻るが、script は `60` 秒ごとの poll を継続する。
8. `tmp/pr-fix/pr-<PR番号>-monitor-status.json` の `State` を確認し、`handoff_ready` になるまで続ける。
9. `Clean PR poll 30/30` と handoff 出力を確認した時だけ `pr-fix` 完了とする。

## stop 条件

- `gh auth status` が失敗
- PR の base が `main` ではない
- PR 本文を title/body/diff から再構成できない
- CI failure を修正できない
- unresolved review thread を解消できない
- `run-pr-fix.ps1` が runtime error / 偽陽性で strict live monitor を完走できない
- handoff JSON または monitor-status JSON を script が出力できない

## script 不具合時の扱い

- script が完走できない場合、この skill は未完了として扱う。
- 手動で PR を整えても、それは「暫定復旧」であり `pr-fix` 完了ではない。
- 暫定復旧を行った場合は、最終報告で以下を必ず明記する。
  - script がどこで失敗したか
  - 手動で補完した内容
  - handoff 未取得かどうか
  - `pr-merge` に進めるかどうか

## 完了報告で必ず書くこと

- 実行コマンド（dry-run / live monitor）
- `60` 秒 poll / `30` 回連続 clean の達成結果
- handoff JSON のパス
- monitor-status JSON のパス
- 未解決事項の有無

## 補足

- remediation 自体は agent 主導で行う。script は監視ループと完了条件を強制する。
- issue を検知したのに remediation / commit / push できない場合、`pr-fix` は未完了のまま停止する。
- `-Tag` は後方互換のため残っているが、この skill では無視される。
- script は `tmp/pr-fix/` に preview と snapshot を書き出す。これは review 補助用で、commit 対象ではない。
