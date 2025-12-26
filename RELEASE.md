# Release 手順

## 前提

- main に対象コミットが揃っている
- `packages/qfai/package.json` の version と `CHANGELOG.md` が更新済み

## 手順

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
node scripts/verify-pack.mjs
```

`scripts/verify-pack.mjs` はリポジトリ直下で実行してください（PowerShell 例: `node .\\scripts\\verify-pack.mjs`）。

3. パッケージ確認（dry-run）

```
cd packages/qfai
npm publish --dry-run
```

publish 前の成功条件:

- `pnpm build` が成功
- `node scripts/verify-pack.mjs` が成功
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

```
mkdir tmp/qfai-release-smoke
cd tmp/qfai-release-smoke
```

```
npm i -D qfai
npx qfai init
npx qfai validate --json-path .qfai/out/validate.json
npx qfai report --json-path .qfai/out/validate.json --out .qfai/out/report.md
```

## 注意

- `npm whoami` でログイン状態を確認してください。
- 2FA 有効時は automation token（`NPM_TOKEN`）の利用を推奨します。
- npm publish 実行には `NPM_TOKEN` などの認証が必要です。
- unscoped パッケージでは `--access public` は不要です（scoped の場合のみ必要）。
- publish は必ず `packages/qfai` 配下で実行してください。
