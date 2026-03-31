# 10 Plan

- Spec: spec-0028
- Parent: CAP-0028

## Implementation Sequence

### Step 1: mode resolver and obligation split

- Make `qfai prototyping` mode resolution explicit for `low-cost`, `standard`, and `full-harness`.
- Keep the default path static-first and lightweight.
- Ensure runtime-heavy obligations are attached only to the appropriate mode instead of leaking into the default path.

### Step 2: render-evidence wiring

- Wire screenshot/viewport/DOM snapshot evidence through a structured schema with `captured`, `skipped`, and `failed` states.
- Keep capability absence fail-open.
- Ensure evidence remains useful even when capture is partial.

### Step 3: backend abstraction

- Keep browser and visual-review execution behind optional provider registration.
- Avoid any new universal runtime dependency.
- Make provider absence a supported state, not an implicit error path.

### Step 4: browser QA findings

- Replace stub or empty browser QA behavior with real structured findings for smoke, interaction, visual, and accessibility phases.
- Return structured unavailable/launch-failure responses instead of empty arrays.
- Emit clean metadata explicitly when no findings exist.

### Step 5: report and docs alignment

- Ensure report output and user-facing docs expose the mode split, runtime boundary, and evidence expectations consistently.
- Keep standard mode guidance separate from full-harness guidance.

## File Targets

- `packages/qfai/src/core/prototyping/**`
- `packages/qfai/src/core/evidence/**`
- `packages/qfai/src/core/providers/**`
- `packages/qfai/src/core/browserQa/**`
- `packages/qfai/src/core/report/**`
- `packages/qfai/tests/core/**`
- `packages/qfai/tests/integration/**`
- `packages/qfai/tests/e2e/**`

## Test Strategy

- Integration: `tests/integration/**` covers mode resolution, provider fail-open behavior, structured browser QA findings, and unavailable/error responses.
- E2E: `tests/e2e/**` covers representative user journeys for static-first standard mode and explicit full-harness/browser-QA paths.
- API: none unless a future `CON-API-*` contract appears.
- Gate checks:
  - mode-isolation tests for `low-cost`, `standard`, and `full-harness`
  - structured findings tests for non-empty, clean, and unavailable cases
  - `qfai validate --fail-on error --format github`

## Risks and Controls

- Mode drift between docs and runtime: treat resolver constants and help/output text as one slice.
- Browser-only regressions on non-web repos: keep no-provider fixtures in the main regression set.
- Evidence inflation: preserve partial capture semantics and avoid treating missing optional capture as hard failure.

## v1.7.9 Convergence Note

- public contract は `artifact recommends / CLI decides / report records` を維持する。
- default は `standard`、discussion recommendation は secondary source、CLI override は strongest source とする。
- browser QA findings と render evidence status は docs / report / reviewer input で同一 field family を使う。

## v1.7.11 Completion Steps

### 目的

- `runBrowserQa()` に実際の phase runner を接続し、foundation-only の状態を解消する。
- render evidence の real status model を実装し、honest empty findings を強制する。

### 実施内容

1. `runBrowserQa()` に smoke / visual / interaction / accessibility の実際の phase runner を wiring する。
2. render evidence に `captured / skipped / failed` の real status model を実装する。
3. コードベースから foundation-only コメント（placeholder、stub、"not implemented" 等）を除去する。
4. findings が空の場合は honest empty（構造化メタデータ付きの空配列）のみを許可し、silent empty を禁止する。
5. 各 phase runner の実行結果を structured findings として report に流す。

### テスト戦略

- TC-0028-0037: `runBrowserQa()` が 4 phase すべてを実行すること。
- TC-0028-0038: render evidence が real status model に準拠すること。
- TC-0028-0039: foundation-only コメントがコードベースに残っていないこと。
- TC-0028-0040: empty findings が honest metadata を伴うこと。
- TC-0028-0041: smoke phase が structured findings を返すこと。
- TC-0028-0042: visual phase が structured findings を返すこと。
- TC-0028-0043: interaction phase が structured findings を返すこと。
- TC-0028-0044: accessibility phase が structured findings を返すこと。
- Integration: browser QA end-to-end で 4 phases を通した統合テスト。
