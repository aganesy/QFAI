# Example Mapping Guide

Use this file when `/qfai-discussion` performs Example Mapping.

## Minimum Perspectives

1. Happy path
2. Negative path
3. Edge or boundary
4. Permission or role
5. State transition when stateful
6. Idempotency or retry when external I/O exists

## Rules

- Use perspective coverage as the gate, not raw case counts.
- Mark intentionally skipped perspectives with reason and follow-up.
- Feed unresolved seeds into OQ items with owner and decision point.
