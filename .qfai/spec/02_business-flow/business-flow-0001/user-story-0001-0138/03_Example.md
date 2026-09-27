# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                         | Expected                                                                                                                                                                                                                                      |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0138-01 | AC-0001-0138-01 | Given the v1.9.1 ship, When the public skill surface is grep-scanned (`grep -rn "resolveSurfaceUnion" assets/init/.qfai/assistant/skills/qfai-prototyping/`), | Then zero hits in SKILL.md / references/; the helper remains as an internal `core/prototyping/specResolution.ts` export for the cycle ≥ 1 drift gate only. Documentation lint pins zero remaining multi-spec public-surface mentions at HEAD. |
