# 10 Plan

- Spec: spec-0035
- Parent: CAP-0035

## Implementation Sequence

### Step 1: UI-bearing detection module refactor (P0)

- Create a single shared detection module under `core/` with `detectSurfaceType()`.
- Surface type enum: `web-ui`, `mobile-ui`, `desktop-ui`, `mixed`, `non-ui`.
- Classification priority: explicit declaration > content heuristics > default (non-ui).
- Replace inline detection logic in `uixDetection.ts` and `discussionDesignHardening.ts` with shared module calls.

### Step 2: Prototyping SKILL.md rewrite (P0)

- Rewrite prototyping skill body to align with static-first architecture.
- Remove all banned phrases: "must run runtime checks", "UI routes reachable", "API non-404", "DB objects present".
- Document 3 modes explicitly: low-cost / standard / full-harness with obligations per mode.
- Add non-UI n/a applicability notes to each mode definition.

### Step 3: Full-harness entrypoint (P0)

- Create dedicated skill file for `/qfai-prototyping-full-harness`.
- Integrate full-harness mode into CLI command (`qfai prototyping --mode full-harness`).
- Replace routing guidance output with actual workflow start.
- Define loop semantics: entry, iteration (generate + evidence + review + calibrate), exit (convergence or max iterations).

### Step 4: Full-harness validator (P1)

- Implement `UIX-VAL-FULL-HARNESS-ENTRYPOINT-MISSING` validator.
- Validator checks: dedicated skill file exists, CLI integration present, workflow definition (not routing guidance).
- Add non-UI fixture test (non-ui project -> validator returns n/a).

## File Targets

- `packages/qfai/src/core/detection/surfaceDetection.ts` (new shared module)
- `packages/qfai/src/validators/uixDetection.ts` (refactor: delegate to shared module)
- `packages/qfai/src/validators/discussionDesignHardening.ts` (refactor: delegate to shared module)
- `.qfai/assistant/skills/qfai-prototyping/SKILL.md` (rewrite)
- `.qfai/assistant/skills/qfai-prototyping-full-harness/SKILL.md` (new)
- `packages/qfai/src/cli/commands/prototyping.ts` (update: full-harness integration)
- `packages/qfai/tests/integration/detection/**` (new)
- `packages/qfai/tests/integration/prototyping/**` (new/update)

## Test Strategy

- Integration: 3 fixtures per new validator (pass, fail, non-UI n/a), integration test for shared detection module (explicit/heuristic/non-ui paths), banned phrase scan test on SKILL.md.
- E2E: full-harness workflow start from CLI, full-harness workflow start from skill.
- API: none.
- Gate checks:
  - Shared detection module returns consistent results across validators
  - No banned phrases in prototyping skill body
  - Full-harness entrypoint starts workflow (not routing guidance)
  - `qfai validate --fail-on error --format github`

## Risks and Controls

- Detection heuristic false positives for mixed surface types: use explicit declaration priority to minimize; keep heuristic as fallback only.
- Banned phrase creep: automated scan test prevents reintroduction.
- Full-harness scope creep: keep workflow definition bounded by spec-0031 iteration limits (5-15 configurable).
- Non-UI over-fire regression: mandatory non-UI fixture test for every new validator.

## Implementation Order

1. Shared detection module (Step 1) - prerequisite for all downstream work
2. Prototyping SKILL.md rewrite (Step 2) - can proceed after detection module
3. Full-harness CLI integration (Step 3) - depends on SKILL.md alignment
4. Full-harness validator (Step 4) - final verification layer

## v1.7.9 Convergence Note

- mode posture は `standard` default を維持し、discussion recommendation と CLI override の precedence を崩さない。
- full-harness は explicit non-default path として扱い、nominal reference や routing-only に戻さない。
- shared detection module は content heuristics を fallback に限定し、surface declaration を primary SSOT とする。
