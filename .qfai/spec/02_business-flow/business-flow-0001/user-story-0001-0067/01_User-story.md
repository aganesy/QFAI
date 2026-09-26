# US-0001-0067: Prototyping Observability Section

## User Story

As a project lead, I want `qfai report` to include a `## Prototyping` section showing mode resolution, obligation profile, evidence coverage, and runtime details, so that I can understand the prototyping state at a glance.

## Legacy Source Scope

- In: every feature of the report command (`--format md|json`, `--base-url`, `--run-validate`, `--in`, `--out`, `--phase`, validate.json input, report.md/report.json output, spec-pack report generation), and the prototyping observability section (obligations, screenshot/html evidence, review artifact, validate/verify outcome, compatibility wording). On the story tree, the spec-pack reports become one report per business flow, and `--flow BF-NNNN` scopes a run to named business flows
- Out: validate/init/doctor/guardrails

## Source Provenance

- Spec scope: the Scope section of retired spec-0005
- Story block: `us-0005-0008` of retired spec-0005
