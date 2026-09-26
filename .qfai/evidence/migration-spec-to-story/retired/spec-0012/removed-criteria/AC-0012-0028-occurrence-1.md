## AC-0012-0028: Deterministic Stop on Convergence

- Status: superseded by AC-0012-0042 (AND-aggregator across all spec × screen pairs of 4-axes-exceptional + lap empty + dmv empty; no quantitative AC-pass thresholds). See `09_delta.md` CHG-002 OP-PURGE-073.
- Given the latest iter has all 4 UX axes (informationArchitecture / navigationFlow / usability / functionality) `exceptional` AND `layoutAntiPatternsDetected.length === 0` AND `designMdViolations.length === 0`,
- When `qfai prototyping iterate --cycle <n+1>` runs,
- Then it exits with code `64` and prints "convergence reached".

