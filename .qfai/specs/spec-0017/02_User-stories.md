# 02 User Stories

## Purpose

User stories for spec-0017 (Prototyping Playwright CLI Agent Harness).

## Stories

### US-0017-0001: Developer runs prototyping with unified gate

As a developer using `/qfai-prototyping`, I want all modes (low-cost / standard / full-harness) to enforce the same strictest review gate so that running a low-cost mode does not silently lower visual quality expectations and only affects how many iteration cycles I am allowed to consume.

- Acceptance: AC-0017-0001
- Requirements: REQ-0001, REQ-0004

### US-0017-0002: AI evaluator uses Playwright CLI to capture evidence

As an AI evaluator sub-agent, I want QFAI to provide me a deterministic Playwright CLI command plan with pre-assigned output paths so that I can execute the plan, capture screenshots / HTML / accessibility snapshots, and focus my judgement on visual quality without inventing evidence paths.

- Acceptance: AC-0017-0002
- Requirements: REQ-0002, REQ-0006

### US-0017-0003: AI generator receives concrete evaluator feedback

As an AI generator sub-agent, I want evaluator findings to be tied to concrete artifact refs (screenshot/html/snapshot paths) so that I can reproduce the issue and fix the UI without guessing which frame the reviewer was looking at.

- Acceptance: AC-0017-0003
- Requirements: REQ-0005

### US-0017-0004: Independent reviewer enforces cycle completeness

As an independent reviewer sub-agent, I want the review cycle (capture → review → fix → re-capture → re-review) to be verifiable from `prototyping.json` alone so that I can confirm completion without re-running the whole harness.

- Acceptance: AC-0017-0004
- Requirements: REQ-0004, REQ-0005

### US-0017-0005: Developer prepares review bundles via CLI

As a developer, I want to run `qfai prototyping prepare --target-url <url> --mode standard --cycle 1` from my shell so that the review bundle and Playwright CLI command plan are generated deterministically before I invoke the AI evaluator sub-agent.

- Acceptance: AC-0017-0005
- Requirements: REQ-0007

### US-0017-0006: Developer upgrades without silent aliasing

As a developer upgrading from v1.8.x to the CLI-first harness, I want the old `browserProvider` / `renderProvider` config keys to produce a clear config error pointing at the new `browserTool: playwright-cli` so that I do not run stale pipelines under the illusion they still work.

- Acceptance: AC-0017-0006
- Requirements: REQ-0008
