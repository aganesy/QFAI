# 05 Examples

## Purpose

Concrete examples that illustrate spec-0017 behavior.

## Example 1 — Deterministic Playwright CLI command plan

Input (canonical screen contract):

```yaml
screenId: order-list
route: /orders
primaryTasks:
  - "Verify order row renders with status badge"
  - "Click first row to open detail drawer"
```

Output (`playwright-commands.json`, cycle 1):

```json
{
  "cycle": 1,
  "screenId": "order-list",
  "route": "/orders",
  "targetUrl": "http://localhost:5173/orders",
  "commands": [
    { "purpose": "goto", "command": "playwright-cli goto \"http://localhost:5173/orders\"" },
    {
      "purpose": "snapshot",
      "command": "playwright-cli snapshot --save .qfai/evidence/prototyping/iterations/1/order-list.snapshot.txt",
      "outputPath": ".qfai/evidence/prototyping/iterations/1/order-list.snapshot.txt"
    },
    {
      "purpose": "interaction",
      "command": "# evaluator: perform primary task via playwright-cli click/fill",
      "note": "Verify order row renders with status badge"
    },
    {
      "purpose": "interaction",
      "command": "# evaluator: perform primary task via playwright-cli click/fill",
      "note": "Click first row to open detail drawer"
    },
    {
      "purpose": "screenshot",
      "command": "playwright-cli screenshot --full-page --save .qfai/evidence/prototyping/iterations/1/order-list.png",
      "outputPath": ".qfai/evidence/prototyping/iterations/1/order-list.png"
    },
    {
      "purpose": "html",
      "command": "playwright-cli eval \"document.documentElement.outerHTML\" > .qfai/evidence/prototyping/iterations/1/order-list.html",
      "outputPath": ".qfai/evidence/prototyping/iterations/1/order-list.html"
    }
  ]
}
```

## Example 2 — Mode obligations are identical except maxCycles

```ts
derivePrototypingObligations({ surface, effectiveMode: "low-cost" })
// => { browserTool: "playwright-cli", requireExecutionPlan: true, ..., maxCycles: 1 }

derivePrototypingObligations({ surface, effectiveMode: "standard" })
// => { browserTool: "playwright-cli", requireExecutionPlan: true, ..., maxCycles: 3 }

derivePrototypingObligations({ surface, effectiveMode: "full-harness" })
// => { browserTool: "playwright-cli", requireExecutionPlan: true, ..., maxCycles: 20 }

// All obligations except `maxCycles` are pairwise equal.
```

## Example 3 — Legacy config key rejection

Input (`qfai.config.yaml`):

```yaml
prototyping:
  execution:
    browserProvider: playwright  # legacy key
    renderProvider: playwright   # legacy key
```

Output (CLI):

```
QFAI-CONFIG-001: "prototyping.execution.browserProvider" is no longer supported.
  Replace with: prototyping.execution.browserTool: playwright-cli
  See spec-0017/01_Spec.md REQ-0008.
```

## Example 4 — Evaluator review with concrete evidence refs

Valid (`evaluator-review.json`):

```json
{
  "cycle": 1,
  "reviewerId": "product-surface-reviewer",
  "scores": [
    {
      "axisId": "design-quality",
      "score": 92,
      "rationale": "Card layout is clear but header spacing is tight",
      "evidenceRefs": [
        ".qfai/evidence/prototyping/iterations/1/order-list.png",
        ".qfai/evidence/prototyping/iterations/1/order-list.html"
      ]
    }
  ]
}
```

Invalid (rejected by validator):

```json
{
  "scores": [
    { "axisId": "design-quality", "score": 92, "rationale": "OK", "evidenceRefs": [] }
  ]
}
// → QFAI-PROT-REVIEW-* empty evidenceRefs
```

## Example 5 — Mode invariant violation

Input (`prototyping.json`):

```json
{
  "mode": { "effective": "standard", "source": "config", "rationale": "default" },
  "maxCycles": 20
}
```

Output (validate):

```
QFAI-PROT-MODE-001: Mode differences are limited to maxCycles only.
  Expected maxCycles=3 for mode=standard, got 20.
  path: .qfai/evidence/prototyping.json
```
