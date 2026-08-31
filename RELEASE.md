# Release 手順

## 前提

前提は経路ごとに異なります。**自動化された経路は、手動経路が「更新済み」を要求している
ものを更新するための経路です。** 先に版を上げてから Prepare release を実行すると、入力
した版が現在の版と一致するため必ず拒否されます。

### 共通

- main に対象コミットが揃っている
- 各変更が `CHANGELOG.md` の `## [Unreleased]` に説明を書いている（空、または
  `### Added` のような見出しだけの状態では Prepare release は失敗します）
- Supported: Node.js >= 20.0.0 / Tested: Node.js 20 / Recommended: Node.js 20 LTS 以上

### 自動化された経路を使う場合

- `packages/qfai/package.json#version` と `CHANGELOG.md` の版見出しは **まだ更新して
  いない**こと。更新するのがこの経路の仕事です
- リポジトリに `RELEASE_AUTOMATION_TOKEN` secret が設定されている（下記「必要な secret」）
- npm publish 権限は不要です。publish は `release` environment の必須レビュアーが承認
  したうえで CI が trusted publishing (OIDC) で実行します

### 手動の経路を使う場合

- `packages/qfai/package.json` の version と `CHANGELOG.md` が更新済み
- npm publish 権限があり、`npm whoami` が成功する
- 次メジャーへ進む前提として、パッチで整合を取り、段階的に進める

## 権限と責務

- PR/コミット作成: 誰でも可
- マージ/タグ付け/リリース作業: 権限保有者のみ
- 権限が無い環境では PR 作成まで実施し、マージ/タグ/公開は権限保有者へ引き継ぐ

## ブランチ/PR

- ブランチ命名: `feature/vX.Y.Z`
- PR 作成前にローカル CI を実行（次節のコマンド）
- レビュー完了基準: DoD を満たし、追加指摘がすべて解消されていること
- PR のマージ/タグ付けは権限保有者が実施する

## 自動化された経路（推奨）

版番号を1回入力すれば、PR 作成と tag 付けは自動で進みます。publish は `release`
environment の必須レビュアー承認で従来どおり止まります。

1. Actions で **Prepare release** を実行し、`version` に `X.Y.Z`（先頭 `v` なし）を入力する
2. 作成された `release/vX.Y.Z` の PR をレビューして merge する
3. **Tag release commit** が `vX.Y.Z` を自動で push し、`release.yml` が起動する
4. `release` environment の承認を与えると npm publish が走る

### この自動化が「しない」こと

**リリース文面を書きません。** `CHANGELOG.md` の `## [Unreleased]` は各変更が入るたびに
その変更の作者が書き足すもので、リリース時に起きるのは「どこで区切るか」だけです。
Prepare release がするのは次の3点だけで、散文は一切生成しません。

- `packages/qfai/package.json#version` の同期
- `## [Unreleased]` を `## [X.Y.Z] - <日付>` に rename
  （日付は **Prepare release を実行した日** です。tag が切られるのは PR がマージされた
  ときなので、翌日以降にマージする場合はその PR の中で日付を直してください。マージ後に
  直すには `main` への別コミットが必要になります）
- 空の `## [Unreleased]` を再挿入

GitHub Release の本文も `release.yml` が同じセクションを抽出して使います。つまり公開される
説明は、マージ済み PR が書いた内容そのものです。

裏返しとして、**`## [Unreleased]` が空なら Prepare release は失敗します**。誰も書いていない
リリースノートは「何も起きなかった」と読めてしまい、無いより悪いためです。

**版番号も選びません。** `.agents/rules/version-discipline.md` は版番号の決定権をユーザに
置いており、フォームへの入力がその明示指示にあたります。入力は必須で、既定値はありません。

### 必要な secret

`RELEASE_AUTOMATION_TOKEN`（`contents: write` と `pull-requests: write`）。理由は2つあります。

- **`GITHUB_TOKEN` で push した tag は他の workflow を起動しません。** 職務トークンで tag を
  打つと `release.yml` が発火せず、リリースが無言で止まります。
- ワークフロー側の `permissions:` を `contents: read` のまま保てるため、`BR-0017-0016` の
  「最小スコープからの逸脱はちょうど3件」という閉じた集合を広げずに済みます。

secret が未設定なら、両ワークフローとも理由を述べて失敗します（黙って何もしないことはありません）。

## 手順（手動）

自動化を使わない場合、または権限が無い環境では以下の手順で実施します。

※ 以下のコマンドは、特記がない限りリポジトリ直下で実行してください。

1. 依存を揃える

   ```sh
   pnpm install
   ```

2. ローカル CI（PR 前に必須）

   ```sh
   pnpm format:check
   node scripts/check-bidi.mjs
   pnpm lint
   pnpm check-types
   node scripts/check-build-warnings.mjs
   pnpm -C packages/qfai test
   pnpm test:assets
   node packages/qfai/dist/cli/index.mjs --help
   node packages/qfai/dist/cli/index.mjs init --dry-run
   node packages/qfai/dist/cli/index.mjs doctor --fail-on error
   pnpm verify:pack
   ```

   `pnpm verify:pack` はリポジトリ直下で実行してください（直接実行する場合は `node ./scripts/verify-pack.mjs`）。

3. パッケージ確認（dry-run）

   ```sh
   cd packages/qfai
   npm publish --dry-run
   ```

   publish 前の成功条件:
   - `pnpm build` が成功
   - `pnpm verify:pack` が成功
   - `npm publish --dry-run` が成功

   dry-run 実行後はリポジトリ直下に戻ってください（Unix/Linux: `cd ../../`、PowerShell: `Set-Location ..\\..`）。以降の手順はリポジトリ直下で実行します。

4. タグ作成

   ```sh
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

   例: `git tag vX.Y.Z`

5. GitHub Release 作成（CHANGELOG を引用）

6. npm publish（必要な場合）

   ```sh
   cd packages/qfai
   npm publish
   ```

## リリース後の最終確認

空の作業ディレクトリで実行してください（既存ファイル衝突を避けるため）。

Unix/Linux（bash/zsh）の場合:

```sh
mkdir -p tmp/qfai-release-smoke
cd tmp/qfai-release-smoke
```

PowerShell の場合:

```powershell
New-Item -ItemType Directory -Force -Path tmp/qfai-release-smoke
Set-Location tmp/qfai-release-smoke
```

```sh
npm i -D qfai
npx qfai init
# validate で validate.json を生成
npx qfai validate
npx qfai report --out .qfai/report/report.md
```

## 注意

- `npm whoami` でログイン状態を確認してください。
- 2FA 有効時は automation token（`NPM_TOKEN`）の利用を推奨します。
- npm publish 実行には `NPM_TOKEN` などの認証が必要です。
- unscoped パッケージでは `--access public` は不要です（scoped の場合のみ必要）。
- publish は必ず `packages/qfai` 配下で実行してください。
- `report.json` / `doctor.json` は内部表現で互換非保証です。外部連携は `report.md` など Markdown 出力を推奨します。
