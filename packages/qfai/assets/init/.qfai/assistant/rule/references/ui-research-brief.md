# UI Research Brief

Read when research covers a UI with a screen type or a component the project
does not have yet: a list, a detail, a form, a settings screen, a dashboard, a
date picker, a data table and the like.

The visual reference survey answers which visual direction to take. This brief
answers what a screen type or component contains: its parts, its states, its
behaviour and what a user of it expects. Research that skips the brief drifts to
inspiration sites and reports visual moods, while the screens it serves still
lack their parts.

The brief extends `.qfai/assistant/rule/research-first-protocol.md`. Every
source an entry rests on is one of the summary's `sources`, and every rule of
that protocol still applies.

## Axes

Fill one entry per axis for each new screen type or component.

1. **Pattern.** How two or three maintained design systems specify it: its
   anatomy, its states and its behaviour. A product screenshot is not a source
   for this axis.
2. **Accessibility.** The WAI-ARIA Authoring Practices pattern for each
   interactive widget it holds, and the WCAG 2.2 success criteria it touches.
3. **Catalogue.** Whether the adopted component catalogue has the block or
   component, under its exact name and version.
4. **Domain analogues.** One or two products in the same business domain, read
   for which information their users expect to find. Never a visual direction:
   the brand departs from them, it does not copy them.
5. **Framework idioms.** How the project's framework, at its installed version,
   expects this UI to be built.
6. **Locale.** The input, formatting and typography conventions of the
   project's language.

Axes 3, 5 and 6 are recorded as not applicable, with that reason, until the
project has a catalogue of screen patterns, framework guidance and locale
guidance to check them against.

## Record

```yaml
ui_research_brief:
  - subject: string # the screen type or component, such as "list" or "date picker"
    axes:
      - axis: pattern | accessibility | catalogue | domain-analogues | framework-idioms | locale
        finding: string # what it contains, in the analyst's own words
        source_ids: [string] # the summary's sources it rests on
        not_applicable: string # instead of finding and source_ids: why the axis does not apply
```

- Each subject has one entry for each of the six axes: a finding with its
  sources, or `not_applicable` with its reason. An axis left out is a gap the
  research has not closed.
- A finding is checked against the repository before it is applied, as the
  protocol's rule for an external source says.
- The brief is reported with the research summary and stored where the summary
  is stored.
