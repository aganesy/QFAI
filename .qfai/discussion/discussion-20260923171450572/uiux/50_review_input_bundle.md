# Review Input Bundle

## Purpose

Consolidate all sidecar artifacts into a review-ready bundle for design reviewers.

A **cli-only** pack (`primary_surface: cli`, no visual `secondary_surfaces` entry) still
ships this bundle. It has no brand direction to record and no `prototyping.yaml`, so mark
those two rows `n-a: cli-only pack` rather than leaving the bundle incomplete — see
`references/ui-bearing-playbook.md#visual-prototyping-surfaces-vs-cli`.

This pack is cli-only (`../01_Context.md` `## UI-bearing Classification`). The reviewer for its surface is `product-surface-reviewer` (`../01_Context.md` `## Stakeholders`).

## Bundle Contents

| Artifact                   | Path                          | Status             |
| -------------------------- | ----------------------------- | ------------------ |
| Design direction           | `../04_Sources.md`            | n-a: cli-only pack |
| Screen contracts           | `uiux/40_screen_contracts.md` | draft              |
| Prototyping recommendation | `../prototyping.yaml`         | n-a: cli-only pack |

Inputs the screen contracts trace to, read with them:

| Input                     | Path                                 | What the reviewer checks against it                                                                                                                                                                 |
| ------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functional requirements   | `../06_REQ.md`                       | Every operator-facing REQ has a screen, and no screen adds a flow no REQ asks for                                                                                                                   |
| Non-functional targets    | `../07_NFR.md`                       | NFR-0007, NFR-0008, NFR-0012 and NFR-0017 are testable on the screens                                                                                                                               |
| Deferred questions        | `../13_Deferred.md`                  | A screen that depends on OQ-0002, OQ-0003, OQ-0007, OQ-0010, OQ-0011 or OQ-0017 cites it rather than deciding it                                                                                    |
| Settled decisions         | `../99_delta.md` `## Change History` | D5, D7, D9, D10, D15 and D16 hold on the screens that carry them. The README rewrite (D16, REQ-0067) uses the words SCR-001, SCR-004 and SCR-014 use: "continue", "stop", `off`, `shadow`, `active` |
| What may appear on screen | `.agents/rules/interface-clarity.md` | No text explains a control; no internal identifier reaches the operator                                                                                                                             |
| The form of a question    | `.agents/rules/user-questions.md`    | SCR-002 and SCR-003 give each choice its consequence, a selection count, a recommendation where one is permitted, and the plain-text fallback                                                       |

## Trend-derived review focus

- Required references are all present and complete.
- Stale / overused AI slop patterns are explicitly avoided.
- Reference research is translated into local design decisions in the `04_Sources.md` registries (visual-prototyping surfaces) and on screen contracts (every UI-bearing surface). A cli-only pack records no brand direction: the screen contracts carry the whole translation.
- Iteration handling follows the one-lineage rule in `qfai-prototyping/SKILL.md`: no parallel
  candidates and no best-of-history — the latest iteration is the accepted one. A middle iteration
  that looked stronger is addressed by pivoting the next cycle, not by reaching back for it.

For this pack the focus is the patterns a terminal agent surface drifts into:

- a confirmation question after a request that already authorized the work (SCR-001 asks none);
- a question for a fact the repository holds (SCR-003 asks only for facts the operator alone holds);
- a success word on a run that is not complete (SCR-005 reserves "done" for `qfai_done`; SCR-004 never uses it);
- human-readable text mixed into a machine stream (the `npx qfai workflow` screens keep stdout to one JSON document);
- a stage skill quietly doing the work itself when it was selected with no work order (SCR-006).

## Review Checklist

- [ ] The recorded design direction aligns with surface type and project constraints (skip on a cli-only pack, which records none)
- [ ] Reference pool is complete and translated into local design decisions
- [ ] Evaluator scoring covers all four canonical UX axes (information architecture / navigation flow / usability / functionality) — fixed by the review validation the QFAI CLI applies (restated in `.qfai/assistant/skills/qfai-prototyping/references/reviewer-prompt.md`)
- [ ] One-lineage handling is explicit (latest iteration accepted; no best-of-history)
- [ ] Screen contracts cover all required states
- [ ] Every screen's `route:` follows the one convention stated in `40_screen_contracts.md` `## Purpose`
- [ ] `40_screen_contracts.md` `## Directions Carried Unranked` prefers no direction, and each row names where it is chosen
- [ ] The NFR-0012 checks for the `status`, `awaiting_input` and `blocked` reports are in SCR-012 `notes_for_verify`

On this pack the four axes are read against the terminal surface: information architecture is what each screen shows and in what order; navigation flow is the path from SCR-001 to SCR-005 through the questions and halts; usability is whether the operator can act on each screen without reading it twice; functionality is whether each screen's observable outcomes are testable. No prototyping iteration exists, so the one-lineage item is satisfied by there being one draft.
