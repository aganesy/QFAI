# uiux/ Sidecar Index

## Purpose

Manifest of all UI/UX sidecar artifacts produced during a UI-bearing discussion.

## File Inventory

Brand-level intent (product intent, brand signals, anti-goals,
reference pool framed as deviate-from inputs) is recorded in
`04_Sources.md`, not in this sidecar family. `/qfai-sdd`'s `common-design-md` step turns
that record into root `DESIGN.md` — on a visual-prototyping surface
(`web`, `mobile`, `desktop`, `mixed`) only. A cli-only pack has no
brand-level intent layer at all.

| File                      | Purpose                                  | Required |
| ------------------------- | ---------------------------------------- | -------- |
| 00_index.md               | This manifest                            | Yes      |
| 40_screen_contracts.md    | Screen interaction contracts (11 fields) | Yes      |
| 50_review_input_bundle.md | Review input bundle                      | Yes      |

## Completeness Rule

All three required files above must be present for every UI-bearing pack.
Partial generation is not permitted.

Root `DESIGN.md` is not one of them. `/qfai-sdd`'s `common-design-md` step authors it, and only
on a visual-prototyping surface (`web`, `mobile`, `desktop`, `mixed`). A
cli-only pack — `primary_surface: cli` with no visual surface in
`secondary_surfaces` — never gets one: the `common-design-md` step writes none, and
`/qfai-prototyping` does not run on `cli`. Do not report any pack as
incomplete for a missing `DESIGN.md`.
