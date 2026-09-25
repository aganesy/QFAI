# EX Reference Dispositions

The archived `07_Decisions.md` and `09_delta.md` files preserve the source at migration start. DEC-0713 and DEC-0714 record these later source corrections.

| Example | Test case | Decision | Preserved obligation | Migration result |
| --- | --- | --- | --- | --- |
| EX-0006-0010 | TC-0006-0016 | Remove only the test case's EX reference. The example demonstrates the primary Playwright probe under AC-0006-0010; this test case checks a fresh init and install under AC-0006-0012. | Keep TC-0006-0016's AC reference and zero-error result. Keep EX-0006-0010's input and expected primary-probe result. | EX-0006-0010 derives AC-0006-0010; TC-0006-0016 remains for Step 5 as TC-only. |
| EX-0016-0008 | TC-0016-0008 | Remove only the test case's EX reference. The example demonstrates valid SKILL frontmatter and deferred body loading under AC-0016-0007; this test case checks invalid YAML and fallback under AC-0016-0008. | Keep TC-0016-0008's AC reference and parse-error result. Keep EX-0016-0008's valid-frontmatter input and expected result. | EX-0016-0008 derives AC-0016-0007; TC-0016-0008 remains for Step 5 as TC-only. |
