# US-0001-0062: リポジトリリンク付与

## User Story

- Parent: CAP-0005
- Goal: `--base-url <url>` でレポート内のファイルパスにリポジトリ URL リンクを付与する
- Non-goals: リンクの自動検証

## Legacy Source Scope

- In: every feature of the report command (`--format md|json`, `--base-url`, `--run-validate`, `--in`, `--out`, `--phase`, validate.json input, report.md/report.json output, spec-pack report generation), and the prototyping observability section (obligations, screenshot/html evidence, review artifact, validate/verify outcome, compatibility wording). On the story tree, the spec-pack reports become one report per business flow, and `--flow BF-NNNN` scopes a run to named business flows
- Out: validate/init/doctor/guardrails

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0005/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0005/02_User-stories.md#us-0005-0003`
