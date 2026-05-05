# 06 Test-Cases

| TC-ID        | AC-Refs      | EX-Ref       | Steps                                             | Expected                      |
| ------------ | ------------ | ------------ | ------------------------------------------------- | ----------------------------- |
| TC-0010-0001 | AC-0010-0001 | EX-0010-0001 | generate UI-bearing discussion sidecars           | new sidecar family exists     |
| TC-0010-0002 | AC-0010-0002 | EX-0010-0002 | validate exploration brief headings               | required heading error        |
| TC-0010-0003 | AC-0010-0003 | EX-0010-0003 | validate exploration rubric headings              | rubric passes                 |
| TC-0010-0004 | AC-0010-0004 | EX-0010-0004 | validate evaluator calibration headings           | calibration passes            |
| TC-0010-0005 | AC-0010-0005 | EX-0010-0005 | validate review bundle best-of-history wording    | review bundle passes          |
| TC-0010-0006 | AC-0010-0006 | EX-0010-0006 | inspect discussion artifact for final winner text | planner-first violation fires |
| TC-0010-0007 | AC-0010-0007 | EX-0010-0007 | run UI-bearing discussion and inspect root DESIGN.md token tables | DESIGN.md exists with required token tables |
| TC-0010-0008 | AC-0010-0008 | EX-0010-0008 | run UI-bearing discussion and list emitted sidecars | none of the legacy sidecars appear; regression validator surfaces if they do |
