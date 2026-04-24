# 10 Plan — Prototyping Playwright CLI Agent Harness

## Implementation Strategy

### Overview

spec-0017 (Prototyping Playwright CLI Agent Harness) is delivered in 7 phases, each a single commit. Phases are ordered so that each commit passes its scoped tests while the downstream phases do not yet require the new surfaces. Breaking changes are accepted for v1.8.3.

Mirror of approved plan: `C:\Users\YusukeSenaga\.claude\plans\ps-c-users-yusukesenaga-documents-githu-functional-unicorn.md`.

### Phase 1: SSOT Update (this spec)

**Scope**: REQ-0001..REQ-0008 declared; skill + references + contracts README updated

- Create `.qfai/specs/spec-0017/` with 01-10 files
- Update `.qfai/assistant/skills/qfai-prototyping/SKILL.md` (Playwright CLI first, mode invariant)
- Update `.qfai/assistant/skills/qfai-prototyping/references/evidence-requirements.md` (iteration paths)
- Sync to `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/`
- Update `.qfai/contracts/design/README.md` if needed for review bundle / evaluator review obligations

**Deliverables**:

- `.qfai/specs/spec-0017/*.md`
- Updated skill file (both trees, byte-identical)
- Updated references files

**Verification**:

- `diff -r .qfai/assistant/skills/qfai-prototyping/ packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/` is empty
- `rg -n "full-harness only|playwright-mcp" .qfai packages/qfai/assets/init` reports 0 matches

**Commit**: `docs(prototyping): declare CLI-first mode invariant in specs/contracts/skill (spec-0017)`

### Phase 2: Mode obligations & config simplification (breaking)

**Scope**: REQ-0001, REQ-0002, REQ-0008

- `packages/qfai/src/core/review/prototyping.ts` — `derivePrototypingObligations` returns the same obligations for all modes except `maxCycles`; rename `PROTOTYPING_MAX_ITERATIONS` → `PROTOTYPING_MAX_CYCLES`
- `packages/qfai/src/core/config.ts` — drop `browserProvider` / `renderProvider`; require `browserTool: playwright-cli`; error on legacy keys
- `packages/qfai/assets/init/root/qfai.config.yaml` + `qfai.config.yaml` — replace keys

**Deliverables**: updated review / config / assets; new tests `prototypingMode.test.ts` + extended `config.test.ts`

**Verification**: `pnpm test -- --run tests/core/prototypingMode tests/core/config`

**Commit**: `feat(prototyping)!: unify mode obligations to maxCycles-only; drop browserProvider/renderProvider`

### Phase 3: Command plan + review bundle

**Scope**: REQ-0006

- New files: `packages/qfai/src/core/prototyping/types.ts`, `playwrightCliPlan.ts`, `reviewBundle.ts`
- Unit tests under `packages/qfai/tests/core/prototyping/`

**Deliverables**: new modules + tests (no breaking)

**Verification**: `pnpm test -- --run tests/core/prototyping`

**Commit**: `feat(prototyping): add Playwright CLI command plan & review bundle`

### Phase 4: Evidence schema migration (breaking)

**Scope**: REQ-0005

- Rename `FullHarnessIterationEvidence` → `PrototypingCycleEvidence` across `harness/types.ts`, `harness/resultWriter.ts`, `evidence/bundleWriter.ts`
- Update fixture `.qfai/evidence/prototyping.json` (if any exists)
- Add iteration-centric paths in bundleWriter

**Verification**: `pnpm test -- --run tests/unit/bundleWriter tests/core/harness`

**Commit**: `refactor(evidence)!: replace FullHarnessIteration with PrototypingCycle schema`

### Phase 5: Unified validators (breaking)

**Scope**: REQ-0001, REQ-0003, REQ-0004

- New validators: `prototyping/modeInvariant.ts`, `prototyping/reviewCycle.ts`
- Edit `executionPlan.ts`, `screenshotDir.ts`, `iterationGate.ts` to drop `mode !== "full-harness"` early-exit
- Drop `lighthouseGate.ts` from required gate
- Update `prototypingEvidence.ts`, `uiEvidenceArtifacts.ts` schema expectations
- Update `packages/qfai/src/cli/commands/validate.ts` error code table

**Verification**: `pnpm test -- --run tests/validators tests/core/validate`

**Commit**: `feat(validate)!: enforce unified strictest gate across all modes; add QFAI-PROT-MODE-001`

### Phase 6: `qfai prototyping prepare` CLI

**Scope**: REQ-0007

- New `packages/qfai/src/cli/commands/prototyping.ts`
- Wire into `cli/main.ts`; add `--target-url`, `--mode`, `--cycle` in `lib/args.ts`
- Integration test `tests/cli/prototyping.test.ts`

**Verification**: `pnpm test -- --run tests/cli/prototyping`

**Commit**: `feat(cli): add 'qfai prototyping prepare' for review bundle generation`

### Phase 7: Cleanup (breaking)

**Scope**: REQ-0002, REQ-0008

- Delete `packages/qfai/src/core/providers/playwrightBrowserQaProvider.ts`
- Delete `packages/qfai/src/core/evidence/playwrightRenderAdapter.ts`
- Delete `packages/qfai/assets/scripts/capture-screenshots.js` + `tests/skill/captureScreenshots.test.ts`
- Update `packages/qfai/src/core/report.ts` to show cycles / browserTool / bestOfHistory / breakthrough / reviewerGate
- Update `packages/qfai/README.md`, steering docs, `.instruction/02_project/*`
- Add regression test `tests/assets/noLegacyReferences.test.ts`

**Verification**:

- `rg -n "full-harness only|browserProvider|renderProvider|playwright-mcp|capture-screenshots|FullHarnessIteration" .qfai packages/qfai` → 0 matches
- `pnpm format:check && pnpm lint && pnpm check-types`
- `pnpm test`

**Commit**: `chore!: remove Node Playwright adapters, capture-screenshots.js, MCP remnants; update report/docs`

## Phase Dependency Graph

```
Phase 1 (SSOT)
   ↓
Phase 2 (mode/config breaking) — independent impl surface
   ↓
Phase 3 (new modules, additive)
   ↓
Phase 4 (evidence schema rename, breaking)
   ↓
Phase 5 (validators unified, breaking) — depends on 2/4 landing
   ↓
Phase 6 (CLI command) — depends on 3 landing
   ↓
Phase 7 (cleanup + report)
```

## Final Gates (after Phase 7)

- `pnpm format:check && pnpm lint && pnpm check-types`
- `pnpm test`
- `qfai validate --profile prototyping --fail-on error`
- `qfai report --run-validate`
