# Surface Review Checklist

Read when the product-surface reviewer reviews a screen. Every round of every
screen walks the same items in the same order and reports each one, so two
rounds of the same screen cover the same ground and a gap in coverage shows.
The questions are short paraphrases; the source of each item is the authority.

## Contents

- How to walk it
- The report
- Screen completeness
- Usability heuristics
- Accessibility criteria
- Widget patterns

## How to walk it

- Walk every section below for each screen the review covers, in order, and
  every item inside a section. Do not skip an item because the request focused
  elsewhere.
- Answer each item against the rendered screen: the running app or the
  prototype. When only a UI contract is under review, answer what the contract
  can show, such as labels, error states and the widgets it names, and record
  the rest as not applicable with the reason `not rendered`.
- An item is a question, not a verdict. A "no" becomes a finding, filed under
  the route on the reviewer card that matches it, with that route's severity
  and trace.
- Where the accessibility test layer ran axe on the screen's route and passed,
  cite that run for what axe checks, such as contrast and missing names. Axe
  does not settle keyboard use, focus order, focus visibility or reflow: check
  those by hand.

## The report

One line per item, per screen, in the order of this list:

```text
<screen> | <item ID> | pass | <what was checked>
<screen> | <item ID> | finding | <finding reference>
<screen> | <item ID> | not applicable | <why the item cannot apply to this screen>
```

- `pass` names what was checked, such as the state, the viewport or the
  widget, so the next round can check the same thing.
- `finding` points at the finding written in the review, which carries its
  severity and trace.
- `not applicable` says why the item cannot apply, such as "no form on the
  screen" or "no image or icon that carries meaning". "Not checked" is not a
  reason: an item that could apply and was not checked is a gap in the review.
- An item ID is the one this list gives it. A widget item adds the widget, as
  in `APG dialog-modal: delete confirmation`.
- One defect is one finding. When it answers more than one line, such as an
  error shown only in red that fails `H9` and `WCAG 3.3.1`, every line it
  answers points at that one finding, and the finding takes the strictest
  severity any of those lines allows.

## Screen completeness

| ID      | Question                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FLOOR` | Does the screen have every part the business-screen list (or, for a marketing screen, the marketing-screen list) in `.agents/rules/interface-clarity.md` requires of it?        |
| `TYPE`  | Does the screen have every part its screen type's entry in the pattern catalogue lists, by the ID its UI contract's `pattern` key names (for a marketing screen, its sections)? |

These are the completeness checks the reviewer card already sets. Walk them as
the card says and report the result here as one line each; they are not walked
a second time. `TYPE` is not applicable on an application screen whose UI
contract names no `pattern`: the screen fits none of the catalogue's types.

## Usability heuristics

Source: Jakob Nielsen, "10 Usability Heuristics for User Interface Design",
Nielsen Norman Group. The heuristic names are that article's.

| ID    | Heuristic                                              | Question about the screen                                                                                                     |
| ----- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `H1`  | Visibility of system status                            | After each action, does the screen show soon and in place what happened: loading, saved, failed?                              |
| `H2`  | Match between the system and the real world            | Do labels, units, dates and order use the user's own terms and the domain's glossary, not internal names or codes?            |
| `H3`  | User control and freedom                               | Can the user cancel, go back or undo a step without losing work, and leave a dialog or flow they entered by mistake?          |
| `H4`  | Consistency and standards                              | Do the same words, controls and positions mean the same thing here as on the other screens and in the platform convention?    |
| `H5`  | Error prevention                                       | Does the screen stop a likely mistake before it happens: constrained input, a confirmation before a destructive action?       |
| `H6`  | Recognition rather than recall                         | Are the options, the current filters and the data a step needs visible, so the user does not have to remember them?           |
| `H7`  | Flexibility and efficiency of use                      | Can a frequent user do the frequent task quickly: sensible defaults, keyboard submission, bulk actions where lists need them? |
| `H8`  | Aesthetic and minimalist design                        | Does every element serve the task, with nothing competing with the primary action for attention?                              |
| `H9`  | Help users recognize, diagnose and recover from errors | Does each error say in plain words what went wrong, at the field or action it concerns, and how to fix it?                    |
| `H10` | Help and documentation                                 | Can the task be done without reading help, and is any help that remains found at the point of need and kept short?            |

`H8` and `H10` findings about explanatory copy or a needless control follow
the excess and copy routes on the reviewer card: the fix is the control, not
more text.

## Accessibility criteria

Source: Web Content Accessibility Guidelines (WCAG) 2.2, W3C Recommendation.
Each row names the success criterion by its number and title, which also
title the W3C's Understanding document for it; read that document when a
question leaves a case open. These are the level A and AA criteria a
business screen touches most often; they do not replace the full standard.

| ID            | Criterion                         | Question about the screen                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WCAG 1.3.1`  | Info and Relationships (A)        | Are headings, lists, tables, form groups and label-to-field links real markup, not only a visual style?                                                                                                                                                                                                                                                                                            |
| `WCAG 1.4.3`  | Contrast (Minimum) (AA)           | Does text, including text in images, reach 4.5:1 against its background, or 3:1 when it is large (18 point, or 14 point bold), in every state the screen shows? Text on a disabled control, decorative or incidental text, and logos are exempt.                                                                                                                                                   |
| `WCAG 1.4.10` | Reflow (AA)                       | At 320 CSS pixels wide, and for content that scrolls horizontally at 256 CSS pixels high, does the content read without scrolling in two directions, except a part such as a data table, map or diagram that needs both?                                                                                                                                                                           |
| `WCAG 1.4.11` | Non-text Contrast (AA)            | Does the visual information needed to identify a control or its state reach 3:1 against what is next to it: a border where the border is what shows the control, focus and selection indicators, and icons that carry meaning? A disabled control, and a control whose look the browser sets and the author left unchanged, are exempt.                                                            |
| `WCAG 2.1.1`  | Keyboard (A)                      | Can every action be done with the keyboard alone, with no timing needed between keys?                                                                                                                                                                                                                                                                                                              |
| `WCAG 2.4.3`  | Focus Order (A)                   | Does Tab move through the screen in an order that keeps its meaning, and does focus go somewhere sensible when a dialog or panel opens and closes?                                                                                                                                                                                                                                                 |
| `WCAG 2.4.7`  | Focus Visible (AA)                | Is the focused element always visibly marked?                                                                                                                                                                                                                                                                                                                                                      |
| `WCAG 2.4.11` | Focus Not Obscured (Minimum) (AA) | Does a sticky header, footer, banner or toast never hide the whole of the focused element?                                                                                                                                                                                                                                                                                                         |
| `WCAG 2.5.8`  | Target Size (Minimum) (AA)        | Is each pointer target at least 24 by 24 CSS pixels? A smaller target passes when a 24-pixel circle centred on it intersects no other target or another target's circle, when an equivalent control on the same page meets the size, when it sits inline in a sentence or block of text, when the browser sets its size and the author left it, or when its size is essential or legally required. |
| `WCAG 3.3.1`  | Error Identification (A)          | When input is rejected, is the field in error named and the error described in text, not by colour alone?                                                                                                                                                                                                                                                                                          |
| `WCAG 3.3.2`  | Labels or Instructions (A)        | Does every input have a visible label, with the format stated where one is required, and never a placeholder standing in for the label?                                                                                                                                                                                                                                                            |
| `WCAG 4.1.2`  | Name, Role, Value (A)             | Does every control expose its name, its role and its current state, such as expanded, selected or checked, to assistive technology?                                                                                                                                                                                                                                                                |

## Widget patterns

Source: WAI-ARIA Authoring Practices Guide (APG), W3C, its Patterns section.

List every interactive widget on the screen and add one item per widget, with
the ID `APG <slug>` and the widget's name. The slug is the pattern's path
segment under `/WAI/ARIA/apg/patterns/`, such as `dialog-modal` or `tabs`. The pattern for each common widget
is in `.qfai/assistant/rule/ui-procurement.md#widgets-that-are-not-hand-authored`;
for another widget, take the APG pattern whose description matches what it
does. For each one ask:

- **Keyboard.** Do the keys the pattern lists do what it says, such as Escape
  closing a dialog and arrow keys moving between tabs?
- **Roles, states and properties.** Does the widget carry the role and the
  `aria-*` states the pattern lists, and do they change as the widget does?
- **Focus.** Does focus move where the pattern says on opening and closing,
  and stay inside a modal while it is open?

A native element that does the whole job, such as `dialog`, `details` or
`select`, passes on the element's own behaviour; check only what the screen's
code adds to it. A screen with no interactive widget beyond links, buttons and
form fields records one line, `APG` as not applicable, with that reason.
