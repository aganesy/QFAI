# UI Definition Consumption Protocol

spec-0013 (CAP-0013) で定義された、下流 skill が UI 定義を読み取る際の手順。

## Boundary

`/qfai-sdd` だけが discussion sidecar artifacts (`discussion-*/uiux/`) を読み取り、下流実行用の specs/contracts に正規化する。

`/qfai-prototyping`、`/qfai-atdd`、`/qfai-implement`、`/qfai-verify` は discussion-pack を読まない。UI/UX 定義は specs、contracts、evidence から読む。

## Reading Order

下流 skill は以下の順序で UI 定義を読む。

1. **Specs** (`.qfai/specs/spec-*/`)
   - `01_Spec.md`
   - `03_Acceptance-Criteria.md`
   - `05_Examples.md`
   - `06_Test-Cases.md`

2. **UI Contracts** (`.qfai/contracts/ui/*.yaml`)
   - screen ID
   - route
   - primary tasks
   - states
   - actions

3. **Brand SSOT and Design Contracts** (UX-loop redesign — spec-0012 v2.0 / UX-loop absorbed)
   - `DESIGN.md` (repo root) — brand vision / visual identity SSOT (DCON-030)
   - `.qfai/contracts/design/DESIGN.md.lock.yaml` — sha256 hash freeze written by `/qfai-sdd` Phase 0 (DCON-031)
   - `.qfai/contracts/design/design-system.yaml` — deterministic mirror of DESIGN.md tokens, generated post-prototyping (DCON-005 / DCON-032 mirror validator)
   - `.qfai/contracts/design/prototype-handoff.yaml` — references finalIterIndex / finalArtifact / extractedDesignSystem (= design-system.yaml)

   Removed (UX-loop redesign / spec-0012 09_delta CHG-001 — see `_policies/05_Contracts.md`):
   - `exploration-brief.yaml`, `reference-pool.yaml`, `brand-design.yaml` — brand SSOT consolidated into root `DESIGN.md`
   - `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `absorption-policy.yaml`, `selected-direction.yaml` — evaluation now via code constants + DESIGN.md compliance gate

4. **Evidence** (`.qfai/evidence/**`)
   - prototyping screenshots / HTML / snapshots / command logs
   - evaluator reviews
   - implementation and verification evidence

## Failure Rules

| Missing Definition                  | Behavior                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| UI contract                         | Stop UI-bearing downstream execution                                                          |
| Root `DESIGN.md`                    | Return to `/qfai-discussion` to author it, then `/qfai-sdd` Phase 0 to lock it (DCON-030/031) |
| `DESIGN.md.lock.yaml` hash mismatch | Halt with exit 2 at cycle ≥1; user must re-run `/qfai-prototyping` from cycle 0               |
| Post-prototyping design-system      | Return to `/qfai-prototyping` to mirror DESIGN.md into design-system.yaml (DCON-032)          |
| Discussion sidecar in downstream    | Do not read it; normalize through `/qfai-sdd`                                                 |

## Forbidden Fallbacks

- Do not infer downstream UI behavior from discussion-pack sidecars.
- Do not use retired design contract files.
- Do not use HTML mock sections as downstream source of truth.
- Do not treat a template reference as a selected design direction.
