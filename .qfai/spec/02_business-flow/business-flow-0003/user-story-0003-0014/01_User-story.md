# US-0003-0014: ガードレール抽出

## User Story

- Parent: CAP-0007
- Goal: `qfai guardrails extract --keyword <keyword>` でキーワードに合致するガードレールを抽出し、LLM 向けフォーマットで出力する。`--max` で出力上限を制御する（デフォルト 20）
- Non-goals: 正規表現やファジー検索
- Notes: キーワードは大文字小文字を区別しない部分一致。`--max` が非負整数でない場合はエラー

## Legacy Source Scope

- In: guardrails コマンドの全機能（list, extract, check）
- Out: validate/init/report/doctor
- Note: legacy concept reintroduction guard（旧 prototyping 概念 mode/full-harness/round/polish/concept-fit などの sanity grep 系）は将来の guardrail extension で扱う。現時点では既存の `check-no-internal-version-leakage.sh`（distributed-surface 系）以外の guardrail を本 spec の active surface に追加しない。

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0007/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0007/02_User-stories.md#us-0007-0002`
