# US-0001-0147: Optional surface skeleton capture

## User Story

As an operator running cycle 0 across a frozen surface union of several UI contracts, I want `qfai prototyping iterate --cycle 0 --emit-skeletons` (opt-in during the deprecation window) to emit one placeholder HTML styled with `DESIGN.md` tokens for each `screens[].id` in `frozenSurfaceUnion`, so that after convergence every screen in `frozenSurfaceUnion` has at least one `screenshot` and one `html` entry in `evidenceRefs[]` whichever UI contract it belongs to, while a run without the flag behaves as before.
