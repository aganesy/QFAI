# Implementation Strategy

## YAML Strategy Definition

```yaml
version: "0.1"
surface_type: "<web-ui|mobile-ui|desktop-ui|mixed>"
strategy:
  approach: "<description of the chosen implementation approach>"
  rationale: "<why this approach was selected>"
  constraints:
    - "<constraint 1>"
  risks:
    - risk: "<risk description>"
      mitigation: "<mitigation approach>"
```

## Strategy Selection Guidance

- Select one implementation approach based on project constraints and surface type.
- Reference scoring axes (20-23) for evaluation criteria.
- One complete strategy definition per project; avoid verbose alternatives here.

## Cross-references

- Surface classification: see SKILL.md `## UI-bearing Detection`
- Scoring axes: see `20_design_eval_invariant.md`, `21_design_eval_trend_derived.md`, `22_design_eval_product_specific.md`, `23_design_eval_aggregate.md`
- Option comparison: see `30_comparison.md`
