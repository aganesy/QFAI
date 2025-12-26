# Release 手順

## 前提

- main に対象コミットが揃っている
- `packages/qfai/package.json` の version と `CHANGELOG.md` が更新済み
- npm publish 権限があり、`npm whoami` が成功する

## 手順

※ 以下のコマンドは、特記がない限りリポジトリ直下で実行してください。

1. 依存を揃える

```
pnpm install
```

2. ビルド・品質ゲート

```
pnpm build
pnpm format:check
pnpm lint
pnpm check-types
pnpm -C packages/qfai test
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

4. タグ作成

```
git tag vX.Y.Z
git push origin vX.Y.Z
```

例: `git tag v0.2.4`

5. GitHub Release 作成（CHANGELOG を引用）

6. npm publish（必要な場合）

```
cd packages/qfai
npm publish
```

## リリース後の最終確認

空の作業ディレクトリで実行してください（既存ファイル衝突を避けるため）。

Unix/Linux の場合:

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
npx qfai validate --json-path .qfai/out/validate.json
npx qfai report --json-path .qfai/out/validate.json --out .qfai/out/report.md
```

## 注意

- `npm whoami` でログイン状態を確認してください。
- 2FA 有効時は automation token（`NPM_TOKEN`）の利用を推奨します。
- npm publish 実行には `NPM_TOKEN` などの認証が必要です。
- unscoped パッケージでは `--access public` は不要です（scoped の場合のみ必要）。
- publish は必ず `packages/qfai` 配下で実行してください。
