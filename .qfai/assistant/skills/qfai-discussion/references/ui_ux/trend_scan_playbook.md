# UI/UX Trend Scan Playbook

Do not hard-code year-specific design trends into the core reference.
Use this playbook to research and translate current signals during each discussion run.

## Goal

Produce trend input that informs design direction without replacing product reasoning.

## Required Output Shape

When UI-bearing, `04_Sources.md` trend entries should capture:

- reference
- observation
- decision_connection
- evaluation_connection
- local_implication

## Required Research Categories

At minimum, check the categories that materially affect the surface:

- navigation patterns
- density and layout
- motion and transitions
- color and theming
- form interaction
- accessibility-sensitive interaction changes
- AI-assisted or multimodal interaction, if relevant
- platform release guidance, if the surface depends on native conventions

## Freshness Rules

- Prefer official platform guidance and recent primary sources.
- Treat trend claims as volatile unless supported by current evidence.
- If a claim is older or weakly supported, record it as low-confidence or omit it.

## Translation Rules

Do not stop at "this is trendy."
Always translate a reference into:

- whether it fits the product's users and task frequency;
- whether it improves or harms clarity;
- whether it changes the brand direction recorded in root `DESIGN.md`;
- whether it affects the screen contracts in `uiux/40_screen_contracts.md`;
- whether it should be adopted, adapted, or rejected.

## Rejection Rules

Reject a trend when:

- it conflicts with usability or accessibility floors;
- it depends on a platform convention the product does not have;
- it adds novelty without improving the core task;
- it increases cognitive load for a routine workflow;
- it is fashionable but weakly evidenced.

## Competitive Reference Registry Expectations

For each meaningful competitor or reference pattern, capture:

- what was adopted
- what was rejected
- how adopted ideas were translated locally

Avoid placeholders such as `TBD`, `N/A`, `TODO`, or empty values.

## Good Trend Scan Questions

- What behavior is actually becoming standard?
- Which surfaces are adopting it successfully?
- What problem does it solve?
- What tradeoff does it introduce?
- Should QFAI adopt it directly, adapt it, or explicitly reject it?
