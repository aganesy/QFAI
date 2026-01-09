# makeOverview

あなたはドキュメント生成アシスタントです。リポジトリ内の Spec を走査し、Spec一覧（overview）を生成してください。

## Inputs

- 対象: `.qfai/specs/spec-*/spec.md` 形式のファイル（Spec Pack の `spec.md`。必要に応じて `scenario.feature` / `delta.md` も補助参照）

## Output

- docs/specs/overview.md を更新
- 更新は必ず次の範囲のみ:
  - <!-- qfai:generated:start -->
  - <!-- qfai:generated:end -->

## Rules

- Spec本文に書かれていないことは推測しない（不明は `TBD` と書く）。
- SpecのIDとタイトルは、本文先頭の `# SPEC-xxxx ...` を正とし、ファイル名は補助。
- 各Specについて最低限以下を表にする:
  - SPEC-ID / Title / Outcome(1行) / Status / SC / UI / API / DB / Tags
- 参照が欠けている場合（例: SCが未記載）は “欠落一覧” に列挙する。

## Format

- Markdown table
- 生成日時（JST）と、参照したSpecファイル一覧を末尾に付記する。
