# Evaluation Axis: Accessibility

## Layer Classification

- Layer: invariant
- Source: WCAG 2.1 compliance requirement

## Evaluation Criteria

| Criterion             | Description                             | Weight |
| --------------------- | --------------------------------------- | ------ |
| WCAG compliance       | Meets WCAG 2.1 AA requirements          | High   |
| Keyboard navigation   | All interactions reachable via keyboard | High   |
| Screen reader support | Semantic HTML and ARIA labels           | High   |
| Color contrast        | Meets minimum contrast ratios           | Medium |

## Measurement Approach

| Metric            | Method                  | Target                    |
| ----------------- | ----------------------- | ------------------------- |
| WCAG violations   | Automated axe-core scan | 0 critical/serious        |
| Keyboard coverage | Manual tab-through test | 100% interactive elements |
| Contrast ratio    | Automated check         | >= 4.5:1 (normal text)    |

## Scoring Guide

- 5: WCAG 2.1 AAA compliant
- 4: WCAG 2.1 AA compliant, zero automated violations
- 3: AA compliant with minor manual-only findings
- 2: Critical accessibility gaps
- 1: Not accessibility-tested
