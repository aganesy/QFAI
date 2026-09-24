# US-0003-0016: ガードレール入力エラー

## User Story

- Parent: CAP-0007
- Goal: action 不在、または `--path` で明示した入力を読めない場合に、利用者が原因を特定できるエラーと exit 2 を受け取る
- Non-goals: 読み込み失敗を空のガードレール集合として扱うこと、入力の自動修復

## Legacy Source Scope

- In: guardrails コマンドの全機能（list, extract, check）
- Out: validate/init/report/doctor
- Note: legacy concept reintroduction guard（旧 prototyping 概念 mode/full-harness/round/polish/concept-fit などの sanity grep 系）は将来の guardrail extension で扱う。現時点では既存の `check-no-internal-version-leakage.sh`（distributed-surface 系）以外の guardrail を本 spec の active surface に追加しない。

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0007/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0007/02_User-stories.md#us-0007-0004`
