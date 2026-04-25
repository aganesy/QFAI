# L1 Review Guide

L1 checks implementation fidelity.

## Inputs (read from review-bundle.json)

- screenshots (round/candidate path, per declared screen)
- HTML snapshots (round/candidate path, per declared screen)
- accessibility snapshots (round/candidate path, per declared screen)
- Playwright CLI command log (round/candidate path, per declared screen)
- canonical UI contracts from `.qfai/contracts/ui/*.yaml`
- latest code state

## Required checks

For each declared screen:

- the screen is reachable/rendered (confirm via goto log in command log)
- screenshot, HTML, accessibility snapshot, and command log all exist at the round/candidate path
- required elements are visibly present (cross-check screenshot + HTML + snapshot)
- required actions are wired or explicitly marked missing (cross-check interaction commands in the command log vs `primaryTasks`)
- blocking UI failures are identified

## Failure handling

- Missing any of the 4 per-screen artifacts => score `0`, rerun required
- Missing primary action wiring => blocking finding
- Severe route/render failure => blocking finding

## Output

Write `evaluator-reviews/<candidate-id>.json` with:

- per-screen findings
- blocking/immediate-fix classification
- a numeric score per axis in the range `0..100`
- rationale tied to screenshot / HTML / snapshot / command log refs (all entries in `evidenceRefs[]` MUST be concrete paths to existing artifacts)
