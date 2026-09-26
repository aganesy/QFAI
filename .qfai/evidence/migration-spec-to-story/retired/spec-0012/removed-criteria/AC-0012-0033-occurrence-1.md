## AC-0012-0033: CLI certify exit codes

- Status: superseded by AC-0012-0047 (per-spec aggregation across cycle-0 frozen spec set; per-spec missing-screen rejection). See `09_delta.md` CHG-002 OP-PURGE-076.
- Given `qfai prototyping certify --check`,
- When run after the loop terminates,
- Then exit code `0` indicates DONE; non-zero indicates failure with diagnostic output naming the missing artifact.

