# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## BR-0024-0001

- Title: CLI flags override config
- Acceptance refs: AC-0024-0001
- Rule: `--render-evidence`, `--viewports`, `--render-out`, and `--base-url` override `uiux.renderEvidence` config values at runtime.

## BR-0024-0002

- Title: Render evidence requires autogen context
- Acceptance refs: AC-0024-0001, AC-0024-0004
- Rule: `--render-evidence` is only meaningful in the `--autogen-ui-fidelity` flow; without autogen the command records an explicit skipped state instead of silently no-oping.

## BR-0024-0003

- Title: Normalized render entry shape
- Acceptance refs: AC-0024-0002
- Rule: Each render entry must contain `viewport`, `status`, `width`, and `height`. `captured` requires `imagePath` and `htmlPath`; `skipped` requires `skippedReason`; `failed` requires `error`.

## BR-0024-0004

- Title: Path-only storage
- Acceptance refs: AC-0024-0003
- NFR-Refs: NFR-0024-0006
- Rule: Render evidence persists file paths and metadata only. Binary assets and HTML bodies must not be inlined into JSON or Markdown.

## BR-0024-0005

- Title: Lazy renderer resolution
- Acceptance refs: AC-0024-0004, AC-0024-0005
- NFR-Refs: NFR-0024-0003
- Rule: Render capture uses lazy Playwright resolution. Unavailable renderer, launch failure, and route-level failure are represented as typed outcomes, not as fatal process crashes.

## BR-0024-0006

- Title: Validation of captured artifacts
- Acceptance refs: AC-0024-0006
- NFR-Refs: NFR-0024-0004
- Rule: Captured entries must be validated against on-disk file existence. Missing screenshot or HTML files are errors with actionable route and viewport context.

## BR-0024-0007

- Title: Profile-sensitive coverage severity
- Acceptance refs: AC-0024-0007
- NFR-Refs: NFR-0024-0002
- Rule: Render coverage severity is adjusted by `qualityProfile` for missing optional coverage, but shape violations and captured-file absence remain errors in every profile.

## BR-0024-0008

- Title: Legacy critique compatibility
- Acceptance refs: AC-0024-0008, AC-0024-0009
- NFR-Refs: NFR-0024-0002
- Rule: Existing markdown-only packs remain valid. When render evidence exists, validators may prefer it as the primary viewport source without breaking legacy critique markdown flows.

## BR-0024-0009

- Title: Report must be actionable
- Acceptance refs: AC-0024-0010
- NFR-Refs: NFR-0024-0004
- Rule: Reports for skipped or missing render evidence must identify the missing item, the reason it matters, and the next recovery action.

## BR-0024-0010

- Title: Documentation must explain the bundle
- Acceptance refs: AC-0024-0011
- NFR-Refs: NFR-0024-0005
- Rule: Init evidence README and examples must describe the bundle shape, path convention, and degraded mode behavior.

## BR-0024-0011

- Title: Scope boundary is fixed
- Acceptance refs: AC-0024-0012
- Rule: Browser QA, visual diff, repair loop, and external critique adapters are out of scope for spec-0024 and must not be introduced as implicit dependencies.

## BR-0024-0012

- Title: No new top-level command
- Acceptance refs: AC-0024-0001
- Rule: `qfai prototyping` is extended in place. No separate `qfai render` or similar top-level command is added for v1.7.1.
