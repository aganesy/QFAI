# 04 Business Rules

## BR-0014-0001

- AC-Refs: AC-0014-0001
- Verify is always full-scan.

## BR-0014-0002

- AC-Refs: AC-0014-0002
- Reviewer PASS/REVISE is part of the completion gate.

## BR-0014-0003

- AC-Refs: AC-0014-0003
- Validate remains the source of deterministic schema/evidence findings.

## BR-0014-0004

- AC-Refs: AC-0014-0004
- Legacy validator slices may still refer to `full-harness` artifact semantics if corresponding code remains.
- Such wording must not be interpreted as restoring a removed runtime or CLI entrypoint.

## BR-0014-0005

- AC-Refs: AC-0014-0005
- Verify treats `.qfai/evidence/prototyping/iter-NN/{<screen>.png, <screen>.html, review.json}` as the active evidence layout; legacy `screenshots/` / `html/` paths MUST not be required.

## BR-0014-0006

- AC-Refs: AC-0014-0006
- `prototyping iterate` cycle 0 MUST delete any legacy `fullHarness` block from the live `prototyping.json` as part of the hard reset, so the post-1.8.9 evolution loop never re-reads stale `full-harness` / `perfect-100` / `weighted-total` runtime state from a prior pre-1.8.9 session.
