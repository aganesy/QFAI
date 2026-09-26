## AC-0012-0029: Deterministic Stop on Max Iterations

- Status: superseded by AC-0012-0038 / AC-0012-0039 (10-cycle terminator at `index === 9`; max-iterations exit named in REQ-0002). See `09_delta.md` CHG-002 OP-PURGE-074.
- Given the latest iter has `index === 14`,
- When `qfai prototyping iterate --cycle 15` runs,
- Then it exits with code `65` and prints "max iterations reached".

