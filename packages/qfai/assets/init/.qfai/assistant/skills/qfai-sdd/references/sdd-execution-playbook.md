# SDD Execution Playbook

Use this file for the detailed sequencing rules behind `/qfai-sdd`.

## Preflight

1. Identify the latest discussion-pack.
2. Stop if required files are missing.
3. Stop if blocking OQ remain.
4. Stop if the latest UI-bearing pack is missing valid `prototyping.yaml`.

## Shared-before-Slice Rule

- Contracts-first and Outline are shared work.
- Slice, Plan, and Delta are target-spec work.
- In no-argument mode, shared work runs once and per-spec work fans out after shared outputs stabilize.

## Update Policy

- Update existing artifacts in place when the current target already exists.
- Create new spec artifacts only after approval.
- Delete only after approval and after recording the rationale.

## Stop Conditions

- Missing or stale `_policies/11_Slice-Policy.md`
- Missing Contract Index alignment
- Unresolvable preflight blockers
- Validate errors that point to unresolved source-layer gaps
