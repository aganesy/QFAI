# Version Discipline (全 AI 共通)

QFAI パッケージのバージョン番号は、AI エージェントが独断で進めない。
この規律はリポジトリで作業する全 AI (Claude Code / Codex / GitHub
Copilot / その他) に適用される。

## Master rule: ブランチ名 → version pin

1. **ブランチ名にセマンティックバージョンが含まれる場合**
   - 例: `feature/v1.8.8`, `release/v1.9.0`, `hotfix/v1.10.2-foo`
   - 推奨命名規則: `<type>/v<X.Y.Z>[-<slug>]` (leading `v` 必須)
   - `packages/qfai/package.json#version` はその値で固定する
   - bump は禁止 (ユーザが明示的に「version を上げて」と指示した場合のみ可)
2. **ブランチ名にバージョンが含まれない場合**
   - 例: `main`, `chore/update-deps`, `feature/refactor-x`
   - `package.json#version` の **編集 (bump / down / 任意の書換) を行う前に
     必ずユーザに確認**。ルール 1 と対称で、確認は bump に限らず一切の編集を
     対象とする
   - このケースは `check-branch-version-pin.sh` では構造的に検出できないため
     (SemVer 抽出時に skip)、実質的に人間レビュー依存となる
3. **SemVer 抽出の正規表現** (guard と一致): `(?:^|[/_-])v([0-9]+)\.([0-9]+)\.([0-9]+)(?:$|[/_-])`
   - leading `v` プレフィックスを word boundary 付きで必須とする
   - `feature/api-2024.10.05` / `bugfix/issue-1.2.3-typo` / `fix/log4j-2.17.1`
     のような SemVer ではない数字列は意図的に捕捉しない
   - MAJOR.MINOR.PATCH のみサポート (pre-release / build metadata は対象外)。
     `release/v1.9.0-rc.1` のような pre-release 運用が必要な場合は
     `VERSION_PIN_SKIP=1` の例外で運用する

## 禁止アクション (ユーザの明示承認なしに実施しない)

**上位原則**: AI はリリース成果物 (version, tag, CHANGELOG H2 見出し,
publish, force push, amend, merge) を単独で生成してはならない。CI ガード
で構造的に防げるのは branch-name と `package.json#version` の pin 一致
のみなので、以下の具体例は規範として広く読むこと。

具体的には次のいずれも独断で行わない:

- `packages/qfai/package.json#version` フィールドの編集
- `npm version <patch|minor|major>` / `pnpm version <patch|minor|major>` 系
  コマンドの実行 (`package.json#version` を副作用で書換 + tag + commit を
  まとめて実行する)
- commit message に `chore(release):` プレフィックスを含めること
- `git commit --amend` によるリリース commit の事後改竄
- `git push --force` / `git push --force-with-lease` (リモートのリリース
  履歴上書き)
- `CHANGELOG.md` に SemVer を含む H2 見出し (例: `## [X.Y.Z]`,
  `## [X.Y.Z] - YYYY-MM-DD`) を新規追加すること。`## [Unreleased]` 配下
  への追記のみが例外
- `git tag vX.Y.Z` / `git tag qfai@X.Y.Z` 等のリリース系 tag の実行
- `npm publish` / `pnpm publish` 系の実行
- `gh pr merge --auto` 等で AI 自身がリリース PR をマージすること

## 機能完成時の正しいフロー

AI は機能完成時に次のように振る舞う:

1. `feat(...)` / `fix(...)` / `docs(...)` / `refactor(...)` の機能 commit を打つ
2. `CHANGELOG.md` の `## [Unreleased]` 配下に変更内容を追記
3. リリース commit はユーザの明示指示を待つ — 自分から打たない

ユーザがバージョン bump を指示したときの手順:

1. 指示された版番で `packages/qfai/package.json#version` を更新
2. `CHANGELOG.md` の `## [Unreleased]` を `## [X.Y.Z] - YYYY-MM-DD` に rename
3. 空の `## [Unreleased]` セクションを再挿入
4. `chore(release): qfai X.Y.Z` で commit

## 自動ガード

`packages/qfai/scripts/check-branch-version-pin.sh` が次を検証する:

- 現ブランチ名から SemVer を抽出 (見つからなければ pass)
- `packages/qfai/package.json#version` と一致しなければ exit 1

CI の lint job から呼び出され、不一致 PR を構造的にブロックする。
緊急時は `VERSION_PIN_SKIP=1` で無効化可能 (ユーザ承認済みの coordinated
release で、ブランチ名と version を一時的に乖離させるケース用)。

## 過去事例

- 2026-05-02: `feature/v1.8.8` 上で AI (Claude Code) が独断で
  1.9.0 → 1.9.1 をリリース commit に格上げ。履歴を `git reset --hard`
  で巻き戻した上で、本ルールと自動ガードを追加した。

## 関連

- 配布物の version marker leak は別ルール:
  `.agents/rules/distributed-surface.md`。
