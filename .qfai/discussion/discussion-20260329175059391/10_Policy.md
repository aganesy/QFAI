# 10_Policy

## Security Policy

- **POL-001**: External command/provider execution must be sandboxed and reviewed for injection risks. All provider commands are executed through a controlled adapter that validates and sanitizes arguments before shell invocation.
- **POL-002**: Critique provider responses must be validated against structured schema before consumption. Malformed or unexpected responses are rejected and the adapter falls back to fail-open semantics.
- **POL-003**: Handoff artifacts must not contain sensitive credentials or tokens. Handoff serialization strips environment variables and credential fields before writing to disk.

## Compliance Policy

- **POL-004**: Cost observability data must be local-only (not transmitted externally). All cost/time metrics are written to local `.qfai/` artifacts and never sent to remote endpoints.
- **POL-005**: Calibration assets must be version-controlled and auditable. All calibration examples and scoring alignment files are committed to the repository under `.qfai/` and tracked in the traceability chain.

## Quality Policy

- All new modules must have corresponding test coverage per CLAUDE.md project rules.
- Critique adapter interface changes require contract tests in `.qfai/contracts/`.
- Full-harness iteration loops must emit structured logs for post-mortem analysis.

## Operational Policy

- Premium path (`/qfai-prototyping-full-harness`) must display a cost estimate and require user confirmation before starting iterative loops.
- Long-running sessions exceeding 10 minutes must emit periodic progress indicators to stdout.
