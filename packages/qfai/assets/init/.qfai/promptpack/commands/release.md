# Release

- CHANGELOG と version を更新する
- `pnpm format:check && pnpm lint && pnpm check-types` を実行する
- `pnpm -C packages/qfai test` と `pnpm verify:pack` を実行する
- タグ付与は main の HEAD に対して行う
