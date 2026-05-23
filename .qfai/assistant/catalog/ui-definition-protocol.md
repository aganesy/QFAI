# UI Definition Consumption Protocol

QFAI が定義する、下流 skill が UI 定義を読み取る際の手順。

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

3. **Brand SSOT**
   - root `DESIGN.md` (front-matter + `# Brand Philosophy` body)
   - `.qfai/contracts/design/DESIGN.md.lock.yaml` (frozen sha256 + token schema)
   - `.qfai/contracts/design/design-system.yaml` (post-loop token mirror)
   - `.qfai/contracts/design/prototype-handoff.yaml` (post-loop handoff facts)

4. **Evidence** (`.qfai/evidence/**`)
   - prototyping screenshots / HTML / snapshots / command logs
   - evaluator reviews
   - implementation and verification evidence

## Failure Rules

| Missing Definition               | Behavior                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| UI contract                      | Stop UI-bearing downstream execution                       |
| Pre-prototyping design contract  | Return to `/qfai-sdd` and normalize contracts              |
| Post-prototyping design contract | Return to `/qfai-prototyping` and extract winner artifacts |
| Discussion sidecar in downstream | Do not read it; normalize through `/qfai-sdd`              |

## Forbidden Fallbacks

- Do not infer downstream UI behavior from discussion-pack sidecars.
- Do not use retired design contract files.
- Do not use HTML mock sections as downstream source of truth.
- Do not treat a template reference as a selected design direction.
