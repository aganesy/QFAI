# 08 Glossary

## Terms

**full-harness**
The only supported prototyping mode in packages/qfai v1.7.15. Requires: UI-bearing surface, screen contracts, calibration pack, multi-iteration measurement loop with render + Browser QA evidence per iteration.

**calibration pack**
A YAML or JSON artifact (resolved via `CalibrationLoader`) that defines measurement thresholds, plateau detection parameters, and lookback windows for full-harness iterations. Must be referenced by path (`calibrationRef.packPath`); not by inline scalars.

**PROTOTYPING_SUPPORTED_SURFACES**
The canonical constant array defined in `surfacePolicy.ts` listing the surface types for which prototyping is allowed. Contains UI-bearing surfaces only: `web`, `mobile`, `desktop`, `mixed`. Does not include `cli`, `api`, or `backend`.

**surface policy**
The prototyping-specific allowlist of valid surface types, encapsulated in `surfacePolicy.ts`. Separate from the domain-wide surface vocabulary in `domain/surface.ts`.

**reviewerSignoff.status**
The final audit verdict of a harness execution cycle. One of: `approved` (quality gate met), `rejected` (explicitly rejected), `abandoned` (stopped by plateau or iteration limit without meeting quality gate).

**terminationReason**
The reason a harness execution stopped. Separate from `reviewerSignoff.status`. Possible values: `accepted`, `rejected`, `plateau`, `maxIterations`, `runtimeFailure`.

**evidenceRef**
A concrete pointer to an artifact that can be resolved at validation time. Must be a file path, JSON pointer (e.g., `prototyping.json#/renderSummary`), or section anchor (e.g., `40_screen_contracts.md#screen-login`). Synthetic strings and self-references are forbidden.

**uiFidelityBuilder**
The module (`uiFidelityBuilder.ts`) that computes UI fidelity scores by matching screen contract entries against screen observations. Matches are performed by `screenId` field only.

**screenId**
The canonical identifier for a screen contract entry in `40_screen_contracts.md`. Used by `uiFidelityBuilder` for observation matching.

**uiContractId**
A legacy field alias previously used for screen contract entries. Observation matching on `uiContractId` was a bug; it is replaced by `screenId` matching in v1.7.15.

**stale semantics**
Documentation, code, or test fixtures that describe a behavior no longer supported (e.g., `standard` prototyping, `cli` prototyping, `mockPaths.status=pass`).

**concrete artifact ref**
An evidenceRef that points to a real, resolvable artifact. Contrast with synthetic ref (unresolvable string) or self-reference (pointing to the document containing the ref itself).
