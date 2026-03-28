# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID        | Level | AC-Refs      | EX-Ref       | Steps                                                                  | Expected                                                             | Notes                          |
| ------------ | ----- | ------------ | ------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------ |
| TC-0026-0001 | L3    | AC-0026-0001 | EX-0026-0004 | Run qfai-discussion on UI-bearing fixture, inspect uiux/               | 11 files present in uiux/ directory                                  | Sidecar completeness           |
| TC-0026-0002 | L3    | AC-0026-0002 | EX-0026-0006 | Validate uiux/10_strategy.md against schema                            | YAML parseable, version field present, schema v0.1 conformant        | Strategy schema                |
| TC-0026-0003 | L3    | AC-0026-0003 | EX-0026-0007 | Run qfai-discussion on non-UI fixture, check for uiux/                 | No uiux/ directory, no errors, 15 core files present                 | Non-UI skip                    |
| TC-0026-0004 | L3    | AC-0026-0013 | EX-0026-0001 | Provide surface: web-ui context, check classification                  | Classified as UI-bearing                                             | Surface classification: web-ui |
| TC-0026-0005 | L3    | AC-0026-0013 | EX-0026-0002 | Provide surface: non-ui context, check classification                  | Classified as non-UI                                                 | Surface classification: non-ui |
| TC-0026-0006 | L3    | AC-0026-0013 | EX-0026-0003 | Provide web endpoint context without UI components                     | Classified as non-ui (surface type, not interaction)                 | Surface classification: edge   |
| TC-0026-0007 | L3    | AC-0026-0004 | EX-0026-0008 | Read updated SKILL.md, check detection section                         | 5 surface categories documented                                      | SKILL.md detection section     |
| TC-0026-0008 | L3    | AC-0026-0005 | EX-0026-0009 | Run SKILL.md flow on UI-bearing, verify completion conditions          | All 4 conditions (strategy, scoring, anchor, contracts) required     | UI completion conditions       |
| TC-0026-0009 | L3    | AC-0026-0005 | EX-0026-0010 | Run SKILL.md flow on UI-bearing, skip strategy selection               | Completion blocked                                                   | Incomplete condition blocked   |
| TC-0026-0010 | L3    | AC-0026-0006 | EX-0026-0011 | Run SKILL.md flow on non-UI                                            | Same completion conditions as v1.7.2                                 | Non-UI completion unchanged    |
| TC-0026-0011 | L3    | AC-0026-0007 | EX-0026-0012 | Generate 03 template for UI-bearing, check primary section             | Behavior obligations is primary, not HTML mock                       | 03 behavior focus              |
| TC-0026-0012 | L3    | AC-0026-0008 | EX-0026-0013 | Generate 04 template with 2 competitive refs                           | Registry table with adopted/rejected/local_translation per entry     | 04 registry populated          |
| TC-0026-0013 | L3    | AC-0026-0008 | EX-0026-0014 | Generate 04 template with 0 competitive refs                           | Registry table exists but empty, no schema violation                 | 04 registry empty              |
| TC-0026-0014 | L3    | AC-0026-0009 | EX-0026-0015 | Generate 14 template for UI-bearing                                    | Sidecar review scope section present                                 | 14 sidecar scope               |
| TC-0026-0015 | L3    | AC-0026-0010 | EX-0026-0016 | Generate core templates with sidecar, check cross-refs                 | UX-INTENT comments link to uiux/ files                               | Cross-ref present              |
| TC-0026-0016 | L3    | AC-0026-0011 | EX-0026-0017 | Generate core templates without sidecar                                | UX intent placeholders empty/hidden, no broken links                 | Cross-ref degrade              |
| TC-0026-0017 | L3    | AC-0026-0011 | EX-0026-0018 | Generate core templates with partial sidecar (6/11)                    | Cross-refs for existing files, missing files noted                   | Partial sidecar                |
| TC-0026-0018 | L3    | AC-0026-0012 | EX-0026-0019 | Run qfai init on fresh project, check file presence                    | SKILL.md + 11 sidecar + 3 direct + augmented batch templates present | Init asset presence            |
| TC-0026-0019 | L3    | AC-0026-0012 | EX-0026-0020 | Run verify-pack after v1.7.3 changes                                   | All assets pass, zero errors                                         | verify-pack                    |
| TC-0026-0020 | L3    | AC-0026-0014 | EX-0026-0021 | Validate uiux/20_eval_axis_usability.md                                | Evaluation criteria and measurement approach present                 | Eval axis content              |
| TC-0026-0021 | L3    | AC-0026-0015 | EX-0026-0022 | Validate uiux/30_comparison.md                                         | 2+ options compared against scoring axes                             | Option comparison              |
| TC-0026-0022 | L3    | AC-0026-0001 | EX-0026-0023 | Validate uiux/40_contracts.md                                          | Anchor screen interaction contracts present                          | Screen contracts               |
| TC-0026-0023 | L3    | AC-0026-0002 | EX-0026-0024 | Check verbosity of uiux/10_strategy.md                                 | One complete example per artifact type, no verbose examples          | Minimal-but-complete           |
| TC-0026-0024 | L3    | AC-0026-0007 | EX-0026-0025 | Check 03 template HTML/CSS mock position                               | HTML/CSS mock is fallback option, not primary                        | Mock demotion                  |
| TC-0026-0025 | L3    | AC-0026-0003 | EX-0026-0026 | Run qfai-discussion twice on non-UI input                              | Identical output both times                                          | Idempotency non-UI             |
| TC-0026-0026 | L3    | AC-0026-0001 | EX-0026-0027 | Run qfai-discussion twice on UI-bearing input                          | Identical uiux/ output both times                                    | Idempotency UI-bearing         |
| TC-0026-0027 | L3    | AC-0026-0001 | EX-0026-0005 | Run qfai-discussion on UI-bearing fixture with insufficient disk space | IO error, no partial files written in uiux/                          | Partial write prevention       |
