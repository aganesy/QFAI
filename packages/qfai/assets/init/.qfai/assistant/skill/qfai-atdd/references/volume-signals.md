# Acceptance-test volume signals

Estimate work for one business flow. Count the BF obligation once in E2E
and each AC once in either Integration or API, according to the test that
will prove it. Do not count a shared AC in both layers. EX tests belong
to `/qfai-implement`; show their count as a handoff, outside ATDD's total.

| Layer             |                  Raw count |              Signal | Notes |
| ----------------- | -------------------------: | ------------------: | ----- |
| E2E               |                   BF count | share of ATDD total |       |
| API               |         AC assigned to API | share of ATDD total |       |
| Integration       | AC assigned to Integration | share of ATDD total |       |
| Implement handoff |                   EX count |                   - |       |

`ATDD total = E2E + API + Integration`. Each share is
`round(100 × layer count / ATDD total)` with halves rounded up. If total
is zero, write `-` for shares and explain that no active ATDD obligation
is declared. A DONE decision exception is named in Notes and excluded
from work still to author; do not remove the ID from the coverage matrix.

Signals are planning observations, not quality gates. Record an unusual
distribution and its cause without moving a BF or AC to a different layer
to improve the ratio. A gate passes only on executed tests and validation,
not on these counts.
