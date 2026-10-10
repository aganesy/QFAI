---
category: project
update-frequency: frequent
dependencies: [02_project/tech-stack.md]
version: 1.0.0
---

# Development Steps and Commands (QFAI Toolkit)

## Prerequisites

- Node.js — the supported range is `package.json#engines`. Read it there; it moves.
- pnpm — the pinned version is `package.json#packageManager`.

## Setup

```
pnpm install
pnpm build
pnpm install
```

The second install links `node_modules/.bin/qfai` to the build. pnpm skips that
link while `packages/qfai/dist/` is missing.

`npx qfai` runs the build of the checkout that owns the `node_modules` it
resolves. A worktree that needs its own build runs these three steps with its
own `node_modules`, never through a junction shared with another checkout: an
install there repoints the link for every checkout that shares it.

## Build and Quality Gates

```
pnpm build
pnpm format:check
pnpm lint
pnpm lint:mdschema
pnpm lint:mermaid
pnpm check-types
pnpm -C packages/qfai test
pnpm verify:pack
```

## Test directory mapping

Vitest project names describe runner groups. QFAI classifies coverage from
paths, so the runner group alone does not establish a test's layer.
The current directories below are relative to `packages/qfai/`.

| Directory           | Vitest project | QFAI kind     |
| ------------------- | -------------- | ------------- |
| `tests/e2e`         | `e2e`          | `e2e`         |
| `tests/assets`      | `e2e`          | Unclassified  |
| `tests/integration` | `integration`  | `integration` |
| `tests/detection`   | `integration`  | Unclassified  |
| `tests/skill`       | `integration`  | Unclassified  |
| `tests/codex`       | `integration`  | Unclassified  |
| `tests/core`        | `core`         | Unclassified  |
| `tests/unit`        | `unit`         | Unclassified  |
| `tests/validators`  | `validators`   | Unclassified  |
| `tests/cli`         | `cli`          | Unclassified  |
| `tests/scripts`     | `scripts`      | Unclassified  |

QFAI recognizes `e2e`, `integration` or `api` immediately after the deepest
test-root directory. Unclassified paths have kind `null`; this does not assign
a unit or component layer. `tests/api` would have kind `api`, but no current
Vitest project includes that directory.

The [test-layers policy][test-policy] defines the coverage obligations.
BF coverage counts in QFAI's `e2e` kind; AC coverage counts in `integration`
or `api`. EX coverage can count in selected tests outside QFAI's `e2e` kind,
including paths with kind `null`. Thus `tests/assets` can count EX coverage
even though its Vitest project is named `e2e`.

[Project configuration][test-selection] selects `.test.ts` and `.spec.ts`
files under `packages/*/tests/` for traceability and excludes test fixtures.
That selection is separate from Vitest's current `.test.ts` includes.
[Runner projects][test-runner], [path classification][test-kinds] and
[coverage counting][test-obligations] hold the current mapping and logic.

## CLI Smoke Test (in an empty directory)

```
npx qfai init
npx qfai validate --fail-on error --format github
npx qfai report
```

## Release

- See `RELEASE.md` for details
- Run `npm publish --dry-run` inside `packages/qfai`

## Rule and hook integration map

This map locates existing owners when rule or hook surfaces change.
The linked sources hold the current rules and procedures.
Paths in code spans are relative to the repository root.

| Surface involved               | Existing owner and related coverage                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rules shipped to adopters      | [Rule masters][masters] are linked from `.agents/rules/` and `.claude/rules/`. [Surface tests][surface] cover links and clauses.                                   |
| Repository-only rules          | Real files and overlays under `.agents/rules/`; [local rule guidance][local] describes their placement and citations.                                              |
| Rule citations                 | `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, shipped [AGENTS][agents] and [CLAUDE][claude]; [surface tests][surface] cover them.                   |
| Init entry-point summaries     | [Init writer][init] and `packages/qfai/src/core/agentEntryPoints.ts` own managed sections, rule citations and generated Copilot guidance.                          |
| Reminder messages              | [Message catalog][catalog] supplies the full and brief payloads used by host hooks; `.agents/rules/reminders.json` links to that source.                           |
| Hook events, matchers, readers | Shipped [Claude settings][settings] and [Codex hooks][codex]; repository copies are `.claude/settings.json` and `.codex/hooks.json`.                               |
| Hook identity and upgrades     | [Hook merge][merge] owns markers and earlier-group recognition; `packages/qfai/src/core/init/reminderHooks.ts` owns per-host write plans.                          |
| Reader payloads and filtering  | [Payload tests][payload] cover the current reader set; adjacent freeTextEntryHook, structuredQuestionHook, codexToolHooks and reminderRepeat tests cover delivery. |
| Stop-time session feedback     | [Feedback tests][feedback] cover reader filtering with synthetic input; [upgrade tests][upgrades] cover template upgrades.                                         |
| Shipped asset paths and bytes  | [Lane helper][lane] owns `ALLOWED_INIT_SOURCE_ASSETS` and `ALLOWED_INIT_CONTENT`; the layered scaffold E2E test reads those declarations.                          |
| A pinned guard or CI body      | `scripts/pin-guard-bytes.mjs` and `scripts/pin-verification-bodies.mjs` own resealing; `AGENTS.md` names the pinned files and recorded outputs.                    |
| A new TypeScript test file     | `packages/qfai/tsconfig.tests.json` owns the checked-file enumeration. Existing test files retain their nearby coverage.                                           |
| Behavior requirements          | [Init][contract], [workflow][workflow] and owning stories under `.qfai/spec/` hold requirements and AC/EX traceability; `CHANGELOG.md` records behavior changes.   |
| Documentation-only prose       | [Clarity][clarity] and [language][language] checks own prose checks; [README guard][readmes] owns README placement.                                                |

[masters]: ../../packages/qfai/assets/init/root/.agents/rules/
[surface]: ../../packages/qfai/tests/integration/agentsRulesSurface.test.ts
[local]: ../../.agents/rules/root-additions-policy.local.md
[agents]: ../../packages/qfai/assets/init/root/AGENTS.md
[claude]: ../../packages/qfai/assets/init/root/CLAUDE.md
[init]: ../../packages/qfai/src/cli/commands/init.ts
[catalog]: ../../packages/qfai/assets/init/root/.agents/rules/reminders.json
[settings]: ../../packages/qfai/assets/init/.claude/settings.json
[codex]: ../../packages/qfai/assets/init/.codex/hooks.json
[merge]: ../../packages/qfai/src/core/claudeCodeHooks.ts
[payload]: ../../packages/qfai/tests/assets/documentationClarityHooks.test.ts
[lane]: ../../packages/qfai/tests/helpers/shippedLaneCommands.ts
[contract]: ../../.qfai/spec/03_contract/cli/cli-0009-qfai-init.md
[readmes]: ../../scripts/check-tracked-readmes.mjs
[feedback]: ../../packages/qfai/tests/integration/init/sessionFeedbackHook.test.ts
[upgrades]: ../../packages/qfai/tests/cli/initClaudeCodeHooks.test.ts
[workflow]: ../../.qfai/spec/03_contract/cli/cli-0015-qfai-workflow.md
[clarity]: ../../scripts/check-doc-clarity.mjs
[language]: ../../scripts/check-repository-language.mjs
[test-policy]: ../../packages/qfai/assets/init/.qfai/assistant/rule/test-layers.md
[test-selection]: ../../qfai.config.yaml
[test-runner]: ../../packages/qfai/vitest.workspace.ts
[test-kinds]: ../../packages/qfai/src/core/atddTraceability.ts
[test-obligations]: ../../packages/qfai/src/core/validators/storyTreeObligations.ts
