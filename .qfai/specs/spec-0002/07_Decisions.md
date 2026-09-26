# 07 Decisions

## Decisions

### DR-0002-0001: discussion is planner-first

- Date: 2026-04-23
- Context: fixing a screen exploration or the design system in discussion confines prototyping to local improvement
- Adopted: discussion is the planner phase that defines exploration conditions, anti-goals, rubric, calibration and screen contracts, and it carries the screen explorations unranked. The brand direction is outside this rule: the user chooses it during discussion, and `/qfai-sdd` Phase 0 authors root `DESIGN.md` from it
- Why: design breakthroughs come from exploring and comparing in prototyping, and no stage after discussion asks the user for the brand
- Related: CR-20260912-0003

### DR-0002-0002: exploration-first sidecar family を canonical とする

- Date: 2026-04-23
- Context: 旧 sidecar family は comparison / single-winner selection / legacy evaluation sidecar に強く依存していた
- Adopted: `30_exploration_brief`, `31_reference_pool`, `32_design_anti_goals`, `33_exploration_rubric`, `34_evaluator_calibration`, `40_screen_contracts`, `50_review_input_bundle` を canonical とする
- Why: planner inputs と prototyping evaluation inputs を直接つなげられるため

### DR-0002-0003: discussion fixes no screen exploration and no design system

- Date: 2026-04-23
- Context: fixing one screen exploration, or the design system, in discussion contradicts exploration-first prototyping
- Adopted: prototyping ranks the screen explorations, no `selected-direction.yaml` is written, and `design-system.yaml` is mirrored from root `DESIGN.md` after the loop. The brand direction the user chooses in discussion is what `/qfai-sdd` Phase 0 authors `DESIGN.md` from, not a winner discussion selects
- Why: to avoid early convergence and keep the exploration open
- Related: CR-20260912-0003
