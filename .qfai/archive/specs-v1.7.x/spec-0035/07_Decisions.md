# 07 Decisions

## Decisions

| DEC-ID      | Title                                    | Adopted Option                                                                                     | Source                                | Rationale                                                                                                                                                                                            |
| ----------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD-0035-001 | Full-harness dual entrypoint (CLI+skill) | Full-harness accessible via both CLI command and dedicated skill file; routing reception stateless | DR-0085, discussion-20260330035428071 | Direct invocation must be first-class (not second-class to routing). Stateless reception avoids fragile inter-skill dependencies. Dual path ensures discoverability from both CLI and skill contexts |

## Rejected Options

| DEC-ID      | Rejected Option                           | Reason                                                                                                                |
| ----------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| SD-0035-001 | CLI only for full-harness (no skill file) | Skill guidance is the primary discovery path for many users; CLI-only makes full-harness invisible to skill users     |
| SD-0035-001 | Stateful routing handshake between skills | Creates fragile dependency between standard and full-harness skills; direct invocation becomes second-class (DR-0085) |

## Referenced Policy Decisions

1 item referenced from `_policies/08_Decisions.md`:

- **DR-0085**: Routing reception is stateless. Full-harness skill initialization depends only on user-provided spec inputs; not on routing context. (Source: discussion-20260329195516830)
