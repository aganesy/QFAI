# 05 Scope

## In Scope

- **uiux/ sidecar artifact family (11 files)** -- New artifact directory housing UI/UX-specific discussion outputs.
- **qfai-discussion/SKILL.md UI-bearing flow update** -- Extend the skill definition to detect UI-bearing projects and gate completion conditions accordingly.
- **Direct template replacement (03, 04, 14)** -- Replace 03_Story-Workshop, 04_Sources, and 14_Review-Request templates with updated versions.
- **Batch A/B core template augmentation** -- Add UX intent cross-references to the existing core template set.
- **Init asset packaging** -- Bundle all new and changed files into the qfai init asset tree.

## Out of Scope

- **Deterministic validator enforcement** -- Deferred to v1.7.4.
- **Reviewer prompt implementation** -- Deferred to v1.7.4.
- **Render/browser evidence** -- Deferred to v1.8.0.
- **External critique provider** -- Deferred to v1.8.1.
- **Migration tooling** -- Deferred to v1.7.4.

## Success Criteria

| ID     | Name                        | Criterion                                      | Priority |
| ------ | --------------------------- | ---------------------------------------------- | -------- |
| SC-001 | Init asset integrity        | All sidecar files present in init assets       | must     |
| SC-002 | Non-UI init path preserved  | Non-UI project init succeeds without error     | must     |
| SC-003 | UI-bearing discussion smoke | UI-bearing project generates sidecar artifacts | must     |
| SC-004 | Template consistency        | Direct and batch templates are coherent        | should   |
