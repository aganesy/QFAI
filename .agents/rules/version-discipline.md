# Version Discipline (全 AI 共通)

QFAI パッケージのバージョン番号は、AI エージェントが独断で
「どの版を出すか」を決めない。
この規律はリポジトリで作業する全 AI (Claude Code / Codex / GitHub
Copilot / その他) に適用される。

## 上位原則: 版番号の決定権はユーザにある

AI は版番号 (`X.Y.Z`) を自分で選んではいけない。版番号の選択は次の
いずれかの形でユーザが事前に与える:

1. **branch 名に `vX.Y.Z` を pin する** (推奨)
2. branch 名に SemVer を含めず、対話で `X.Y.Z` を明示指示する

(1) は構造的に検出可能で、`check-branch-version-pin.sh` および
`pr-fix` script (`CheckVersionAlignment`) で強制される。pin が存在
する以上、AI はその版でリリース成果物 (package.json#version /
CHANGELOG H2 / `chore(release):` commit) を整える義務を負う。

(2) は構造的に検出できないため、対話ログによる人間レビュー依存となる。

## Master rule: ブランチ名 → version pin

1. **ブランチ名にセマンティックバージョンが含まれる場合 (pinned)**
   - 例: `feature/v1.8.8`, `release/v1.9.0`, `hotfix/v1.10.2-foo`
   - 推奨命名規則: `<type>/v<X.Y.Z>[-<slug>]` (leading `v` 必須)
   - **pin = その版でリリースする旨のユーザ指示**。AI は pin と一致
     する形で `packages/qfai/package.json#version` を維持し、PR を
     merge 可能状態に整える時点で CHANGELOG / `chore(release):`
     commit も pin に合わせて整備する (下記「pinned branch で許可
     される操作」「pinned branch でも禁止」を参照)
   - **pin と異なる版** (bump / down / 任意の書換) を AI が選ぶこと
     は禁止。pin の書換が必要な場合はユーザに確認する
2. **ブランチ名にバージョンが含まれない場合 (unpinned)**
   - 例: `main`, `chore/update-deps`, `feature/refactor-x`
   - `package.json#version` の **編集 (bump / down / 任意の書換) を
     行う前に必ずユーザに確認**
   - CHANGELOG H2 (`## [X.Y.Z]`) の新規追加、`chore(release):`
     commit、tag 系操作も同様にユーザの明示指示なしには行わない
   - このケースは `check-branch-version-pin.sh` では構造的に検出
     できないため (SemVer 抽出時に skip)、実質的に人間レビュー
     依存となる
3. **SemVer 抽出の正規表現** (guard と一致): `(?:^|[/_-])v([0-9]+)\.([0-9]+)\.([0-9]+)(?:$|[/_-])`
   - leading `v` プレフィックスを word boundary 付きで必須とする
   - `feature/api-2024.10.05` / `bugfix/issue-1.2.3-typo` / `fix/log4j-2.17.1`
     のような SemVer ではない数字列は意図的に捕捉しない
   - MAJOR.MINOR.PATCH のみサポート (pre-release / build metadata は対象外)。
     `release/v1.9.0-rc.1` のような pre-release 運用が必要な場合は
     `VERSION_PIN_SKIP=1` の例外で運用する

## pinned branch で AI に許可される操作

ブランチ名に `vX.Y.Z` pin がある場合、AI は次を独断で実行してよい
(pin = ユーザ指示なので、追加の対話確認は不要):

- `packages/qfai/package.json#version` を pin 値に同期
- `CHANGELOG.md` の `## [Unreleased]` を `## [X.Y.Z] - YYYY-MM-DD`
  に rename し、空の `## [Unreleased]` セクションを再挿入
- `chore(release): qfai X.Y.Z` commit を作成して push

実施タイミングの目安:

- 機能 commit が一通り終わり、PR を merge 可能状態に整える段階
  (典型的には `pr-fix` script の `CheckVersionAlignment` で
  exit 1 が出たとき) で実施する
- 機能 commit を打つたびに毎回 release commit を更新する必要は
  ない。`[Unreleased]` 配下に追記し続け、最終的に rename する

## pinned branch でも禁止 (明示指示が必要)

pin があってもユーザの明示指示なしには実行しない:

- pin と異なる版番への変更 (例: `feature/v1.8.8` 上で 1.9.0 へ
  bump する。pin そのものを変更したい場合はユーザに確認)
- `git tag vX.Y.Z` / `git tag qfai@X.Y.Z` 等のリリース系 tag の実行
- `npm publish` / `pnpm publish` 系の実行
- `git commit --amend` によるリリース commit の事後改竄
- `git push --force` / `git push --force-with-lease` (リモートの
  リリース履歴上書き)
- `gh pr merge` / `gh pr merge --auto` 等で AI 自身がリリース PR を
  マージすること
- `npm version <patch|minor|major>` / `pnpm version <patch|minor|major>`
  系のオールインワンコマンド (tag を副作用で打つため)。版同期は
  `package.json` 直接編集で行う

unpinned branch では上記に加えて、`package.json#version` 編集 /
CHANGELOG H2 追加 / `chore(release):` commit も明示指示が必要。

## 機能完成時の正しいフロー

### pinned branch (推奨)

1. `feat(...)` / `fix(...)` / `docs(...)` / `refactor(...)` の機能
   commit を打つ
2. `CHANGELOG.md` の `## [Unreleased]` 配下に変更内容を追記
3. PR を merge 可能状態に整える段階で:
   1. `packages/qfai/package.json#version` を pin 値に同期
   2. `CHANGELOG.md` の `## [Unreleased]` を
      `## [X.Y.Z] - YYYY-MM-DD` に rename
   3. 空の `## [Unreleased]` セクションを再挿入
   4. `chore(release): qfai X.Y.Z` で commit / push

### unpinned branch

1. 機能 commit + `## [Unreleased]` 追記までは pinned と同じ
2. リリース commit はユーザの明示指示を待つ — 自分から打たない

## 自動ガード

- `packages/qfai/scripts/check-branch-version-pin.sh`
  - 現ブランチ名から SemVer を抽出 (見つからなければ pass)
  - `packages/qfai/package.json#version` と一致しなければ exit 1
  - CI の lint job から呼び出され、pin 不一致 PR を構造的にブロック
- `.agents/skills/pr-fix/scripts/run-pr-fix.ps1`
  (`CheckVersionAlignment`)
  - pinned branch で `package.json#version` および CHANGELOG H2
    (`## [X.Y.Z]` または `## [X.Y.Z] - YYYY-MM-DD`) の存在を要求
  - 不整合があれば throw して dry-run / live monitor を停止

緊急時は `VERSION_PIN_SKIP=1` で前者を無効化可能 (ユーザ承認済みの
coordinated release で、ブランチ名と version を一時的に乖離させる
ケース用)。

## 過去事例

- 2026-05-02: `feature/v1.8.8` 上で AI (Claude Code) が **pin と
  異なる** 1.9.0 → 1.9.1 をリリース commit に格上げ。違反点は「AI が
  版番号 (pin と異なる値) を独断で選んだ」こと。履歴を
  `git reset --hard` で巻き戻した上で、本ルールと自動ガードを追加
  した。pin 値そのものでリリース成果物を整備する行為は、本事例
  以降「ユーザが pin を切った時点で承認済み」として扱う。

## 関連

- 配布物の version marker leak は別ルール:
  `.agents/rules/distributed-surface.md`。
