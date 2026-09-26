# US-0001-0068: Flow-scoped report

## User Story

- Parent: CAP-0005
- Goal: On the story tree, `qfai report --flow BF-NNNN` renders the result of a flow-scoped validate run to report files of its own, so parallel workers each render their own flow without overwriting the shared report
- Non-goals: A scope finer than one business flow

## Legacy Source Scope

- In: every feature of the report command (`--format md|json`, `--base-url`, `--run-validate`, `--in`, `--out`, `--phase`, validate.json input, report.md/report.json output, spec-pack report generation), and the prototyping observability section (obligations, screenshot/html evidence, review artifact, validate/verify outcome, compatibility wording). On the story tree, the spec-pack reports become one report per business flow, and `--flow BF-NNNN` scopes a run to named business flows
- Out: validate/init/doctor/guardrails

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0005/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0005/02_User-stories.md#us-0005-0009`
