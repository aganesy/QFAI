# 07 Decisions

### DR-0014-0001: Compatibility Removal Is Enforced by Canonical Surface Checks

- Decision: compatibility semantics are enforced by inspecting the canonical package surface (`validate.ts`, `validators/index.ts`, `types.ts`) and by letting canonical validators reject stale sidecar artifacts with explicit migration errors.
- Context: the previous spec text still assumed rollout ratchets, `validators/legacy/`, and docs/runtime drift hooks, but the current source has already removed those paths.
- Rationale: a semantics audit should follow the executable surface. Verifying the active exports and canonical migration errors gives stable, implementation-backed compatibility guarantees without reintroducing dead compatibility layers.
