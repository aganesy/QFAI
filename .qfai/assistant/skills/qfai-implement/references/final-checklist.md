# Final Checklist

Check this list last, immediately before the completion message. Every box must be ticked; a box that
cannot be ticked is a reason not to declare completion, not a note to carry forward.

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Each item was processed one test at a time, or inside an item-level parallel dispatch authorized by `SKILL.md#parallelization-policy`.
- [ ] Red phase: test was written and confirmed to fail.
- [ ] Green phase: minimal code was written and test confirmed to pass.
- [ ] Refactor phase: code improved with tests still passing.
- [ ] `test-list.md` statuses are accurate.
- [ ] No backward transitions occurred.
- [ ] Exception items have DR-IDs recorded.
- [ ] All tests pass.
- [ ] `npx qfai validate --profile tdd --fail-on error` passes with zero `QFAI-TEST-001` findings (no
      `it.todo` / `test.todo` / `describe.todo` stubs remain).
