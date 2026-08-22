# UI/UX Best Practices Reference (QFAI Discussion Pack)

This file is the compact, durable core for `qfai-discussion`.

It is intentionally not an encyclopedia. Keep this file short, decision-oriented, and stable.
Move volatile or bulky detail into the `ui_ux/` sidecar references and research current material at run time.

## Why This File Is Compact

- OpenAI recommends versioned prompts, variables, concise examples, and eval-backed iteration rather than piling all guidance into one prompt.
- Anthropic recommends clear structure, templates and variables, XML-style separation, and simpler prompts when latency or cost matters.
- For this skill, that means:
  - keep fixed guidance here;
  - keep changing details out of the core;
  - use appendices only when the task needs them;
  - prefer checklists and schemas over long prose.

## How To Use This Reference

1. Read this file first for durable decision rules.
2. Open only the appendix you need:
   - `ui_ux/platform_baselines.md`
   - `ui_ux/review_audit_playbook.md`
   - `ui_ux/trend_scan_playbook.md`
3. For trends, platform release details, or fast-moving conventions, do web research during the current discussion run and cite sources in `04_Sources.md`.

## Core Decision Rules

### 1. Optimize for the discussion artifact, not for generic design theory

- Produce design direction that is specific enough for downstream SDD, prototyping, and review.
- Prefer behavior obligations, states, contracts, and tradeoffs over aesthetic commentary.
- Do not duplicate finalized spec text; capture rationale, decisions, options, and reviewable constraints.

### 2. Start from user goals and flow risk

- Each key screen should have one clear primary action.
- Users must always know:
  - where they are;
  - what changed;
  - what they can do next;
  - how to recover.
- Model negative paths, empty states, loading states, error states, and permission/state-transition cases early.

### 3. Prefer recognition over recall

- Keep labels plain and domain-native.
- Surface context, recent state, and next-step cues.
- Do not rely on hidden gestures, ambiguous icons, or memory-heavy workflows.

### 4. Prevent errors before explaining them

- Use safe defaults.
- Constrain inputs.
- Separate destructive actions from common actions.
- Preserve user input on failure.
- Only use confirmations for destructive or hard-to-reverse actions.

### 5. Keep interaction hierarchy obvious

- One primary action per visible context.
- Secondary and destructive actions must be visually and positionally distinct.
- Progressive disclosure is preferred over dumping all options at once.

### 6. Make system state legible

- Direct manipulation should feel immediate.
- Long-running work must show progress or scoped loading feedback.
- Success, warning, and error states should say what happened and what to do next.

### 7. Respect platform expectations

- Preserve the same conceptual model across platforms.
- Adapt interaction patterns to the platform instead of forcing pixel-identical UI.
- If you break a platform convention, record why and what benefit outweighs the cost.

### 8. Accessibility is a floor, not a polish pass

- Keyboard reachability, focus visibility, color contrast, readable copy, reduced-motion support, and non-color cues are baseline requirements.
- Custom interaction patterns need an accessible alternative.
- Any action achievable by drag/gesture should also be achievable by a simpler pointer or keyboard action when applicable.

### 9. Performance affects trust

- Avoid loading patterns that block the whole surface without need.
- Prefer scoped loading, skeletons, reserved layout space, and predictable transitions.
- Reduce layout shift, accidental taps, and dead time after user actions.

### 10. Reject manipulative UX

- Treat dark patterns as critical violations.
- Flag confirmshaming, hidden costs, forced continuity, privacy-hostile defaults, obstruction, and misdirection immediately.

## QFAI-Specific Authoring Guidance

### Use root `DESIGN.md` plus the canonical sidecar family as the design SSOT for UI-bearing work

Brand-level direction is no longer authored as sidecars. For UI-bearing
packs it resolves through:

- brand SSOT (product intent, brand signals, anti-goals, deviate-from reference pool):
  `<consuming-project-root>/DESIGN.md` (front-matter tokens + `# Brand Philosophy` body)
- sidecar manifest: `uiux/00_index.md`
- screen behavior contracts: `uiux/40_screen_contracts.md`
- review handoff: `uiux/50_review_input_bundle.md`

Those three are the entire canonical sidecar family. Evaluation axes are global constants
(4-step ordinal: weak / acceptable / strong / exceptional) fixed by the review validation the
QFAI CLI applies — not by any file in this tree. The shipped
`.qfai/assistant/skills/qfai-prototyping/references/reviewer-prompt.md` restates that axis set
for the reviewer prompt; editing it does not change the set the CLI accepts. Axes are not
authored as discussion sidecars. Discussion is planner-first: it carries exploration directions
unranked and does not select a single visual winner, so there is no strategy, taste-interview, scoring,
override, option-comparison or selected-anchor sidecar. Do NOT create
`10_implementation_strategy.md`, `11_design_taste_interview.md`, the `20-24`
design-evaluation family, `30_option_comparison.md`, or `31_selected_anchor_screen.md` —
those filenames are forbidden, see `templates/uiux/00_index.md#Forbidden Legacy Files`, and
creating them fails validation.

### What must be explicit in the discussion pack

- why this design direction exists
- which options were considered
- why rejected options were rejected
- which screen anchors the direction
- what users can do on each key screen
- how default/loading/empty/error states behave
- where accessibility or platform constraints shape the design
- where uncertainty still exists and how it is tracked in OQ

### What belongs in `04_Sources.md`

- stable source traceability for all important UI/UX decisions
- trend scan findings translated into local design implications
- competitive references with:
  - adopted points
  - rejected points
  - local translation
- freshness-aware research for volatile topics

### What belongs in `99_delta.md`

- meaningful direction changes
- rejected visual directions
- recurrence prevention when a rejected idea comes back

## Compact Review Checklist

Use this as the first-pass gate before deeper review.

### Flow and clarity

- Is the primary user goal obvious on each key screen?
- Is there one clear primary action per context?
- Can the user move forward, back, or recover from failure?
- Are navigation and orientation cues explicit?

### States and behavior

- Are default, loading, empty, error, and success behaviors explicit?
- Are destructive actions reversible or strongly guarded?
- Are permissions, role differences, or state transitions captured where relevant?

### Platform fit

- Does the design follow the target platform's navigation and input conventions?
- Are any deliberate deviations documented with rationale?

### Accessibility and resilience

- Can a keyboard or equivalent non-gesture path complete the task?
- Are focus, contrast, labels, and feedback adequate?
- Is reduced motion respected where motion exists?

### Quality of the pack itself

- Are decisions concrete rather than generic?
- Are comparisons and rejections traceable?
- Can prototyping and SDD proceed without guessing the intended UX?

## When To Open The Appendices

Open `ui_ux/platform_baselines.md` when you need:

- touch target sizes
- breakpoint heuristics
- platform navigation baselines
- dark mode and cross-platform adaptation notes

Open `ui_ux/review_audit_playbook.md` when you need:

- heuristic review structure
- anti-pattern checklists
- screen-spec documentation rules
- audit/testing guidance

Open `ui_ux/trend_scan_playbook.md` when you need:

- trend-scan category coverage
- freshness and citation rules
- how to translate references into local decisions
- how to keep trends from overwhelming product-specific needs

## Anti-Bloat Rules For Future Edits

- Do not add long font-scale tables, full platform encyclopedias, or year-stamped trend lists to this file.
- Do not store fast-changing "current trend" claims here unless they are rewritten as a research procedure.
- Do not repeat the same concept across multiple theoretical frameworks unless the duplication changes an actual QFAI decision.
- Prefer one sharp rule plus a short verification cue over paragraph-heavy explanation.
- If a section is mostly lookup material, move it to an appendix.

## Appendix Index

- [Platform Baselines](ui_ux/platform_baselines.md)
- [Review Audit Playbook](ui_ux/review_audit_playbook.md)
- [Trend Scan Playbook](ui_ux/trend_scan_playbook.md)
