# 08 Open Questions

4 items.

## Resolved by cited decisions (CHG-006, 2026-05-27)

- OQ-0160 — Default Autopilot Policy template structure (which categories belong to auto-decide / ask-user / hard-required). RESOLVED by `_policies/08_Decisions.md` DR-0269 (3-bucket template, option C). Realized as AC-0015-0015 / BR-0015-0010.
- OQ-0162 — envelope-deviation `AskUserQuestion` audit trigger taxonomy. RESOLVED by DR-0270 (fixed four-context declared taxonomy, option C pinned). Realized as AC-0015-0016 / BR-0015-0011.
- OQ-0163 — `qfai audit log` CLI shape. RESOLVED by DR-0271 (filtered query + `--format table|json`, table default). Realized as AC-0015-0019 / BR-0015-0014.

## Carry-forward deferred (not resolved here)

- OQ-0119 — Reviewer subagent prompt / tool-augmentation timing for the new finding-code catalog (REQ-0168). Remains carry-forward deferred per upstream; this slice pins severity + justification posture (BR-0015-0013) only and MUST NOT resolve the prompt-augmentation timing.
