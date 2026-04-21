# L1 Review Guide

L1 checks implementation fidelity.

## Inputs

- screenshots
- HTML snapshots
- canonical screen contracts
- latest code state

## Required checks

For each declared screen:

- the screen is reachable/rendered
- screenshot exists
- HTML snapshot exists
- required elements are visibly present
- required actions are wired or explicitly marked missing
- blocking UI failures are identified

## Failure handling

- Missing screenshot or HTML => score `0`, rerun required
- Missing primary action wiring => blocking finding
- Severe route/render failure => blocking finding

## Output

Return:

- per-screen findings
- blocking/immediate-fix classification
- a numeric score per axis in the range `0.0..1.0`
- rationale tied to screenshot/HTML evidence
