# 05 Examples

## EX-0012-0001: Declared Screen Has Complete Evidence

- Given `40_screen_contracts.md` declares `orders-dashboard`
- And `.qfai/evidence/prototyping/screenshots/orders-dashboard.png` exists
- And `.qfai/evidence/prototyping/html/orders-dashboard.html` exists
- Then validate does not emit `QFAI-UIE-001/002` for that screen

## EX-0012-0002: Screenshot Missing

- Given `40_screen_contracts.md` declares `orders-dashboard`
- And the HTML snapshot exists
- And the screenshot does not exist
- Then validate emits `QFAI-UIE-001`
- And the skill must rerun capture before completion

## EX-0012-0003: HTML Missing

- Given `40_screen_contracts.md` declares `orders-dashboard`
- And the screenshot exists
- And the HTML snapshot does not exist
- Then validate emits `QFAI-UIE-002`
- And the skill must rerun capture before completion

## EX-0012-0086: Step 0 Planning

- Given `/qfai-prototyping` starts a new iteration
- When the skill prepares execution planning
- Then it records `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`

## EX-0012-0089: Evaluator Inputs

- Given screenshots and HTML snapshots are captured
- And axis definitions are available from `20/21/22/23`
- And a previous score artifact exists
- And `uiux/12_design_system.md` exists
- Then the L1/L2 evaluators receive all five input classes before scoring

## EX-0012-0091: Legacy Lighthouse Gate

- Given a legacy full-harness-style artifact on `web`
- And no Lighthouse evidence is attached
- Then the validator/reference slice may emit a Lighthouse-related issue
- But this does not reintroduce a public `--mode full-harness` contract
