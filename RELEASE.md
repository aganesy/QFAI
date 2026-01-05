# Release 手順

## 前提

- main に対象コミットが揃っている
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
- レビュー完了基準: 追加指摘が 0 件の確認サイクルを 30 回連続で満たす
- PR のマージ/タグ付けは権限保有者が実施する

## 手順

※ 以下のコマンドは、特記がない限りリポジトリ直下で実行してください。

1. 依存を揃える

```
pnpm install
```

2. ローカル CI（PR 前に必須）

```
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

```
cd packages/qfai
npm publish --dry-run
```

publish 前の成功条件:

- `pnpm build` が成功
- `pnpm verify:pack` が成功
- `npm publish --dry-run` が成功

dry-run 実行後はリポジトリ直下に戻ってください（Unix/Linux: `cd ../../`、PowerShell: `Set-Location ..\\..`）。手順 4 以降はリポジトリ直下で実行します。

4. タグ作成

```
git tag vX.Y.Z
git push origin vX.Y.Z
```

例: `git tag vX.Y.Z`

5. GitHub Release 作成（CHANGELOG を引用）

6. npm publish（必要な場合）

```
cd packages/qfai
npm publish
```

## リリース後の最終確認

空の作業ディレクトリで実行してください（既存ファイル衝突を避けるため）。

Unix/Linux（bash/zsh）の場合:

```
mkdir -p tmp/qfai-release-smoke
cd tmp/qfai-release-smoke
```

PowerShell の場合:

```
New-Item -ItemType Directory -Force -Path tmp/qfai-release-smoke
Set-Location tmp/qfai-release-smoke
```

```
npm i -D qfai
npx qfai init
# validate で validate.json を生成
npx qfai validate
npx qfai report --out .qfai/out/report.md
```

## 注意

- `npm whoami` でログイン状態を確認してください。
- 2FA 有効時は automation token（`NPM_TOKEN`）の利用を推奨します。
- npm publish 実行には `NPM_TOKEN` などの認証が必要です。
- unscoped パッケージでは `--access public` は不要です（scoped の場合のみ必要）。
- publish は必ず `packages/qfai` 配下で実行してください。
