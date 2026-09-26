# US-0003-0015: ガードレール整合性チェック

## User Story

- Parent: CAP-0007
- Goal: `qfai guardrails check` で検出されたガードレールの整合性を検証し、error/warning を Issue 形式で出力する。error > 0 で exit 1
- Non-goals: 自動修正
- Notes: Issue には code, message, file, line, id, severity が含まれる

## Legacy Source Scope

- In: guardrails コマンドの全機能（list, extract, check）
- Out: validate/init/report/doctor
- Note: legacy concept reintroduction guard（旧 prototyping 概念 mode/full-harness/round/polish/concept-fit などの sanity grep 系）は将来の guardrail extension で扱う。現時点では既存の `check-no-internal-version-leakage.sh`（distributed-surface 系）以外の guardrail を本 spec の active surface に追加しない。

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0007/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0007/02_User-stories.md#us-0007-0003`
