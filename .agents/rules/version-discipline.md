# Version Discipline (全 AI 共通)

QFAI パッケージの版番号 (`X.Y.Z`) は AI が選ばない。ユーザが決める。
このルールはリポジトリで作業する全 AI (Claude Code / Codex / GitHub Copilot / その他) に適用する。

## 版番号の決め方

ユーザは次のどちらかで版番号を事前に与える。

| 方法                                          | 検出                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| ブランチ名に `vX.Y.Z` を pin する (推奨)      | `check-branch-version-pin.sh` と `pr-fix` の `CheckVersionAlignment` が機械的に検査する |
| ブランチ名に含めず、対話で `X.Y.Z` を指示する | 機械的に検出できない。人間レビューに依る                                                |

pin はその版でリリースする指示にあたる。
pin があれば、AI はその版でリリース成果物 (`package.json#version` / CHANGELOG の版見出し / `chore(release):` commit) を整える。

## ブランチ名と pin

### pinned branch

- 例: `feature/v1.8.8`, `release/v1.9.0`, `hotfix/v1.10.2-foo`
- 推奨形式: `<type>/v<X.Y.Z>[-<slug>]`。先頭の `v` は必須
- `packages/qfai/package.json#version` を pin と一致させる
- PR を merge 可能な状態に整える段階で、CHANGELOG と `chore(release):` commit も pin に合わせる
- pin と異なる版番号への変更 (上げる・下げる・書き換える) は禁止。pin 自体を変えたいときはユーザに確認する

### unpinned branch

- 例: `main`, `chore/update-deps`, `feature/refactor-x`
- `package.json#version` の編集、CHANGELOG の版見出し (`## [X.Y.Z]`) の追加、`chore(release):` commit、tag 操作のいずれも、ユーザの明示指示なしに行わない
- ガードは SemVer の無いブランチを検査しない。人間レビューに依る

### SemVer の抽出

ガードと同じ正規表現: `(?:^|[/_-])v([0-9]+)\.([0-9]+)\.([0-9]+)(?:$|[/_-])`

- 先頭の `v` を、区切り文字に挟まれた形で必須とする
- `feature/api-2024.10.05` / `bugfix/issue-1.2.3-typo` / `fix/log4j-2.17.1` のような SemVer でない数字列は捕捉しない
- MAJOR.MINOR.PATCH のみ。`release/v1.9.0-rc.1` のような pre-release は `VERSION_PIN_SKIP=1` で運用する

## pinned branch で AI が行ってよい操作

pin はユーザの指示なので、追加の確認なしに実行してよい。

1. `packages/qfai/package.json#version` を pin 値に同期する
2. `CHANGELOG.md` の `## [Unreleased]` を `## [X.Y.Z] - YYYY-MM-DD` に改名し、空の `## [Unreleased]` を再挿入する
3. `chore(release): qfai X.Y.Z` として commit し push する

実施するのは、機能 commit が揃い、PR を merge 可能な状態に整える段階 (典型的には `CheckVersionAlignment` が失敗したとき)。
機能 commit のたびに release commit を更新する必要はない。`[Unreleased]` に追記を続け、最後に改名する。

## 明示指示が必要な操作

pin があっても、ユーザの明示指示なしには行わない。

- pin と異なる版番号への変更
- `git tag vX.Y.Z` / `git tag qfai@X.Y.Z` などリリース tag の作成
- `npm publish` / `pnpm publish`
- `git commit --amend` によるリリース commit の書き換え
- `git push --force` / `git push --force-with-lease`
- `gh pr merge` などで AI 自身がリリース PR を merge すること
- `npm version` / `pnpm version` (tag を副作用で打つ)。版の同期は `package.json` の直接編集で行う

unpinned branch では、これに加えて `package.json#version` の編集 / CHANGELOG の版見出し追加 / `chore(release):` commit も明示指示が必要。

## 機能完成時の流れ

1. `feat` / `fix` / `docs` / `refactor` の機能 commit を打つ
2. `CHANGELOG.md` の `## [Unreleased]` に変更内容を追記する
3. pinned branch なら、PR を merge 可能な状態に整える段階で上記 3 操作を行う。unpinned branch ならユーザの明示指示を待つ

## 自動ガード

| ガード                                                                    | 内容                                                                                                                                         |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/qfai/scripts/check-branch-version-pin.sh`                       | ブランチ名から SemVer を抽出し (無ければ pass)、`packages/qfai/package.json#version` と一致しなければ exit 1。CI の lint job が実行する      |
| `.agents/skills/pr-fix/scripts/run-pr-fix.ps1` の `CheckVersionAlignment` | pinned branch で `package.json#version` と CHANGELOG の版見出し (`## [X.Y.Z]` または `## [X.Y.Z] - YYYY-MM-DD`) を要求し、不整合なら停止する |

ユーザ承認済みの coordinated release でブランチ名と version を一時的に乖離させる場合は、`VERSION_PIN_SKIP=1` で前者を無効化できる。

## 関連

- 配布物への version marker 混入は別ルール: `.agents/rules/distributed-surface.md`
