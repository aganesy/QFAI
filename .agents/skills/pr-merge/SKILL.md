---
name: "pr-merge"
description: "PR の最終確認、merge 実行、必要なら tag 作成/push を行う skill。`pr-fix` handoff 後に、GitHub CLI と PowerShell が使える repo で、タグ有無をユーザー確認して main へ merge するときに使う。"
---

# pr-merge

この skill は `pr-fix` handoff 後の merge/tag を扱う。タグ方針は実行前に必ずユーザー確認し、SemVer release tag を選ぶ場合は `packages/qfai/package.json` と `CHANGELOG.md` の整合を確認する。

## まず読むファイル

- `tmp/pr-fix/pr-<PR番号>-handoff.json`（あれば）
- `RELEASE.md`
- `CHANGELOG.md`
- `packages/qfai/package.json`

## 最初の実行

最初は必ず dry-run で実行する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pr-merge/run-pr-merge.ps1 -PrNumber <PR番号> -DryRun
```

dry-run は `tmp/pr-merge/pr-<PR番号>-merge-plan.json` を生成し、`SuggestedReleaseTag` と `SuggestedAlternativeTag` を出力する。

## ユーザー確認

1. dry-run の提案値を読み取り、`AskUserQuestion` が使える実装ではそれを使ってタグ方針を確認する。
2. 質問は 1 問に絞り、選択肢は次の 3 つにする。
   - `<SuggestedReleaseTag> (Recommended)`:
     既存 tag を避けた次パッチ候補。SemVer release tag として使う場合だけ選ぶ。`packages/qfai/package.json` と `CHANGELOG.md` が一致していないなら停止して先に整合を取る。
   - `<SuggestedAlternativeTag>`:
     非 SemVer の追跡用 tag。release version を進めずに識別用 tag を残したい場合に使う。
   - `タグなし`:
     merge のみ実行し、tag は作らない。
3. `AskUserQuestion` が `Other` / 自由記述を提供する実装なら、それで任意 tag を受ける。
4. `AskUserQuestion` が使えない実装では、同じ 3 択と自由記述許可を通常メッセージで確認する。

## 実行

1. `タグなし` を選んだら、次を実行する。

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pr-merge/run-pr-merge.ps1 -PrNumber <PR番号> -NoTag
   ```

2. tag を選んだら、次を実行する。

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pr-merge/run-pr-merge.ps1 -PrNumber <PR番号> -Tag <tag>
   ```

3. merge method を明示指定された場合だけ `-MergeMethod merge|squash|rebase` を付ける。指定が無ければ `merge` を使う。
4. 成功したら `tmp/pr-merge/pr-<PR番号>-merge-result.json` を確認し、結果を報告する。

## stop 条件

- `gh auth status` が失敗
- worktree が dirty
- PR の base が `main` ではない
- PR が draft / closed / merged
- unresolved review thread が残っている
- CI check が green ではない
- 指定 tag が既存
- SemVer tag を選んだが `packages/qfai/package.json` / `CHANGELOG.md` と整合しない

## 補足

- `pr-fix` handoff がなくても live の PR 状態から実行できるが、可能なら handoff JSON を優先して読む。
- custom tag は `Other` / 自由記述で受けた値をそのまま `-Tag` に渡す。
- tag 不要を選べるようにすることが必須で、tag を前提に進めない。
