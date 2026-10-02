---
name: discussion-pack
owner: qfai-discussion
purpose: "Author the discussion pack from what the interview settled."
requires: []
roles:
  [
    requirements-analyst,
    solution-architect,
    product-experience-architect,
    completion-reviewer,
    requirements-reviewer,
    architecture-reviewer,
  ]
routing-profile: requirements-heavy
---

# discussion-pack

Writes the pack a downstream stage takes the design from. Artifact files, not
conversational summaries, are the handoff.

## Precondition

**Authoring the pack** does not start until the session has ended. This run's
stage evidence holds the `## Grilling Session` row, its `Ended at` is written,
and `Ended` is `confirmed`, `user-closed` or `no-question`. Without that row,
or with `Ended: stopped`, write no pack file and stop. A pack drafted
mid-session records a design that was still being decided, and the draft is
what the rest of the run then defends.

## Reads

- The research summary and the `## Grilling Session` row in
  `.qfai/evidence/discussion-<YYYYMMDDhhmmssSSS>.md`.
- `.qfai/assistant/skill/qfai-discussion/references/discussion-artifact-rules.md`
  for the pack's fixed file set and naming.
- The templates under `.qfai/assistant/skill/qfai-discussion/templates/`.

## Writes

Under `.qfai/discussion/discussion-<YYYYMMDDhhmmssSSS>/`, opened under the
stage evidence's stamp:

- `01_Context.md` to `10_Policy.md`;
- `14_Review-Request.md` and `99_delta.md`;
- `prototyping.yaml`, only where step 8 below calls for it.

Discussion authors no design artifact outside its own pack. Its run also writes
this stage's evidence and the cycle's review pack, which record what the run
did rather than specify anything. The brand SSOT — root `DESIGN.md` — is
authored by `/qfai-sdd`'s `common-design-md` step from what this pack records: the
classification in `01_Context.md`, the reference registries in `04_Sources.md`,
and the `uiux/` sidecars. Root DESIGN.md is not a discussion output.

## Procedure

1. Open the pack and carry the research summary into the `## Research Summary`
   section of `04_Sources.md`, then register source traceability there.
2. Run the Inception Deck in `02_Inception-Deck.md`, with at least one Mermaid
   diagram.
3. Run the Story Workshop in `03_Story-Workshop.md`: user stories and user
   flows, with at least one Mermaid diagram. Behavior obligations are primary;
   an HTML+CSS mock is an optional fallback only. Where a mock includes links,
   author them in anchor-form (`<a href="#name">`); external `http(s)://` links
   are also allowed. A same-origin absolute path (`/orders/`) is not: a static
   mock cannot serve it and the validator rejects it (QFAI-MOCK-010).
4. Capture scope, REQ, NFR, glossary, constraints, and policies in `05_Scope.md`
   to `10_Policy.md`.
5. Run Example Mapping per
   `.qfai/assistant/skill/qfai-discussion/references/example-mapping-guide.md`
   and capture `Example Seeds`.
6. Record each decision the session settled, and each option it turned down, in
   `99_delta.md` as
   `.qfai/assistant/skill/qfai-discussion/references/oq-and-deferred-rules.md#where-a-grilling-sessions-outcome-goes`
   sets out.
7. Record the design direction settled in the interview — the chosen theme and
   the design-DNA answers behind it — in `01_Context.md#Design Direction`. The
   choice is made in the session, not here; this step writes it down. Required
   when any classified surface — primary or secondary — is `web`, `mobile`,
   `desktop` or `mixed`; skip for cli-only and non-ui targets. The answers, not
   a rendered brand file, are the handoff.
8. Generate `prototyping.yaml` only for a visual prototyping surface; a cli-only pack emits none.
   Write it where the pack targets `web`, `mobile`, `desktop` or `mixed` and an
   explicit prototyping recommendation is useful. `/qfai-prototyping` rejects
   `cli`.
9. Write `14_Review-Request.md` as its template sets out.

### UI-bearing packs

Decide whether the target is UI-bearing with
`.qfai/assistant/skill/qfai-discussion/references/ui-bearing-playbook.md`.

- In `04_Sources.md#Exploration Direction Inputs`, record product intent and
  must-keep interactions. On a visual-prototyping surface, also record brand
  signals and differentiation targets from the interview. Give each recorded
  statement a `SRC-ID` or a precise interview decision reference. Keep a
  missing value blank, mark it `missing`, and add an open question; do not
  treat that row as completed. A cli-only or non-UI inapplicability needs a
  reason and the `01_Context.md` surface classification.
- In `04_Sources.md#Design Anti-Goals`, record each rejected direction, why it
  was rejected, a concrete cue for its recurrence, and its decision or source.
  If none has been established, keep the row `missing` and ask through the
  session; do not manufacture an anti-goal or its evidence.
- On a visual-prototyping surface, `04_Sources.md` carries both reference
  registries, each entry naming what was adopted, what was rejected, and how it
  was translated. Competitor references are **deviate-from** inputs, not
  imitate-this; catalogue references are adopt-from. Together they are what
  `/qfai-sdd`'s `common-design-md` step turns into root `DESIGN.md` front matter and
  its `# Brand Philosophy` body, so an entry left blank leaves a brand field
  with nothing behind it. A registry `reference` resolves to a URL, repository
  path, or `SRC-ID`.

Discussion is planner-first: carry the screen explorations unranked and do not
finalize the design system here. The brand direction is the exception — which
published theme the product is built on is the user's decision, and there is no
later stage where they are asked.

## Gate

The reviewer confirms:

- each repository fact the pack states names where it was read, precisely
  enough to open: a file and a heading, a file and a line or a symbol where the
  file has no headings, or a command and its observed output. Read that source
  and verify the claim rather than treating a citation as proof;
- the `## Research Summary` section of `04_Sources.md` is filled from an actual
  protocol run: `sources`, `best_practices`, `anti_patterns`, and `reflection`
  with at least one `action: apply`;
- `02_Inception-Deck.md` and `03_Story-Workshop.md` include Mermaid diagrams;
- a UI-bearing pack has source-backed product intent and must-keep interactions
  in `04_Sources.md`; a visual-prototyping pack also has brand signals,
  differentiation targets, both reference registries complete, and any rejected
  direction with a reason and recurrence cue. No `missing` row passes, and
  every `not applicable` row carries its classification or decision reference;
- the pack stayed planner-first and did not choose a single visual winner;
- the context, the Inception Deck and the Story Workshop follow from one
  another;
- `06_REQ.md` and `07_NFR.md` keep their boundary;
- the glossary, constraints and policies are enough for the stages that read
  them;
- `99_delta.md` keeps the reason behind each adopted and rejected decision.
