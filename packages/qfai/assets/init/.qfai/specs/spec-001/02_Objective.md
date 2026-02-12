# 02 Objective

## Intent

- Enable order draft creation with explicit duplicate prevention.
- Keep flow simple enough for first-iteration delivery.

## Success Metrics

| Metric | Target | Measurement |
| ------ | ------ | ----------- |
| Draft creation success rate | >= 99 percent | API success ratio |
| Duplicate prevention correctness | 100 percent | duplicate rejection checks |

## Decision Policy

- Correctness over speed for duplicate handling.
- Clear user feedback over implicit retries.

