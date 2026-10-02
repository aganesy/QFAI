---
category: specialties
update-frequency: occasional
dependencies: [00_universal/thinking.md]
version: 1.0.0
---

# Investigation and Debugging Procedure

A pattern for identifying and solving problems.

## Steps

1. **Reproduce the issue**: Record the reproduction steps and the expected and actual values. If it cannot be reproduced, list the differences in circumstances.
2. **Understand the scope of impact**: Identify the related components, data and logs, and map the impact.
3. **List hypotheses and prioritize them**: Draw up candidate causes from the conditions under which it occurs and the change history, and verify them in priority order.
4. **Fix and verify**: Add a reproduction test, fix, and rerun. Check for side effects.

## Report Template

- Issue / reproduction steps / expected and actual / environment
- Findings and the hypotheses ruled out
- The fix made and the test results
- Remaining risks and follow-up
