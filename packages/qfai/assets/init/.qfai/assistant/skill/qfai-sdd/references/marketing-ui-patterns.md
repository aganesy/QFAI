# Marketing UI Patterns

What a standard marketing page contains. A marketing screen is one a visitor
sees before signing in that exists to explain, persuade or inform: a home page,
an audience page, how it works, pricing, a guide, an about page with a contact
form, a legal notice. Its UI contract declares `surface: marketing`; a screen
that declares no `surface` is an application screen.

A UI contract lists what is specific to a page; this reference lists what a
section of its kind has anyway. The contract author, the implementer and the
screen reviewer read the same entry. The business-screen floor in
`.agents/rules/interface-clarity.md#what-a-business-screen-always-has` applies
to application screens, not to these; what every marketing screen has is
`.agents/rules/interface-clarity.md#what-a-marketing-screen-always-has`. The
entries are kinds of section, not an order: a page has the sections its reader
needs, in the order that reader decides in. A part of an entry counts as asked for
once the page's UI contract names it: the contract author writes it there or
records why the page leaves it out. Where a part comes from is
`.qfai/assistant/rule/ui-procurement.md`.

## Contents

- Every marketing page
- Hero
- Proof
- Audience page
- Feature section
- How it works
- Pricing table
- FAQ
- Final call to action
- Contact form
- Legal pages
- Images
- Using this reference

## Every marketing page

- **Purpose.** One reader and one next step per page, named in the contract's
  `purpose`.
- **Standard parts.** A site header with the sign-in and the primary call to
  action, and a footer with the legal pages and contact.
- **States.** `default` for the content; `error` and `success` only where the
  page sends something, such as a form. The page's `states` combine the states
  of its sections.

Anti-patterns: a claim nobody verified; a page that links to the application
with no way back to the site; a cookie or consent banner that hides refusal.

## Hero

- **Purpose.** Say what the product does, for whom, in the visitor's words.
- **Standard parts.** A headline, one supporting sentence, the primary call to
  action and at most one secondary action, and an image of the product or of
  its use.
- **States.** `default` only; `none` for the others, as it loads with the page.

Anti-patterns: a headline about the company rather than the visitor; three
equal buttons; an unlabelled product mock-up shown as the real product.

## Proof

- **Purpose.** Show that the product is used and works.
- **Standard parts.** Live figures read from the product, each with the time it
  was counted; customer names and quotes with the customer's permission
  recorded; a link to a case study where one exists.
- **States.** `default`; `loading` and `error` when a figure is read at view
  time, where an unreadable figure is left out rather than guessed.

Anti-patterns: a fake testimonial; an invented or rounded-up number; a figure
with no time it was counted; a logo shown without the customer's permission.

## Audience page

- **Purpose.** Answer one audience's question: is this for me, and what does it
  change for me.
- **Standard parts.** The audience named in the headline, their problem in
  their terms, the features that answer it, proof from the same audience, and
  the call to action.
- **States.** `default` only.

Anti-patterns: the home page copied with the audience name swapped in; a
feature list no member of the audience asked about.

## Feature section

- **Purpose.** Show what one capability does for the visitor.
- **Standard parts.** A heading that states the outcome, a short description,
  and an image or a demonstration of the capability, labelled as an example.
- **States.** `default` only.

Anti-patterns: a grid of icons with one-word labels; a capability the product
does not have yet shown as available; an unlabelled mock-up.

## How it works

- **Purpose.** Show the steps from sign-up to the first result.
- **Standard parts.** Three to five numbered steps, each with what the visitor
  does and what they get, and the call to action after the last one.
- **States.** `default` only.

Anti-patterns: steps that describe the architecture; a step count that hides a
manual onboarding; a "takes two minutes" nobody measured.

## Pricing table

- **Purpose.** Let the visitor choose a plan and know what they will pay.
- **Standard parts.** Each plan's name, price, billing period and currency,
  whether tax is included, what it includes and its limits; the plan
  recommended for most visitors marked as such; how to cancel; a contact for a
  plan the table does not fit.
- **States.** `default`; `loading` and `error` when prices are read at view
  time.

Anti-patterns: dark patterns, such as a monthly price shown for a plan billed
yearly, a trial that turns into a charge with no notice of when, a
pre-selected add-on, or a cancel path harder than the sign-up; a recommended
plan chosen to maximise revenue rather than fit.

## FAQ

- **Purpose.** Answer the questions that stop a visitor from acting.
- **Standard parts.** Questions taken from what visitors and customers asked,
  each with a short answer and a link to the detail.
- **States.** `default` only.

Anti-patterns: questions nobody asked, written to repeat the features; an
answer that hides a cost or a limit.

## Final call to action

- **Purpose.** Give the visitor who read to the end the one next step.
- **Standard parts.** A one-line restatement of the outcome and the primary
  call to action, the same as the hero's.
- **States.** `default` only.

Anti-patterns: a call to action different from the hero's; urgency nobody can
back, such as a countdown that restarts.

## Contact form

- **Purpose.** Let a visitor reach the people behind the product.
- **Standard parts.** The fewest fields the reply needs, each labelled; what
  happens to the message and when to expect a reply; consent to the privacy
  policy where the jurisdiction requires it; protection from spam that does
  not block people.
- **States.** `default`, `error` with what to fix and the entries kept, and
  `success` with what happens next; `loading` while it sends, which cannot be
  sent twice.

Anti-patterns: a field the reply does not need; a pre-ticked marketing
consent; a success message with no reply time.

## Legal pages

- **Purpose.** Publish the notices the jurisdiction requires before a visitor
  signs up or pays.
- **Standard parts.** The notices the jurisdiction requires, such as the
  specified commercial transactions notice where the business sells online in
  Japan, a privacy policy and the
  terms of service; each with its effective date, linked from the footer of
  every page and from the point of sign-up or payment.
- **States.** `default` only.

Anti-patterns: a notice copied from another business; a policy with no
effective date; a notice reachable only from one page; a legal text the owner
has not approved.

## Images

- **Source and licence.** Each image records where it came from and the licence
  it is used under, in the page's UI contract or beside the image file. An
  image with neither is not used.
- **Examples labelled.** A product image or mock-up that shows made-up data, or
  a screen the product does not have yet, is labelled as an example where it is
  shown.
- **Text alternative.** Each image that carries information has a text
  alternative that says it; a decorative image has an empty one.

## Using this reference

- **Writing a UI contract.** For a `surface: marketing` screen, name the entry
  for each section of the page here, then write the parts it needs into the
  contract, with the reason for a part it leaves out.
- **Implementing.** Build what the contract names. A part of an entry that the
  contract neither names nor excludes with a reason is drift: raise it to the
  contract stage under `.qfai/assistant/rule/drift-protocol.md` instead of
  building it.
- **Reviewing a page.** A part of its entry that is missing with no recorded
  reason, an anti-pattern listed here, or an image with no source and licence
  is a finding against the page, named with the part and the entry.

A section that fits no entry here still gets the parts under "Every marketing
page".
