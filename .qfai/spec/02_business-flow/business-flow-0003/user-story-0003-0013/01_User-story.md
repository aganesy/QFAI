# US-0003-0013: ガードレール一覧

## User Story

- Parent: CAP-0007
- Goal: `qfai guardrails list` で policy と contract の明示的な `DG-NNNN` 項目を ID・種別・根拠・再検討条件・ソースファイル付きで一覧表示する
- Non-goals: ガードレールの編集・追加・削除
- Notes: 出力は `# Decision Guardrails (list)` ヘッダ付きの Markdown リスト形式。RFC 2119 の語から自動抽出しない

## Legacy Source Scope

- In: guardrails コマンドの全機能（list, extract, check）
- Out: validate/init/report/doctor
- Note: legacy concept reintroduction guard（旧 prototyping 概念 mode/full-harness/round/polish/concept-fit などの sanity grep 系）は将来の guardrail extension で扱う。現時点では既存の `check-no-internal-version-leakage.sh`（distributed-surface 系）以外の guardrail を本 spec の active surface に追加しない。

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0007/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0007/02_User-stories.md#us-0007-0001`
