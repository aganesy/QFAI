# Version Discipline (全 AI 共通)

QFAI パッケージのバージョン番号は、AI エージェントが独断で進めない。
この規律はリポジトリで作業する全 AI (Claude Code / Codex / GitHub
Copilot / その他) に適用される。

## Master rule: ブランチ名 → version pin

1. **ブランチ名にセマンティックバージョンが含まれる場合**
   - 例: `feature/v1.8.8`, `release/1.9.0`, `hotfix/1.10.2-foo`
   - `packages/qfai/package.json#version` はその値で固定する
   - bump は禁止 (ユーザが明示的に「version を上げて」と指示した場合のみ可)
2. **ブランチ名にバージョンが含まれない場合**
   - 例: `main`, `chore/update-deps`, `feature/refactor-x`
   - `package.json#version` を変更する前に **必ずユーザに確認**
3. **正規表現** (guard と一致): `v?([0-9]+)\.([0-9]+)\.([0-9]+)` で
   ブランチ名から最初に見つかった SemVer を pin とする

## 禁止アクション (ユーザの明示承認なしに実施しない)

AI は次のいずれも独断で行ってはならない:

- `packages/qfai/package.json#version` フィールドの編集
- commit message に `chore(release):` プレフィックスを含めること
- `CHANGELOG.md` への新しい `## [X.Y.Z]` 見出し追加
  (`## [Unreleased]` 配下への追記は OK)
- `git tag vX.Y.Z` の実行
- `npm publish` / `pnpm publish` 系の実行

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
