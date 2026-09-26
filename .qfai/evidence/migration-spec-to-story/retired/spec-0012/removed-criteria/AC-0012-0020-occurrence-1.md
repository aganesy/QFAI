## AC-0012-0020: Single-Thread Serial Iteration

- Status: superseded by AC-0012-0038 (10-cycle, multi-spec per-spec lineage). See `09_delta.md` CHG-002 OP-PURGE-070.
- Given `/qfai-prototyping` is invoked with a frozen root `DESIGN.md`,
- When the iteration loop runs,
- Then exactly one prototype lineage is evolved across cycles 0..14 (max 15 iterations) with no parallel candidate funnel.

