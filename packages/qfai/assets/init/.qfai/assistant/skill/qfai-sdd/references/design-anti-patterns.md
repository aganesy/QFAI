# Design Anti-Patterns

The patterns that mark a screen as generated. A model given no design direction
falls back on the same few defaults whatever the product is, and these are the
ones people name when they recognise a generated interface.

Each pattern suits some brief. It is a defect when it appears because it is a
default, not because the brand direction the discussion pack recorded asks for
it. An instruction to avoid "a generic look" only swaps one default for another;
naming the pattern is what works.

## Contents

- Using the list
- Where the list stops
- Color and background
- Typography
- Iconography and imagery
- Surfaces
- Components
- Layout and composition
- Placement
- Motion and transitions
- Copy in the UI
- Copy that adds no meaning
- Information architecture and flow
- States and accessibility
- Implementation defaults
- Displacement

## Using the list

- **Writing root `DESIGN.md`.** Read the list before choosing a value. A value
  that produces a pattern here stays only where the recorded brand direction
  asks for it. Otherwise choose again.
- **Reviewing.** Check the references the discussion pack adopted, root
  `DESIGN.md` and each prototype screen against the list. A finding names the
  aspect and quotes the pattern it matched.
- **Replacing a pattern.** Its usual substitute is in
  [Displacement](#displacement). Moving from one to the other is the same
  defect.
- Within each aspect, the pattern named most often comes first.

## Where the list stops

- It governs visual identity and the copy on the surface. How a control behaves
  and what a screen shows stay under `.agents/rules/interface-clarity.md`, which
  asks for the conventional pattern. The two do not conflict: the target is a
  conventional control inside a distinctive visual identity. An invented
  interaction is still a defect.
- Where an entry touches behaviour, as most of _Information architecture and
  flow_ and _States and accessibility_ do, `interface-clarity.md` and the spec
  are the rules. The entry is the form a breach of them takes on a generated
  screen.
- The reviewer inside the prototyping loop does not apply the sections about
  identity. Root `DESIGN.md` locks the brand values that reviewer sees, so a
  pattern there is caught where the design direction is reviewed and where
  `DESIGN.md` is written. That reviewer does apply _Copy that adds no meaning_,
  through the criterion on explanatory text, because those patterns are about
  what the text tells the user, not about a brand. No entry here is a `lap-*`
  detection.

## Color and background

- The hero, background, buttons or accents use a purple, violet or indigo
  gradient running to blue, cyan or pink.
- The page sits on a flat white, near-white or light-grey background with no
  texture or atmosphere.
- The primary or accent color is a solid purple, violet or indigo, typically
  the framework's `indigo-500` or `purple-500`, on buttons, links and
  highlights.
- Gradients are spread as decoration: behind cards, on buttons, as background
  washes.
- The whole interface is a permanent dark theme lit by purple-blue gradients or
  glowing purple and cyan accents.
- The primary color is a pure, saturated default blue, such as the framework's
  `blue-600`.
- Headline text or large numbers are filled with a gradient clipped to the
  letterforms.
- Several high-saturation colors compete on one screen with no order among
  them: five or more, or secondary colors louder than the primary.
- A warm cream or beige background carries a terracotta or espresso accent.
- The palette is neutral grey (zinc, slate) with one blue or purple accent, as
  it comes in a default color table.
- A near-black background carries a single acid-green or vermilion accent.
- The accent color marks every status, in place of reserved success, warning
  and error colors.
- Text is pure black on pure white.
- Sections alternate between light grey (`#F5F5F5`) and white.

## Typography

- All text is set in one default sans-serif that nobody chose: Inter, Roboto,
  Arial, Open Sans, Poppins or the system font stack.
- The type hierarchy is flat: heading levels barely differ in size, weights are
  uniform or bold is the only emphasis, and nothing is the focal point.
- The hero headline is set at display size and fills the first screen.
- A small, tracked-out, all-caps eyebrow label sits above every heading, often
  in monospace, or in English over text in another language.
- The "distinctive" family is one of the same few free choices: Space Grotesk,
  Instrument Serif, Geist, Fraunces or Satoshi.
- One word or phrase in the headline is set in serif italic, bold or another
  color as an accent.
- Headings and body text use the same font family.
- A serif or Mincho display face sets every heading, often in a newspaper-style
  layout.
- Line height, letter spacing and line length are left at their defaults: line
  height 1.5 and normal tracking on headings, or cramped leading.
- Scale is broken so elements fight: a number, logo or image is larger than the
  heading it belongs to.
- Small data labels are set in monospace.
- Lines run past about 45 CJK or 75 Latin characters, or leave orphans and
  breaks inside proper nouns.
- More font families are in play than the page needs, or the family changes
  from screen to screen.
- Headings are set in a flashy decorative display font.

## Iconography and imagery

- Emoji stand in for icons: on feature cards, in navigation and menus, as
  bullets, and in section headings.
- Thin outline icons from a stock set such as Lucide or Heroicons are used
  unchanged in every section, sparkles included.
- Generated images show artifacts or an over-perfect finish: skin too smooth,
  extra fingers, a yellowish cast, toy-like products, broken perspective,
  over-symmetrical illustration.
- Generic stock photos appear that do not match the product, such as a diverse
  team gathered at laptops.
- Real images are missing: emoji, icons, gradient boxes or placeholders stand
  where photos or screenshots belong.
- Each icon sits in its own tinted rounded-square tile.
- A fake product dashboard with arbitrary numbers is drawn in CSS where a real
  screenshot belongs.
- Icons are multicolored, or mix stroke weights and fill styles.
- Icon tiles are larger and louder than the feature they illustrate.
- The hero shows a laptop mockup over a rainbow gradient.
- The same image is reused on several pages.
- Customer logos keep their own brand colors and clash with the palette.
- Images are blurry or stretched.

## Surfaces

- Every card, button and panel has the same corner radius (0.5rem, 8px, 12px or
  16px), often too large.
- The same soft, low-opacity drop shadow sits under every raised element, with
  no light source behind it: about `rgba(0,0,0,0.1)`, `shadow-md` or
  `shadow-lg`.
- Colored glows, neon edges, light bloom, blurred orbs or halos sit behind or
  around content.
- Panels and cards are frosted glass with no depth that does any work.
- Cards carry a colored stripe down one side or across the top that marks
  nothing.
- Decorative shapes carry no function: accent lines, floating geometric shapes,
  3D spheres, technical line art.
- Dots signal nothing: status dots with no state, glowing dots, fake
  window-control dots.
- Every surface is flat and textureless, with every element on one visual
  layer.
- A grey border or a filled box is drawn around every block.
- Decoration is stacked on elements that need none.
- Shadows have hard edges.

## Components

- Features are a row of three, four or six identical equal-width cards, each an
  icon on top, a short title and one sentence.
- The hero is a centered large headline, a subheading and one or two
  call-to-action buttons.
- Cards sit inside cards, three to five containers deep around the same
  content.
- Every piece of content is wrapped in a card, down to a single paragraph.
- Buttons are pill-shaped, or soft and puffy.
- Pill badges or tags such as "AI powered" are sprinkled over headings and
  cards and mark nothing.
- A huge number with a small label leads a section, and the explanation
  follows below it.
- Content is numbered "01 / 02 / 03" whether or not it is a sequence.
- Buttons have no styling of their own.
- Buttons or chips in one row come in different sizes.
- Pricing is three tiers with the middle one ringed or labelled "Most
  Popular".
- The footer is split into three or four equal columns.
- Testimonials are shown as a carousel.
- Every section carries three or more call-to-action buttons.
- The same action appears twice: as a large accent button and as a separate
  icon button.

## Layout and composition

- The page is the stock generated-SaaS template: the same blocks, header and
  arrangement as other generated sites, so swapping the colors would make them
  indistinguishable.
- Everything is centered, including long blocks of text.
- Spacing is uniform: every element and section gets the same padding and gap,
  so nothing reads as grouped.
- The grid is rigid, symmetric and equal-width, with no asymmetry and nothing
  breaking it.
- Whitespace is empty rather than structural: excessive, or with no hierarchy.
- Spacing is arbitrary: gaps vary between sections and sit off any 4px or 8px
  scale.
- Every section repeats one structure: a heading, a description and three
  cards, or text and image swapping sides.
- The page is crammed: elements packed edge to edge, fifty or more items
  visible with nothing folded away.
- Items do not line up, and text and icons are centered mathematically rather
  than optically.
- The page takes a broadsheet look: hairline rules, zero radius and dense
  newspaper columns.
- The elements the brief asked for are all present but set down with no
  structure.
- The layout breaks, overlaps or overflows at phone widths.
- Content sits flush to the edges with no shared margin.
- A layout borrowed from an unrelated showcase style is used with nothing in the
  brief asking for it.

## Placement

- A row of three cards sits directly beneath the hero headline.
- The hero puts text on the left and a device mockup or graphic on the right.
- A small pill badge sits directly above the hero headline.
- A single card is centered in the viewport with empty space all around it.
- A brand-mark-style text block such as "BRAND / DEVELOPMENT / EST. 2025" fills
  empty space in the hero.
- A working control such as a filter is placed in the middle of the screen.

## Motion and transitions

- Motion is excessive or purposeless: several effects compete, or animation is
  there to tick a box.
- Every section or element enters with the same fade-in or fade-and-slide-up at
  the same speed.
- Every card lifts, scales or glows on hover (`translateY(-4px)`,
  `hover:scale-105`).
- The page is entirely static, with no motion chosen for any element.
- Transitions are generic or stiff: linear or stock ease-in-out, snapping where
  they should ease.
- Buttons and cards bounce with elastic easing on hover.
- Decoration loops forever: pulsing dots, floating badges, wiggling icons,
  endless glows, moving gradients.
- Statistics count up as they scroll into view.
- Scrolling drives a parallax effect that serves no content.

## Copy in the UI

- Copy leans on hollow buzzwords: seamless, unlock, elevate, supercharge,
  revolutionize, innovative, next-generation, empower, one-stop, cutting-edge.
- Copy could describe any product: no specific value, number, customer or fact.
- Placeholder content is left in: Lorem ipsum, "Your headline here", "Your
  Company Name", "John Doe", placeholder avatars.
- Em dashes appear in sentence after sentence and in "WORD — fragment" labels.
- The headline is a formula naming a category or an aspiration rather than an
  outcome: "The AI-powered X for modern Y", "Build the future".
- Call-to-action labels are generic ("Learn more", "Get started") or missing.
- Section headings are formulaic and repeat across sites: "Features",
  "Solutions", "Everything you need to…".
- An arrow (→) is appended to link and button text.
- Copy hedges or pads: "may help you", "In today's world", "There are many
  ways".
- The tone is stiff and impersonal: passive voice, long sentences, over-polite
  neutrality, no brand voice.
- Proof is invented: made-up metrics such as "+47% conversion", testimonials,
  or "trusted by" logos.
- Everything comes in threes: "Save time. Work smarter. Scale faster."
- Microcopy is formulaic and upbeat: exclamation marks everywhere ("Let's
  go!"), or the same encouraging line under every login heading.
- Slogans use forced contrast: "Not a feature. A platform."
- Meta strings are joined with middle dots (U+00B7).
- Subtitles run to several sentences.
- Paragraphs come out at matching lengths.
- Copy uses odd metaphors that read like a translated book.
- Button labels mix two languages.
- The screen shows technical detail nobody asked for, such as GPU status or
  average generation time.

## Copy that adds no meaning

These patterns are judged against the screen's tasks and the `supplements` its UI
contract declares, in SDD, in implementation and in every surface review. A chosen
visual direction does not exempt them. A disclosure about demo data, cost, storage
or transmission that is true and shown where the user decides is not one of them:
judge where it sits and what it lets the user do, not the word.

- A second heading or a sentence repeats the main heading, an action label, a
  state, or the content beside it.
- A condition the user already knows is explained again where it adds nothing to
  the decision being made.
- Production copy carries a development instruction, implementation commentary,
  or a demo note repeated on screen after screen.

## Information architecture and flow

- Sections follow the stock order: hero, logos, three features, stats or
  testimonials, pricing, call to action, footer.
- Visual decisions drift between screens: fonts, tone, colors, spacing and
  radius change with no reason.
- Sections have no narrative order and no decision about what to emphasise.
- Benefits are described but the product is never shown in use.
- A business work tool is laid out like a marketing landing page, and a
  data-heavy screen has no table.
- The steps of one task are split up: input and result sit in different
  sections, or settings hide on a secondary screen.
- Buttons have no handler or link to `#`, and navigation leads to pages that do
  not exist.
- A control responds in a way its look does not predict.

## States and accessibility

- Body or muted text is light grey with contrast below WCAG AA, on white or on
  a dark background.
- Loading, empty, error and success states are missing, and forms fail
  silently with no validation or required-field markers.
- Interactive elements lack hover, focus-visible and active states, or hover
  differs from element to element.
- Alt text, ARIA labels and keyboard navigation are missing, and clickable
  `div` elements stand in for buttons.
- Animation has no `prefers-reduced-motion` fallback.
- Touch targets are undersized on mobile.

## Implementation defaults

- The Tailwind or shadcn/ui default palette ships unchanged: `indigo-500`,
  `blue-600`, slate or zinc greys, the default status colors.
- Library components (shadcn/ui, Material UI, Bootstrap, Aceternity, Magic UI)
  keep their default styling.
- Utility-class defaults are the design: `rounded-2xl shadow-lg`, `shadow-md`,
  `hover:scale-105`, `transition-all`.
- A web font is declared or loaded but never applied.

## Displacement

Ban a first default and a model moves to its usual substitute. The substitutes
are defaults in their own right, so each one is a pattern to avoid as well. A
ban names both sides of its row, or the output only moves sideways.

| First default                     | What a model falls back to once it is banned                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purple-to-blue gradient on white  | Warm cream or beige ground (near `#F4F1EA`) with a terracotta (near `#D97757`) or espresso accent                                                           |
| Purple-to-blue gradient on white  | Near-black ground, tinted rather than true black (`#0B0B0B`, `rgb(17,17,17)`), with one acid-green or vermilion accent                                      |
| Purple glow on a dark theme       | The same near-black ground with one neon accent                                                                                                             |
| Inter everywhere                  | The "tasteful" free families: Space Grotesk, Instrument Serif, Geist, Fraunces, Satoshi                                                                     |
| A plain sans-serif page           | One headline word in serif italic on an otherwise sans-serif page                                                                                           |
| Sans-serif type and rounded cards | The newspaper look: a high-contrast serif or Mincho display face, hairline rules, zero radius, dense columns                                                |
| One corner radius everywhere      | Zero radius everywhere, with hairline rules between blocks                                                                                                  |
| Plain section headings            | Template chrome: tracked all-caps monospace eyebrow labels, "01 / 02 / 03" numbering, middle-dot-separated meta strings (U+00B7), an arrow after every link |
| The same fade-up on every section | No motion at all                                                                                                                                            |

The last row is one mistake in two directions: motion chosen by default rather
than for the content.
