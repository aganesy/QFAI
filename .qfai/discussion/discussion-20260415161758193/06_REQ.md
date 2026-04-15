# 06 Requirements

## Functional Requirements

| REQ-ID | Title | Description | Source | Priority | Status |
|--------|-------|-------------|--------|----------|--------|
| REQ-0001 | Reject non-full-harness prototyping modes | CLI, execution.ts, and prototypingEvidence.ts must reject `standard` and `low-cost` mode with a clear error. The error message must state that only `full-harness` is supported in packages/qfai v1.7.15. | SRC-0001 WS-1 | must | draft |
| REQ-0002 | Reject non-UI prototyping surfaces | CLI, execution.ts, and prototypingEvidence.ts must reject `cli`, `api`, `backend`, and any surface not in PROTOTYPING_SUPPORTED_SURFACES. Error must name the rejected surface. | SRC-0001 WS-1 | must | draft |
| REQ-0003 | surfacePolicy.ts standalone module | A new file `packages/qfai/src/core/prototyping/surfacePolicy.ts` must export `PROTOTYPING_SUPPORTED_SURFACES`, `isSupportedPrototypingSurface(surface)`, and `assertSupportedPrototypingSurface(surface)`. No other module may define these as SSOT. | SRC-0001 WS-2 | must | draft |
| REQ-0004 | runFullHarness calibration pack SSOT | `runFullHarness()` must accept `calibrationRef.packPath` (or a pre-resolved `calibrationPack` object) instead of scalar threshold parameters. When `packPath` is provided, it must resolve the pack internally via `CalibrationLoader`. Missing or unresolvable packPath must throw immediately. | SRC-0001 WS-3 | must | draft |
| REQ-0005 | runtimeGate concrete evidenceRefs | `runtimeGate.evidenceRefs` must contain only concrete artifact refs (render summary, screenshot, browser QA phase/finding refs). Self-references to `prototyping.json#/runtimeGate` are forbidden. | SRC-0001 WS-4 | must | draft |
| REQ-0006 | specCoverage concrete evidenceRefs | `specCoverage.evidenceRefs` must contain only `40_screen_contracts.md#<screen-id>` spec refs and concrete observation artifact refs. Synthetic string refs (`specs: ...`) are forbidden. | SRC-0001 WS-4 | must | draft |
| REQ-0007 | reviewerSignoff and reviewerLogs semantics | `reviewerSignoff.status` must be one of `approved | rejected | abandoned`. `reviewerLogs[].verdict` must be one of `approve | revise | reject | abandon`. Mapping: accept→approved, explicit-reject→rejected, plateau/maxIterations/failure→abandoned. `isCompleted` alone must not produce `approved`. | SRC-0001 WS-5 | must | draft |
| REQ-0008 | uiFidelityBuilder screenId matching | `uiFidelityBuilder` must match observations using `obs.screenId === screen.screenId`. The old matching on `screen.uiContractId` must be removed. A regression test must verify that a fixture with `screenId != uiContractId` does NOT match via the old path. | SRC-0001 WS-6 | must | draft |
| REQ-0009 | Remove stale mode/surface semantics from shipped docs and assets | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`, `evidence/README.md`, `review/README.md`, `contracts/ui/README.md`, and `packages/qfai/README.md` must not contain `standard`, `low-cost`, `cli prototyping`, or `mockPaths.status=pass`. | SRC-0001 WS-7 | must | draft |
| REQ-0010 | Remove stale test fixtures and expectations | Tests must not contain fixtures or expectations that: (a) allow `cli + standard` prototyping, (b) assume optional evidence for `standard`, (c) allow `mockPaths.status=pass`, or (d) assert `approved` for plateau/maxIterations termination. | SRC-0001 WS-7 | must | draft |

## Requirement Dependency Map

| REQ-ID | Depends On | Notes |
|--------|-----------|-------|
| REQ-0001 | — | Independent; first workstream |
| REQ-0002 | REQ-0003 | Surface rejection at execution layer calls surfacePolicy.ts |
| REQ-0003 | — | New standalone file; no code dependencies |
| REQ-0004 | — | Internal to harness/runtime.ts and calibration/loader.ts |
| REQ-0005 | — | Internal to runtimeGateBuilder.ts |
| REQ-0006 | — | Internal to specCoverage.ts |
| REQ-0007 | — | Internal to execution.ts and harness/runtime.ts |
| REQ-0008 | — | One-line fix in uiFidelityBuilder.ts |
| REQ-0009 | REQ-0001, REQ-0002, REQ-0004, REQ-0005, REQ-0006, REQ-0007, REQ-0008 | Docs must be updated after code is correct |
| REQ-0010 | REQ-0001, REQ-0002, REQ-0003, REQ-0004, REQ-0005, REQ-0006, REQ-0007, REQ-0008 | Tests must be updated after all code workstreams are stable |

## Traceability: REQ → US

| REQ-ID | User Story |
|--------|-----------|
| REQ-0001 | US-001 |
| REQ-0002 | US-002 |
| REQ-0003 | US-002 (implementation) |
| REQ-0004 | US-003 |
| REQ-0005 | US-004 |
| REQ-0006 | US-004 |
| REQ-0007 | US-005 |
| REQ-0008 | US-006 |
| REQ-0009 | US-001, US-002, US-003, US-004, US-005, US-006 (docs) |
| REQ-0010 | US-001, US-002, US-003, US-004, US-005, US-006 (tests) |
