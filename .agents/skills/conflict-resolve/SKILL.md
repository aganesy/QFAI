---
name: conflict-resolve
description: 最新のベースブランチ取り込みで発生したGit競合を、ours/theirs双方の修正意図を分析して共存解決し、コミット/プッシュまで完了する。競合解消が必要なときに使用する。
argument-hint: "ベースブランチ（省略時 origin/main の最新HEAD）"
---

# Git 競合解決（意図共存）

latest base branch 取り込みで発生した競合を、両ブランチの修正意図を壊さず共存解決する。

## 完了条件

- [ ] `git diff --name-only --diff-filter=U` が 0 件
- [ ] 競合ファイルごとに両ブランチ意図の保持根拠を説明可能
- [ ] コミット/プッシュ完了

## Phase 0: 前提確認

1. リモートを最新化:

```bash
git fetch origin
```

2. ベースブランチを決定（引数あり → その値、なし → `origin/main`）。
3. 競合有無を確認:

```bash
git status --short
git diff --name-only --diff-filter=U
```

4. 競合が 0 件なら停止し、`競合なし` を報告する。

## Phase 1: 修正意図の徹底分析

1. 競合ファイル一覧を取得:

```bash
git diff --name-only --diff-filter=U
```

2. 各ファイルで 3-way の内容を確認:

- `git show :1:<file>`（base）
- `git show :2:<file>`（ours）
- `git show :3:<file>`（theirs）

3. 関連履歴と差分を確認:

- `git log --oneline --decorate -- <file>`
- `git diff -- <file>`

4. [reference.md](reference.md) の「意図分析マトリクス」をファイル単位で埋める。
5. 「どちらを採用するか」ではなく、「両意図を共存させる統合方針」を先に決定する。

## Phase 2: 競合解決実装

1. 統合方針に沿って競合マーカーを除去し実装を統合。
2. `ours/theirs` の丸ごと採用は原則禁止。例外時は根拠を作業報告に記録。
3. 競合マーカー残存を確認:

```bash
rg -n "<<<<<<<|=======|>>>>>>>"
```

4. 競合解消ファイルをステージ:

```bash
git add <resolved-files>
```

## Phase 3: 検証

1. プロジェクトの lint/format/型チェック/テストを実行し、競合解決が既存機能を壊していないことを確認する。
2. 失敗がある場合は修正し、再度ステージする。

## Phase 4: コミット/プッシュ

コミットメッセージ規約は [reference.md](reference.md) に従う。

```bash
git commit -m "merge: resolve conflicts with <base-branch>"
git push
```

## 禁止事項

- CI ワークフロー定義の無効化・スキップ目的編集
- 自動生成ファイルの手動編集（コード生成ツールの再実行で対応する）
- テストの `skip` / `todo` / 削除での回避
- 型安全を無効化する回避（`@ts-ignore`、`@ts-expect-error`、`any`、lint-disable 等）

## 停止条件

- 同一エラーの反復（3回以上）
- 環境依存で再現不能またはネットワーク依存で進行不能
- 2ブランチ意図の両立不可
- 影響範囲が大きく安全に判断できない

停止時は [reference.md](reference.md) の作業報告テンプレートで、状況・試行内容・判断が必要な点を報告する。
