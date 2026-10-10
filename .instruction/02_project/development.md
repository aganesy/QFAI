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

On Windows, run the lint lanes from Git Bash. `ci:lint` and
`ci:gate:lint` invoke Bash, so Node.js and the pinned pnpm must be available
in that shell. Running those lanes from PowerShell also requires Git for
Windows' Bash directory on the PATH inherited by Node.

Root scripts start `pnpm` subprocesses. Keep a pnpm shim on their inherited
PATH even when starting a script with `corepack pnpm`. If Corepack is installed
but pnpm has no shim on PATH, create one in a directory your account owns.
In PowerShell:

```powershell
$pnpmShimDir = Join-Path $env:LOCALAPPDATA "qfai-pnpm"
New-Item -ItemType Directory -Path $pnpmShimDir -Force | Out-Null
corepack.cmd enable --install-directory $pnpmShimDir pnpm
$env:PATH = "$pnpmShimDir;$env:PATH"
```

In Git Bash, add the same directory before running the setup sequence:

```bash
export PATH="$(cygpath -u "$LOCALAPPDATA")/qfai-pnpm:$PATH"
```

These PATH changes apply to the current shells. Add the shim directory to your
user PATH and reopen terminals to reuse it. Corepack writes the shims to that
directory, without changing the Node.js installation directory. The lint helper
already creates temporary shims when Bash can find Corepack; that fallback
does not supply pnpm to other root scripts.

Run from this repository's root:

```bash
corepack pnpm bootstrap
```

Use `pnpm bootstrap` when pnpm is on PATH. The command uses the pinned
workspace package manager and runs these steps in order:

1. `pnpm install --frozen-lockfile`
2. `pnpm -C packages/qfai build`
3. `pnpm install --frozen-lockfile`

The second install links `node_modules/.bin/qfai` to the local build.
pnpm skips that link while `packages/qfai/dist/` is missing.
A failed step stops the command before any later step runs.

Each checkout must own its dependency directories. Bootstrap rejects a
symlink or junction at root `node_modules` or
`packages/qfai/node_modules` before installing. Do not share either
directory with another checkout: an install can repoint its launcher.
Run bootstrap separately in each fresh clone or worktree.
`npx qfai` then resolves the build of the checkout that owns its
`node_modules`.

On Windows, a worktree can contain a file symlink to a directory that the OS
cannot follow. Plain `qfai init` can repair this damage on its owned, same-target
directory wrappers. This repository's canonical `.qfai/assistant/` mirror is
managed separately by [the mirror script](../../scripts/link-assistant-tree.mjs).
The mirror script checks followability and repairs owned, same-target directory
links separately. Wrapper repair does not establish that the mirror is usable.

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

## Run one test file in CI

The manual `named-tests.yml` workflow runs one tracked test file at a pull request's
current head. It becomes available after the workflow is registered on main. Set
`pr` to the pull request number, then dispatch from main:

```bash
pr=YOUR_PR_NUMBER
sha="$(git ls-remote --refs origin "refs/pull/${pr}/head" | cut -f1)"
gh workflow run named-tests.yml --ref main \
  -f "pr=${pr}" -f "sha=${sha}" -f project=scripts \
  -f file=packages/qfai/tests/scripts/changelogReleasedSections.test.ts
```

Select one of the seven Vitest projects and an exact repository-relative `.test.ts`
path in that project's declared directories. Globs and traversal are rejected. The
workflow verifies the live pull request ref, checkout SHA and tracked file before
setup and again before execution. Both checks compare the file bytes with the
selected commit's blob, so setup or build changes are rejected. It refuses multiple
selected files, no matched file, an empty test file and a run with no executed tests.

This is a diagnostic. Every normal PR CI check is still required. A new dispatch
cancels an older named diagnostic for the same pull request and project. The job
uses the shared frozen install and package Node floor, and builds normally for
integration or e2e files that read the built CLI.

## Test directory mapping

Vitest project names describe runner groups. QFAI classifies coverage from
paths, so the runner group alone does not establish a test's layer.
The current directories below are relative to the repository root.

| Directory                         | Vitest project | QFAI kind     |
| --------------------------------- | -------------- | ------------- |
| `packages/qfai/tests/e2e`         | `e2e`          | `e2e`         |
| `packages/qfai/tests/assets`      | `e2e`          | Unclassified  |
| `packages/qfai/tests/integration` | `integration`  | `integration` |
| `packages/qfai/tests/detection`   | `integration`  | Unclassified  |
| `packages/qfai/tests/skill`       | `integration`  | Unclassified  |
| `packages/qfai/tests/codex`       | `integration`  | Unclassified  |
| `packages/qfai/tests/core`        | `core`         | Unclassified  |
| `packages/qfai/tests/unit`        | `unit`         | Unclassified  |
| `packages/qfai/tests/validators`  | `validators`   | Unclassified  |
| `packages/qfai/tests/cli`         | `cli`          | Unclassified  |
| `packages/qfai/tests/scripts`     | `scripts`      | Unclassified  |

For the directories listed here, QFAI recognizes `e2e`, `integration` or
`api` immediately under `tests`. Unclassified paths have kind `null`; this does not assign
a unit or component layer. An `api` directory immediately under `tests` would have kind `api`, but no current
Vitest project includes that directory.

The [test-layers policy][test-policy] defines the coverage obligations.
BF coverage counts in QFAI's `e2e` kind; AC coverage counts in `integration`
or `api`. EX coverage can count in selected tests outside QFAI's `e2e` kind,
including paths with kind `null`. Thus `packages/qfai/tests/assets` can count EX coverage
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

## Recover a timed-out push

A timeout leaves the remote result unknown. Confirm the first push has ended
and inspect the exact remote branch before retrying.

Use Git Bash from this checkout. Finish and commit the merge first. Confirm
that no earlier push from this checkout is running. Retain its tool session,
PID and command when available; a PID alone does not establish ownership.
Record the branch, HEAD and the remote ref's value or absence before pushing.
The remote lookup must succeed. This example requires GNU `timeout`:

```bash
pushBranch=$(git symbolic-ref --quiet --short HEAD) || exit 1
[ "$pushBranch" != main ] || exit 1
pushHead=$(git rev-parse --verify HEAD) || exit 1
timeout --foreground 100s git ls-remote --refs origin "refs/heads/$pushBranch"
[ "$(git symbolic-ref --quiet --short HEAD)" = "$pushBranch" ] || exit 1
[ "$(git rev-parse --verify HEAD)" = "$pushHead" ] || exit 1
timeout --foreground 100s git push origin "$pushHead:refs/heads/$pushBranch"
```

Run each command separately in the same Git Bash session and keep its result.
Do not start the push if the lookup fails or times out. These commands target
`origin` and the current topic branch; confirm that this is the intended
destination.

Immediately before either the initial push or a retry, repeat the two snapshot
comparisons above. Keep the original `pushBranch` and `pushHead` values.

A tool timeout may leave a running session. Poll that session instead of
starting another push. GNU `timeout` also does not establish that every Windows
child has exited. Confirm termination from the session result and, if needed,
the command and parentage of the owned process. If termination is unknown, stop.

After the attempt has ended, repeat the bounded remote lookup above. Compare
the exact ref and SHA with the recorded values:

- Remote SHA equals `pushHead`: publication is complete, even if the push timed out.
- Remote ref is unchanged or still absent: retry once with the same bounded push
  only after confirming that the local branch and HEAD still match the snapshots.
- Remote SHA changed to another value, the lookup fails, or the local snapshots
  changed: stop and inspect the state before choosing another action.

If the retry also times out, retain its result and inspect the remote again;
do not enter a retry loop. Preserve the merge commit and working tree. Do not
force-push, reset or delete locks. Do not terminate processes without ownership
proof.

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
