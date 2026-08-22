# UI-bearing Playbook

Use this file when `/qfai-discussion` needs the full UI-bearing decision logic.

## Classification Rule

- Classify by surface type, not by interaction complexity.

## Surface Mapping

| Surface | UI-bearing | Result                                                                                                                                             |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| web     | Yes        | Generate full uiux sidecar family                                                                                                                  |
| mobile  | Yes        | Generate full uiux sidecar family                                                                                                                  |
| desktop | Yes        | Generate full uiux sidecar family                                                                                                                  |
| cli     | Yes        | Generate the canonical uiux sidecars (`00_index.md`, `40_screen_contracts.md`, `50_review_input_bundle.md`); no root `DESIGN.md` visual token tree |
| mixed   | Yes        | Generate full uiux sidecar family                                                                                                                  |
| non-ui  | No         | Skip uiux sidecars                                                                                                                                 |

## Detection Signals

- Explicit classification in `01_Context.md`
- UI-oriented stories in `03_Story-Workshop.md`
- Mermaid screen flows
- HTML or visual structure hints as supporting signals only

## Sidecar Family SSOT

For UI-bearing packs on a visual-prototyping surface the brand SSOT is root
`DESIGN.md` (drafted by `/qfai-discussion` and frozen by `/qfai-sdd` Phase 0
into `.qfai/contracts/design/DESIGN.md.lock.yaml`). The remaining sidecars are
the screen-level UX inputs:

- `uiux/00_index.md`
- `uiux/40_screen_contracts.md`
- `uiux/50_review_input_bundle.md`

### Visual-prototyping Surfaces vs `cli`

Visual-prototyping surfaces are `web`, `mobile`, `desktop` and `mixed` — the
surfaces `/qfai-prototyping` actually executes. Root `DESIGN.md` and its
`visual.*` token tree are required **only** when the pack targets one of
them: the sole consumer of the token values is the prototyping loop's
DESIGN.md drift scanner, and that loop rejects `cli`.

**Judge the whole classified surface set, not `primary_surface` alone.**
`secondary_surfaces` accepts every UI-bearing surface, so
`primary_surface: cli` with `secondary_surfaces: [web]` still ships a visual
surface and still needs the token SSOT. The carve-out applies only to a
**cli-only** pack: `primary_surface: cli` with no visual surface anywhere in
`secondary_surfaces`.

A cli-only pack stays `ui_bearing: true` and keeps all three screen-level UX
inputs above — those have downstream readers. It must NOT be blocked on
inventing brand colors, font stacks, a type scale, spacing tokens, radii or
shadows:

- Do not author root `DESIGN.md` for a cli-only pack. `/qfai-sdd` Phase 0
  skips the DESIGN.md freeze for it, and nothing on the `cli` path reads a
  token value.
- Screen contracts stay mandatory, including their `route:` field, which on
  `cli` names the command invocation (e.g. `route: myapp deploy --dry-run`)
  instead of a web path. `templates/uiux/40_screen_contracts.md` carries the
  per-surface `route:` meanings.
- No `prototyping.yaml`: `cli` is not a valid prototyping execution surface,
  so a recommendation naming it cannot be executed downstream.
- `templates/uiux/00_index.md` carries the same carve-out: the three sidecars
  are the whole family for a cli-only pack, with no root `DESIGN.md` beside them.
- Downstream, `/qfai-implement`'s Visual Review Guard drops the four
  design-contract inputs (root `DESIGN.md`, its lock, `design-system.yaml`,
  `prototype-handoff.yaml`) and both prototype-evidence inputs for a cli-only
  target, leaving `.qfai/contracts/ui/*.yaml` as its UI contract input.

### Trend Scan SSOT

Trend Scan is **not** a sidecar file. Trend Scan lives at
`04_Sources.md#Trend Scan` (part of the core 15-file discussion pack).
The legacy `uiux/20_trend_scan.md` template and the whole `uiux/20-24`
design-evaluation family were removed; evaluation axes are now global
constants and are not authored as discussion sidecars. UI-bearing
completion checks read Trend Scan from `04_Sources.md`.
