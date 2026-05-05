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
- Verify-side documentation, gate vocabulary, and `review-profiles.yml` MUST NOT reference "full-harness profile", "perfect-100 completion gate", or "weighted-total scoring" as active surface; only the default profile remains active.
