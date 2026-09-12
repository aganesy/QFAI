# Interface Clarity

What may appear on an interface.

`documentation-clarity.md` settles what an agent writes about the work. This
settles what it puts in front of a user. Left to itself an agent makes the same
failure in both media: a paragraph introducing the page, a hint under every
field, a tooltip on a button whose label already says what it does, and every
parameter the thing underneath happens to expose.

The user arrived to do one task and has read nothing about the product. Leave
what that person needs, and nothing else.

## Scope

Not the web alone. A command-line tool has an interface too.

| Surface               | What this rule reads                                     |
| --------------------- | -------------------------------------------------------- |
| Screens, views, pages | Labels, copy, controls, states, grouping, hierarchy      |
| Terminal output       | Help text, prompts, progress, error and success messages |

Two questions this rule does not answer: where a component or a layout comes
from, and how much code implements it. `## Related` names the documents that do.

## 1. Do not surface the mechanism

The interface names what the user is doing, not what the code is doing. A field
takes its label from the user's word for the thing, never from the parameter it
fills.

Out: internal identifiers, model and table names, request shapes, retry counts,
flags, and every knob a library underneath exposes because it exposes it.

A setting earns a control when someone needs to change it, not when it exists.

## 2. Do not explain the interface

> Do not use help text to explain the interface. If you have to do that, you've
> made your service too complicated.
>
> — GOV.UK Design System, hint text

This is the clause that decides the hard cases. Text explaining how to work a
control is a defect report against that control. Fix the control and delete the
text.

Hint text survives only where all three hold.

1. A need was demonstrated — someone got it wrong without it.
2. The control was improved first, and the need remained.
3. It is a few words, one sentence at most.

Longer than a sentence means the question needs clarifying or splitting, not
explaining.

An introductory paragraph, a tour on first run and an empty state that says the
list is empty are the same clause. An empty state says what to do next.

## 3. Cut

- A label that restates the control beside it.
- A control nobody asked for, and every state it brings with it.
- Decoration that displaces signal.
- The second place the same thing is said.

The test is the one `documentation-clarity.md` uses. Remove it, and ask whether
the user is worse off. If not, it goes.

## 4. Use the conventional pattern

- One primary purpose per view. A view answering two questions is two views.
- The pattern the platform already has, in the place users look for it.
- One word per concept — the user's word — everywhere it appears.

A novel interaction has to beat the familiar one by enough to pay for being
learned. Most do not.

## 5. Show the structure

Order and grouping carry what a sentence would otherwise have to state.

- The primary action is visually primary, and there is one of it.
- Related fields sit together, unrelated ones apart.
- Steps read in the order they are performed.
- The rare case sits behind a disclosure rather than lengthening the common one.

## 6. Walk it

Before calling a surface done, perform every task it declares, start to finish,
as someone who does not know how it is built. Anything you have to read twice is
a defect in the control it sits under.

## What this rule never removes

Cutting stops here. None of these is excess at any size.

- **The label.** WCAG 3.3.2 requires a label for every form input, and a
  placeholder standing in for one is a documented failure. The label names the
  control; an explanation apologises for it. This rule deletes the second and
  protects the first.
- Accessible names, roles and states, and a focus order that follows the reading
  order.
- Error text that says what went wrong and what to do about it.
- A confirmation before anything the user cannot undo.
- Anything the spec asks for.

## Related

- The same standard for prose: `documentation-clarity.md`
- How much code implements it, whatever the medium: `minimal-implementation.md`
- Where the UI definition a screen implements is read from:
  `.qfai/assistant/catalog/ui-definition-protocol.md`
- Where a screen's components and layouts come from:
  `.qfai/assistant/catalog/ui-procurement.md`
