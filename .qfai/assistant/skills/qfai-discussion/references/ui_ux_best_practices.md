# UI/UX Best Practices Reference (QFAI Discussion Pack)

This document is a comprehensive reference for UI/UX design principles, platform-specific guidelines, anti-patterns, and audit frameworks. It serves as input for QFAI's quality assurance processes across Web, Desktop (Windows/macOS), and Mobile (iOS/Android) platforms.

---

## Table of Contents

1. [Universal UI/UX Design Principles](#1-universal-uiux-design-principles)
2. [Platform-Specific Guidelines](#2-platform-specific-guidelines)
3. [Screen Design Best Practices](#3-screen-design-best-practices)
4. [Navigation and Information Architecture](#4-navigation-and-information-architecture)
5. [Interaction Design](#5-interaction-design)
6. [Accessibility (WCAG 2.2)](#6-accessibility-wcag-22)
7. [Anti-Patterns](#7-anti-patterns)
8. [UI/UX Specification Formats](#8-uiux-specification-formats)
9. [Review and Audit Frameworks](#9-review-and-audit-frameworks)
10. [Emerging Trends (2025-2026)](#10-emerging-trends-2025-2026)

---

## 1. Universal UI/UX Design Principles

### 1.1 Nielsen's 10 Usability Heuristics

#### H1: Visibility of System Status

- **Description**: The system should always keep users informed about what is going on through appropriate feedback within reasonable time.
- **Impact**: Without status visibility, users feel uncertain, repeat actions, or abandon tasks. Trust erodes when the system appears unresponsive.
- **How to verify**: (a) Every user action produces visible feedback within 100ms. (b) Long operations show progress indicators. (c) State changes (save, submit, delete) confirm completion. (d) Network/loading states are clearly communicated.
- **Common violations**: Silent form submissions; no loading indicator during API calls; background saves without confirmation; stale data displayed without staleness indicator.

#### H2: Match Between System and the Real World

- **Description**: The system should speak the user's language with words, phrases, and concepts familiar to the user rather than system-oriented terms. Follow real-world conventions, making information appear in a natural and logical order.
- **Impact**: Jargon and unfamiliar metaphors increase cognitive load and error rates. Users must translate system language into their mental model.
- **How to verify**: (a) Labels use domain terminology, not technical jargon. (b) Icons follow established conventions. (c) Data ordering matches user expectations (chronological, alphabetical, priority). (d) Metaphors are consistent and culturally appropriate.
- **Common violations**: Error codes displayed raw (e.g., "ERR_4012"); file system paths shown to non-technical users; "Submit" instead of domain-appropriate action verbs; sort order that does not match user expectations.

#### H3: User Control and Freedom

- **Description**: Users often choose system functions by mistake and need a clearly marked "emergency exit" to leave the unwanted state without having to go through an extended dialogue. Support undo and redo.
- **Impact**: Without escape routes, users feel trapped and anxious. Irreversible actions cause data loss and erode confidence.
- **How to verify**: (a) Undo/redo is available for destructive actions. (b) Dialogs have clear cancel/close options. (c) Multi-step flows allow back navigation. (d) Accidental deletions are recoverable (soft delete or confirmation).
- **Common violations**: No undo after delete; modals without close button; wizard flows without back button; auto-save without version history; forced completion of multi-step flows.

#### H4: Consistency and Standards

- **Description**: Users should not have to wonder whether different words, situations, or actions mean the same thing. Follow platform conventions.
- **Impact**: Inconsistency increases learning time and error rates. Users transfer expectations from one part of the UI to another.
- **How to verify**: (a) Same action uses same label/icon everywhere. (b) Component behavior is uniform (e.g., all dropdowns behave identically). (c) Platform conventions are followed (e.g., primary action placement). (d) Design tokens are applied consistently.
- **Common violations**: "Save" vs. "Submit" vs. "Apply" for the same action; inconsistent icon meanings; primary button color varies across screens; different date formats on different pages.

#### H5: Error Prevention

- **Description**: Even better than good error messages is a careful design that prevents a problem from occurring in the first place. Either eliminate error-prone conditions or present users with a confirmation option before they commit to the action.
- **Impact**: Prevention reduces support costs, user frustration, and data corruption.
- **How to verify**: (a) Destructive actions require confirmation. (b) Input fields have appropriate constraints (type, range, format). (c) Defaults are safe. (d) Ambiguous actions are disambiguated. (e) Real-time validation prevents submission of invalid data.
- **Common violations**: Delete button adjacent to edit button without confirmation; free-text fields where structured input is possible; no character limits; allowing submission of incomplete forms.

#### H6: Recognition Rather Than Recall

- **Description**: Minimize the user's memory load by making objects, actions, and options visible. The user should not have to remember information from one part of the dialogue to another.
- **Impact**: Recall-dependent interfaces slow users down and increase errors, especially for infrequent users.
- **How to verify**: (a) Context is preserved across screens (breadcrumbs, headers). (b) Recently used items are surfaced. (c) Input fields show format hints. (d) Related information is co-located. (e) Search supports auto-complete.
- **Common violations**: Requiring users to memorize IDs to enter elsewhere; no breadcrumbs in deep navigation; empty search without suggestions; form fields without placeholder/format hints.

#### H7: Flexibility and Efficiency of Use

- **Description**: Accelerators -- unseen by the novice user -- may speed up the interaction for the expert user such that the system can cater to both inexperienced and experienced users.
- **Impact**: Power users become frustrated without shortcuts; novice users are overwhelmed by too many options.
- **How to verify**: (a) Keyboard shortcuts exist for frequent actions. (b) Customizable workflows or preferences exist. (c) Bulk actions are available. (d) Search and filtering support advanced syntax. (e) Default flows are simple but expandable.
- **Common violations**: No keyboard shortcuts; no bulk operations; inability to customize dashboards; search that only supports exact match; no "recent items" for frequent tasks.

#### H8: Aesthetic and Minimalist Design

- **Description**: Dialogues should not contain information that is irrelevant or rarely needed. Every extra unit of information in a dialogue competes with the relevant units and diminishes their relative visibility.
- **Impact**: Visual noise increases scan time and reduces task completion rates. Information overload leads to decision paralysis.
- **How to verify**: (a) Each screen element serves a clear purpose. (b) Progressive disclosure hides advanced options. (c) White space is used effectively. (d) Content density is appropriate for the platform (desktop denser than mobile).
- **Common violations**: Dashboard with 20+ widgets; settings page showing all options at once; gratuitous animations; decorative elements that compete with functional elements; redundant labels.

#### H9: Help Users Recognize, Diagnose, and Recover from Errors

- **Description**: Error messages should be expressed in plain language (no codes), precisely indicate the problem, and constructively suggest a solution.
- **Impact**: Poor error messages leave users stranded. Clear recovery paths reduce abandonment and support requests.
- **How to verify**: (a) Error messages use plain language. (b) Messages indicate what went wrong AND what to do next. (c) Errors appear inline near the source. (d) Severity is visually differentiated (warning vs. error). (e) Retry mechanisms are available.
- **Common violations**: "An error occurred" with no detail; error toast that disappears before reading; validation errors shown only at top of form; technical stack traces shown to users; no retry button on transient failures.

#### H10: Help and Documentation

- **Description**: Even though it is better if the system can be used without documentation, it may be necessary to provide help and documentation. Any such information should be easy to search, focused on the user's task, list concrete steps to be carried out, and not be too large.
- **Impact**: Missing help increases support costs and user frustration. Excessive documentation is never read.
- **How to verify**: (a) Contextual help is available (tooltips, inline help). (b) Help is searchable. (c) Onboarding flows exist for new users. (d) Documentation is task-oriented, not feature-oriented. (e) Empty states include guidance.
- **Common violations**: No tooltips on complex fields; help pages only accessible from a separate site; no onboarding for first-time users; empty states showing only "no data"; FAQ-only help without task-based guides.

---

### 1.2 Gestalt Principles Applied to UI

#### Proximity

- **Description**: Elements placed close together are perceived as related.
- **Impact**: Proper grouping reduces cognitive load; poor grouping causes misassociation.
- **How to verify**: Related form fields are grouped; labels are closer to their fields than to adjacent fields; section spacing is larger than intra-section spacing.
- **Common violations**: Label equidistant between two fields; action buttons not clearly associated with their content section; inconsistent spacing between related/unrelated items.

#### Similarity

- **Description**: Elements sharing visual characteristics (color, shape, size) are perceived as related.
- **Impact**: Consistent visual treatment helps users categorize and predict behavior.
- **How to verify**: Interactive elements share consistent styling; status indicators use a coherent color system; similar functions look similar.
- **Common violations**: Links styled inconsistently (some blue, some not underlined); different button styles for same-level actions; status colors used inconsistently.

#### Continuity

- **Description**: The eye follows the smoothest path and groups elements along a line or curve.
- **Impact**: Proper alignment creates visual flow; misalignment creates visual noise.
- **How to verify**: Elements align to a grid; text blocks share alignment; visual flow guides the eye to the primary action.
- **Common violations**: Ragged left edges; centered text mixed with left-aligned text; elements that break grid alignment without purpose.

#### Closure

- **Description**: The brain completes incomplete shapes, perceiving closed forms even when parts are missing.
- **Impact**: Cards, containers, and borders can be implied rather than explicitly drawn.
- **How to verify**: Containers use consistent boundary treatment; implied groupings are unambiguous; icons are recognizable even when simplified.
- **Common violations**: Ambiguous card boundaries on low-contrast backgrounds; icon designs that are too abstract to recognize.

#### Figure-Ground

- **Description**: Users instinctively separate foreground elements from background.
- **Impact**: Proper use of elevation and contrast establishes visual hierarchy.
- **How to verify**: Modals clearly separate from background (overlay); primary content stands out from secondary; interactive elements are distinguishable from decorative.
- **Common violations**: Modals without background overlay; cards that blend into background; disabled states that look identical to enabled states.

#### Common Region

- **Description**: Elements within a shared boundary are perceived as a group.
- **Impact**: Cards, panels, and sections leverage this to organize content.
- **How to verify**: Related content is enclosed; boundaries are consistent; nesting depth is limited and clear.
- **Common violations**: Content outside its visual container; inconsistent card styling; over-nested containers creating confusion.

---

### 1.3 Cognitive Psychology Laws

#### Fitts's Law

- **Description**: The time to acquire a target is a function of the distance to and size of the target. Larger and closer targets are faster to reach.
- **Impact**: Directly affects task completion speed and error rates for pointer/touch interactions.
- **How to verify**: (a) Primary actions have large click/tap targets (min 44x44 CSS px web, 48x48dp Android, 44x44pt iOS). (b) Destructive actions are not adjacent to frequent actions. (c) Important controls are near likely cursor/thumb positions. (d) Corner/edge targeting is exploited on desktop (e.g., menu bars at screen edge).
- **Common violations**: Tiny icon-only buttons; close-together "Delete" and "Edit" buttons; mobile nav items in hard-to-reach screen corners; action links in dense text paragraphs.

#### Hick's Law (Hick-Hyman Law)

- **Description**: The time to make a decision increases logarithmically with the number of choices.
- **Impact**: Too many options cause decision paralysis and increase task time.
- **How to verify**: (a) Menu items are limited per level (7 plus or minus 2 as a guideline, not a rule). (b) Progressive disclosure is used. (c) Defaults are provided for common choices. (d) Search/filter is available for large option sets.
- **Common violations**: Dropdown with 50+ unstructured items; navigation with 15+ top-level items; settings page with all options visible; action menus with 20+ items.

#### Miller's Law

- **Description**: The average person can hold approximately 7 (plus or minus 2) items in working memory.
- **Impact**: Chunking information aids comprehension; exceeding memory limits causes errors.
- **How to verify**: (a) Information is chunked (e.g., phone numbers as 123-456-7890). (b) Lists are grouped or categorized. (c) Step counts in wizards are manageable (ideally 3-5 steps). (d) Dashboard metrics are prioritized, not exhaustive.
- **Common violations**: Long unstructured lists; 15-step wizards; ungrouped navigation; raw data without summarization.

#### Jakob's Law

- **Description**: Users spend most of their time on other sites/apps. They prefer your interface to work the same way as all the other interfaces they already know.
- **Impact**: Novel interaction patterns require learning. Familiar patterns leverage existing knowledge.
- **How to verify**: (a) Standard UI patterns are used (shopping cart icon, hamburger menu, swipe to delete). (b) Platform conventions are followed. (c) Innovation is reserved for core differentiators, not basic interactions.
- **Common violations**: Custom scrollbar behavior; non-standard navigation placement; reinventing the date picker; unconventional gesture mappings.

#### Doherty Threshold

- **Description**: Productivity soars when a system and its users interact at a pace (<400ms response time) that ensures neither has to wait on the other.
- **Impact**: Response times above 400ms break flow state; above 1s users notice delay; above 10s users abandon.
- **How to verify**: (a) UI responses are under 100ms for direct manipulation (typing, dragging). (b) System responses are under 400ms for most actions. (c) Operations exceeding 1s show progress indicators. (d) Perceived performance is optimized (skeleton screens, optimistic updates).
- **Common violations**: No loading state for API calls; blocking UI during computation; no skeleton screens; spinner-only feedback for long operations.

#### Peak-End Rule

- **Description**: Users judge an experience largely based on how they felt at its most intense point (peak) and at its end, rather than on the average of every moment.
- **Impact**: A frustrating peak moment or a bad ending overshadows an otherwise good experience.
- **How to verify**: (a) Error/failure moments include graceful recovery. (b) Completion/success moments are celebrated (confirmation, summary). (c) Onboarding starts and ends positively. (d) Critical pain points in the flow are identified and addressed.
- **Common violations**: Form submission that silently redirects without confirmation; error pages with no guidance; abrupt session timeout without warning; payment flow that ends with a technical error page.

#### Aesthetic-Usability Effect

- **Description**: Users perceive aesthetically pleasing designs as more usable, even when they are not objectively so. Visual design creates a positive first impression that increases tolerance for minor usability issues.
- **Impact**: Attractive interfaces increase trust, engagement, and perceived quality. However, aesthetics must not mask genuine usability problems.
- **How to verify**: (a) Visual design is polished and consistent. (b) Typography, color, and spacing follow a coherent system. (c) Aesthetics complement rather than compete with functionality. (d) User testing validates actual usability, not just preference.
- **Common violations**: Beautiful but unusable interfaces; sacrificing readability for visual style; animation that delays interaction; form-over-function design decisions.

---

### 1.4 Don Norman's Design Principles

#### Affordance

- **Description**: The properties of an object that suggest how it can be used. A button affords pressing; a slider affords dragging.
- **Impact**: Strong affordances reduce learning time; weak affordances cause confusion.
- **How to verify**: Interactive elements look interactive (buttons look pressable, links look clickable); non-interactive elements do not look interactive.
- **Common violations**: Flat text that is actually a link; cards that look clickable but are not; decorative elements that look interactive; ghost buttons that look like labels.

#### Signifiers

- **Description**: Indicators that communicate where, how, and what action should be taken. Signifiers tell users what to do.
- **Impact**: Even when affordances exist, users need signals about how to use them.
- **How to verify**: Hover states, cursor changes, visual cues for drag handles, scroll indicators, tooltip triggers are all present.
- **Common violations**: No hover state on clickable elements; no visual cue for scrollable areas; drag-and-drop without handle indicators; swipe actions without hints.

#### Mapping

- **Description**: The relationship between controls and their effects. Good mapping provides clear correspondence.
- **Impact**: Natural mapping (spatial, cultural) reduces errors and learning time.
- **How to verify**: (a) Scroll direction matches content movement. (b) Slider direction matches value increase. (c) Control proximity to the thing it affects is close. (d) Toggle state visually matches the controlled state.
- **Common violations**: Toggle label that does not clearly indicate on/off state; volume slider that goes right-to-left; remote controls far from the item they control; settings that affect a different screen with no indication.

#### Feedback

- **Description**: Every action should produce an immediate and obvious result that communicates the system's state.
- **Impact**: Without feedback, users do not know if their action worked, leading to repeated actions or abandonment.
- **How to verify**: Click/tap produces visual response; form submission shows result; state changes are communicated; errors are immediately visible.
- **Common violations**: Button with no visual press state; form that submits without confirmation; background process with no indicator; toggle that changes database state without visual acknowledgment.

#### Constraints

- **Description**: Limiting the range of possible actions to prevent errors. Physical, logical, semantic, and cultural constraints all apply.
- **Impact**: Good constraints make errors impossible rather than merely recoverable.
- **How to verify**: Input fields restrict invalid values (date pickers instead of free text); disabled states prevent invalid actions; form structure prevents illogical combinations.
- **Common violations**: Free-text date entry; allowing negative quantities in a cart; enabling "Submit" when required fields are empty; allowing conflicting filter combinations.

#### Conceptual Models

- **Description**: The user's understanding of how a system works. Good design creates accurate mental models.
- **Impact**: Mismatched mental models cause persistent, systematic errors.
- **How to verify**: (a) System behavior matches user expectations. (b) Metaphors are consistent. (c) Feedback reinforces the correct model. (d) Terminology is consistent with the model.
- **Common violations**: "Save" that does not persist data (draft behavior); "Delete" that actually archives; folder metaphor but flat storage behind the scenes; copy behavior that creates references instead of duplicates.

---

## 2. Platform-Specific Guidelines

### 2.1 Web

#### Material Design 3 (Google)

- **Description**: Google's design system emphasizing dynamic color, adaptive layouts, and updated component library.
- **Key principles**: Personalization via dynamic color theming; responsive layouts with canonical breakpoints (compact <600dp, medium 600-839dp, expanded 840dp+); emphasis on large touch targets; elevation through tonal surface colors rather than drop shadows.
- **How to verify**: (a) Color tokens use Material 3 roles (primary, secondary, tertiary, surface, on-surface, etc.). (b) Components follow M3 specs (FAB, Navigation Rail, Top App Bar). (c) Typography uses M3 type scale (display, headline, title, body, label). (d) Shape system uses M3 corner definitions.
- **Common violations**: Mixing M2 and M3 component styles; not using dynamic color; ignoring tonal elevation; fixed layouts without responsive adaptation.

#### WCAG 2.2 AA/AAA

- **Description**: Web Content Accessibility Guidelines version 2.2 define success criteria for web accessibility.
- **AA requirements** (minimum): Contrast ratio 4.5:1 for normal text, 3:1 for large text; keyboard operability for all functionality; focus indicators visible; text resizable to 200% without loss; target size minimum 24x24 CSS px (SC 2_5_8 AA).
- **AAA requirements** (enhanced): Contrast ratio 7:1 for normal text, 4.5:1 for large text; target size minimum 44x44 CSS px; sign language for multimedia; extended audio descriptions.
- **How to verify**: Automated tools (axe, Lighthouse) for detectable issues; manual testing for keyboard navigation, screen reader flow, cognitive accessibility.
- **Common violations**: Insufficient color contrast; missing alt text; inaccessible custom components; focus traps; missing skip navigation links; non-descriptive link text ("click here").

#### Apple HIG (Web)

- **Description**: Apple's Human Interface Guidelines for web content accessed via Safari and WebKit-based browsers.
- **Key principles**: Respect system appearance (dark mode); support Dynamic Type equivalents; avoid custom controls that break platform expectations; support touch and pointer input.
- **How to verify**: CSS supports prefers-color-scheme; touch targets are adequate; viewport meta tag is properly set; no hover-only interactions on touch devices.

### 2.2 Mobile

#### iOS Human Interface Guidelines (Apple)

- **Key principles**: Clarity (text is legible at every size, icons are precise, adornments are subtle); deference (fluid motion and crisp interface help people understand content); depth (visual layers and realistic motion convey hierarchy).
- **Navigation**: Tab bar (bottom, up to 5 items), navigation bar (top, with back button), modal presentations.
- **Typography**: SF Pro with Dynamic Type support. Minimum body text 17pt. System font sizes: Large Title 34pt, Title 1 28pt, Title 2 22pt, Title 3 20pt, Headline 17pt semibold, Body 17pt, Callout 16pt, Subheadline 15pt, Footnote 13pt, Caption 1 12pt, Caption 2 11pt.
- **Touch targets**: Minimum 44x44 pt.
- **Safe areas**: Respect safe area insets for notch, home indicator, status bar.
- **How to verify**: (a) Navigation follows standard patterns. (b) System controls are used where possible. (c) Dynamic Type is supported. (d) Safe areas are respected. (e) Haptic feedback follows Apple patterns.
- **Common violations**: Custom back button that breaks swipe-to-go-back; tab bar with more than 5 items without "More"; ignoring safe area insets; fixed font sizes; non-standard alert dialogs.

#### Android Material Design

- **Key principles**: Material is the metaphor; bold, graphic, intentional; motion provides meaning.
- **Navigation**: Bottom navigation (3-5 destinations), navigation drawer, tabs, navigation rail (tablets).
- **Typography**: Roboto (default). Type scale: Display Large 57sp, Display Medium 45sp, Display Small 36sp, Headline Large 32sp, Headline Medium 28sp, Headline Small 24sp, Title Large 22sp, Title Medium 16sp, Title Small 14sp, Body Large 16sp, Body Medium 14sp, Body Small 12sp, Label Large 14sp, Label Medium 12sp, Label Small 11sp.
- **Touch targets**: Minimum 48x48 dp (recommended).
- **How to verify**: (a) Material components used. (b) Touch targets meet 48dp minimum. (c) Elevation/shadow system followed. (d) Navigation patterns are standard. (e) Edge-to-edge content with system bar handling.
- **Common violations**: iOS-style navigation on Android; bottom sheets that do not follow Material specs; ignoring system back button; non-standard status bar handling.

### 2.3 Desktop

#### Windows 11 Fluent Design

- **Key principles**: Light, depth, motion, material (acrylic/mica), and scale. Mica (subtle desktop wallpaper tint) for title bars; acrylic for transient surfaces.
- **Layout**: Navigation view (hamburger + rail), command bar, tree view for hierarchy. Content areas use 4px/8px spacing grid. Minimum recommended control height 32px. Recommended touch-mode control height 40px.
- **Typography**: Segoe UI Variable. Caption 12px, Body 14px, Body Strong 14px semibold, Subtitle 20px semibold, Title 28px semibold, Title Large 40px semibold, Display 68px semibold.
- **How to verify**: (a) Mica/acrylic used appropriately. (b) NavigationView pattern used. (c) System theme (light/dark) is respected. (d) High contrast mode is supported. (e) Keyboard and narrator accessibility.
- **Common violations**: Custom title bar that breaks snap layouts; ignoring high contrast mode; using web-style navigation in desktop apps; not respecting system accent color.

#### macOS Human Interface Guidelines (Apple)

- **Key principles**: Mental model consistency with physical world; direct manipulation; see-and-point; consistency; WYSIWYG; user control; feedback and dialog; forgiveness; perceived stability; aesthetic integrity.
- **Layout**: Toolbar, sidebar, content area, inspector. Standard window controls (traffic light). Menu bar is mandatory.
- **Typography**: SF Pro. System font sizes: Large Title 26pt, Title 1 22pt, Title 2 17pt, Title 3 15pt, Headline 13pt bold, Body 13pt, Callout 12pt, Subheadline 11pt, Footnote 10pt.
- **How to verify**: (a) Menu bar has standard menus (File, Edit, View, Window, Help). (b) Standard keyboard shortcuts work (Cmd+C/V/Z). (c) Dark mode supported. (d) Trackpad gestures respected. (e) Window resizing behavior is correct.
- **Common violations**: Missing menu bar; non-standard keyboard shortcuts; custom title bar breaking native behavior; ignoring dark mode; modal-heavy design instead of non-modal.

### 2.4 Cross-Platform Consistency Principles

- **Same conceptual model**: Users moving between platforms should recognize the same features, flows, and terminology.
- **Platform-native interaction**: While concepts stay consistent, interaction patterns should follow platform conventions (e.g., bottom nav on mobile, side nav on desktop; swipe to delete on iOS, long-press menu on Android).
- **Adaptive layout, not responsive alone**: Desktop, tablet, and mobile may need fundamentally different layouts, not just reflow.
- **Shared design tokens**: Color, typography, spacing, and elevation tokens should map to platform-native values.
- **How to verify**: (a) Feature parity is documented. (b) Platform-specific deviations are intentional and documented. (c) Design tokens have platform-specific mappings. (d) User flows are consistent in outcome, even if interaction differs.
- **Common violations**: Pixel-identical design forced across platforms; iOS patterns on Android or vice versa; missing features on one platform without explanation; inconsistent terminology across platforms.

---

## 3. Screen Design Best Practices

### 3.1 Layout Patterns

#### F-Pattern

- **Description**: Users scan web pages in an F-shaped pattern: two horizontal stripes followed by a vertical scan down the left side. Most effective for text-heavy pages.
- **Impact**: Content placed outside the F-pattern is likely to be missed.
- **How to verify**: Important content and CTAs are positioned along the F-pattern; left column contains key information; headers are front-loaded with important words.
- **Common violations**: Important actions in the right column of text-heavy pages; burying key information below the fold; right-aligned critical content.

#### Z-Pattern

- **Description**: For pages with minimal text or strong visual hierarchy, users scan in a Z-shape: top-left to top-right, diagonally to bottom-left, then to bottom-right.
- **Impact**: Effective for landing pages, marketing pages, and login screens.
- **How to verify**: Logo/brand at top-left; primary CTA at terminal point (bottom-right); visual hierarchy guides diagonal flow.
- **Common violations**: CTA at top-left on landing pages; no visual anchor points to guide the Z; competing focal points.

#### Grid Systems

- **Description**: Consistent column grid (typically 4-column mobile, 8-column tablet, 12-column desktop) provides alignment and rhythm.
- **Impact**: Grid systems create visual order, speed up design decisions, and ensure responsive behavior.
- **How to verify**: (a) Column count matches platform (4/8/12). (b) Gutters are consistent (typically 16-24px). (c) Content aligns to grid columns. (d) Breakpoints transition grid columns appropriately.
- **Common violations**: Arbitrary widths that do not align to grid; inconsistent gutters; content that spans partial columns; no grid definition in the design system.

### 3.2 Typography Scale and Hierarchy

- **Description**: A type scale provides a limited, harmonious set of font sizes that create clear hierarchy. Major Second (1.125), Minor Third (1.2), Major Third (1.25), Perfect Fourth (1.333), and Augmented Fourth (1.414) are common ratios.
- **Impact**: Consistent typography reduces cognitive load and establishes information hierarchy.
- **How to verify**: (a) No more than 4-5 distinct font sizes per screen. (b) Size progression follows a defined ratio. (c) Weight is used for emphasis, not size alone. (d) Line height is appropriate (1.4-1.6 for body text). (e) Maximum line length is 45-75 characters for readability.
- **Common violations**: Arbitrary font sizes (13px, 14px, 15px, 16px all used); too many font sizes on one screen; line length exceeding 80 characters; insufficient line height; using size instead of weight for emphasis.

### 3.3 Color Theory and Accessibility

#### Color System Structure

- **Primary, secondary, tertiary**: Core brand and functional colors.
- **Semantic colors**: Success (green), warning (amber/yellow), error (red), info (blue).
- **Neutral palette**: Grays for text, borders, backgrounds, and surfaces.
- **Surface and elevation colors**: Background hierarchy.

#### Contrast Requirements (WCAG 2.2)

| Element                              | AA Minimum | AAA Enhanced |
| ------------------------------------ | ---------- | ------------ |
| Normal text (<24px / <18.66px bold)  | 4.5:1      | 7:1          |
| Large text (>=24px / >=18.66px bold) | 3:1        | 4.5:1        |
| UI components and graphical objects  | 3:1        | 3:1          |
| Focus indicators                     | 3:1        | 3:1          |

#### Color Blindness Considerations

- **Description**: Approximately 8% of males and 0.5% of females have color vision deficiency. The most common types are protanopia/protanomaly (red weakness) and deuteranopia/deuteranomaly (green weakness).
- **How to verify**: (a) Color is never the sole means of conveying information. (b) Status indicators use icons/shapes in addition to color. (c) Charts use patterns or labels in addition to color. (d) Test with simulated color blindness (protanopia, deuteranopia, tritanopia).
- **Common violations**: Red/green only status indicators; color-coded charts without labels; error states conveyed only by input border color change; link text distinguished only by color.

### 3.4 Spacing Systems

#### 4px/8px Base Grid

- **Description**: All spacing, sizing, and positioning values are multiples of 4px (or 8px for coarser control): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, etc.
- **Impact**: Consistent spacing creates visual rhythm and simplifies design-development handoff.
- **How to verify**: (a) All margins, padding, and gaps are multiples of 4px. (b) Component heights align to the grid. (c) Icon sizes align to the grid (16, 20, 24, 32, 48). (d) Spacing tokens are defined and used consistently.
- **Common violations**: Arbitrary padding values (7px, 13px); inconsistent spacing between same-type elements; component heights that do not align; mixing spacing systems.

### 3.5 Responsive/Adaptive Design Breakpoints

#### Common Breakpoint Ranges

| Category    | Range       | Typical devices               |
| ----------- | ----------- | ----------------------------- |
| Compact     | 0-599px     | Phone portrait                |
| Medium      | 600-839px   | Phone landscape, small tablet |
| Expanded    | 840-1199px  | Tablet, small desktop         |
| Large       | 1200-1599px | Desktop                       |
| Extra-large | 1600px+     | Large desktop, ultrawide      |

- **How to verify**: (a) All breakpoints are defined and documented. (b) Layout adapts at each breakpoint (not just scales). (c) Touch targets scale appropriately. (d) Navigation pattern changes at appropriate breakpoints. (e) Content priority shifts are intentional.
- **Common violations**: Only one mobile breakpoint; layout that breaks between defined breakpoints; content that overflows at specific widths; fixed-width elements that do not adapt.

### 3.6 Dark Mode Considerations

- **Description**: Dark mode uses light-colored text and UI elements on dark backgrounds. It is not simply an inversion of light mode.
- **Key principles**: (a) Use desaturated colors (high saturation vibrates against dark backgrounds). (b) Reduce elevation differentiation (lighter surfaces are elevated). (c) Ensure contrast ratios still meet WCAG requirements. (d) Avoid pure black (#000000) backgrounds -- use dark gray (#121212 or similar). (e) White text on dark backgrounds should be slightly reduced opacity for large areas.
- **How to verify**: (a) All WCAG contrast requirements met in dark mode. (b) Semantic colors adjusted for dark backgrounds. (c) Images and illustrations are appropriate for dark mode. (d) Shadows replaced with lighter surface colors for elevation. (e) User preference (system/manual) is respected.
- **Common violations**: Pure black backgrounds; saturated colors that vibrate; images with transparent backgrounds and dark elements; logos that disappear; contrast failures unique to dark mode; forced dark mode without opt-out.

### 3.7 Screen States

#### Empty States

- **Description**: What users see when there is no content to display.
- **Best practices**: (a) Explain why it is empty. (b) Provide a primary action to add content. (c) Use illustration or icon to soften the experience. (d) Distinguish first-use empty from cleared/filtered-empty.
- **Common violations**: Blank screen; "No data" text only; no action to create first item; same empty state for all contexts.

#### Loading States

- **Description**: Visual indication that content or action results are being loaded.
- **Best practices**: (a) Skeleton screens for initial loads (preferable to spinners). (b) Inline spinners for section-level loads. (c) Progress bars for determinate operations. (d) Optimistic updates for interactive operations. (e) Show loading within 100ms if operation is not instant.
- **Common violations**: Full-screen spinner blocking all interaction; no loading state at all; loading indicator that persists after load; layout shift when content loads.

#### Error States

- **Description**: Visual indication that something has gone wrong.
- **Best practices**: (a) Explain what went wrong in plain language. (b) Provide a recovery action (retry, go back, contact support). (c) Preserve user input. (d) Use inline errors for field-level issues. (e) Use banner/toast for page-level issues.
- **Common violations**: "Something went wrong" with no recovery path; clearing form data on error; error toast that auto-dismisses too quickly; only showing error after full form submission.

---

## 4. Navigation and Information Architecture

### 4.1 Navigation Patterns

#### Top Navigation (Horizontal Nav Bar)

- **When to use**: Web apps with 2-7 top-level destinations; marketing/content sites.
- **Best practices**: Limit items; use dropdown for secondary items; highlight current section; include logo/home link.
- **Common violations**: More than 7 top-level items; no active state indicator; dropdown that requires hover on touch devices.

#### Side Navigation (Sidebar/Drawer)

- **When to use**: Enterprise applications with many sections; admin panels; tools with hierarchical content.
- **Best practices**: Collapsible for space efficiency; group items with headers; persistent on desktop, drawer on mobile; show active state; limit nesting depth to 2 levels.
- **Common violations**: Nesting deeper than 2 levels; no collapse option; sidebar that pushes content on mobile; inconsistent icon + label treatment.

#### Bottom Navigation (Tab Bar)

- **When to use**: Mobile apps with 3-5 primary destinations.
- **Best practices**: 3-5 items only; use icon + label; highlight active tab; avoid gestures that conflict; fixed position (does not scroll away).
- **Common violations**: More than 5 items; label-only or icon-only items; hiding bottom nav on scroll; inconsistent badge treatment.

#### Breadcrumbs

- **When to use**: Hierarchical content structures with depth greater than 2.
- **Best practices**: Show full path or truncate middle; each level is a link; current page is not linked; separator is clear.
- **Common violations**: Breadcrumbs on flat structures; inconsistent with actual hierarchy; non-clickable intermediate levels; breadcrumbs that do not match navigation path.

#### Tabs

- **When to use**: Switching between related content at the same level; filtering views.
- **Best practices**: 2-6 tabs visible; horizontal scrolling for overflow; clear active state; content changes without page load; tab order matches logical order.
- **Common violations**: Too many tabs causing overflow without scroll indication; tabs that trigger navigation to different pages; inconsistent tab content structure; nested tabs.

### 4.2 Screen Transition Patterns and Animations

- **Principles**: (a) Transitions should communicate spatial relationships. (b) Duration: 100-300ms for most transitions (200ms is typical). (c) Easing: Ease-out for entering, ease-in for exiting, ease-in-out for moving. (d) Transitions should not block interaction. (e) Respect user preference for reduced motion (prefers-reduced-motion).
- **How to verify**: (a) Transitions are meaningful, not decorative. (b) Duration is under 300ms for most UI transitions. (c) Reduced motion preference is respected. (d) No animation causes content to be inaccessible. (e) Forward/back navigation has directional consistency.
- **Common violations**: Long animation delays before content is interactive; animations that cannot be disabled; inconsistent transition directions; animation that causes motion sickness; decorative animation on frequently used paths.

### 4.3 User Flow Design Principles

- **Single primary action per screen**: Each screen should have one clear primary action.
- **Progressive disclosure**: Show only what is needed now; reveal complexity as needed.
- **Minimize steps**: Each additional step loses users (approximately 20% drop per step in conversion funnels).
- **Clear wayfinding**: Users should always know where they are, where they came from, and where they can go.
- **Dead-end prevention**: Every screen should offer a path forward or back.
- **How to verify**: (a) Flow diagrams show all paths including error cases. (b) Each screen has a clear primary CTA. (c) Back navigation is always possible. (d) Step count is minimized. (e) Progress indication exists for multi-step flows.
- **Common violations**: Screens with no clear primary action; wizard flows with no progress indicator; dead-end error pages; flows that require starting over on any error.

### 4.4 Wayfinding and Orientation

- **Description**: Users must always be able to answer: Where am I? How did I get here? Where can I go?
- **Mechanisms**: Page titles, breadcrumbs, navigation highlighting, URL structure (web), back button behavior, section headers.
- **How to verify**: (a) Current location is always visible (nav highlight, breadcrumb, title). (b) Page title matches navigation label. (c) URL reflects location (web). (d) Back button behavior is predictable. (e) Deep links land on pages with full context.
- **Common violations**: No indication of current page in navigation; page title that does not match nav item; back button going to unexpected location; deep-linked pages lacking context or navigation.

---

## 5. Interaction Design

### 5.1 Form Design Best Practices

- **Layout**: Single-column layout preferred (37% faster completion than multi-column per Baymard Institute research). Left-aligned labels for long/complex forms; top-aligned labels for short forms. Group related fields.
- **Labels**: Always visible (not placeholder-only). Associated with fields via `for`/`id` or `aria-labelledby`. Descriptive but concise.
- **Validation**: Inline, real-time validation after the field loses focus (not on every keystroke). Error messages next to the field. Clearly indicate required vs. optional (mark the minority -- if most are required, mark optional ones).
- **Input types**: Use appropriate HTML input types (email, tel, number, date) to trigger correct mobile keyboards. Use select/radio for fewer than 7 options; autocomplete/search for more.
- **Submit**: Primary action button at the bottom of the form. Label should describe the action ("Create Account", not "Submit"). Disable or show loading state during submission to prevent double submission.
- **How to verify**: (a) All fields have visible labels. (b) Required fields are indicated. (c) Validation messages appear inline. (d) Input types match data type. (e) Tab order is logical. (f) Form preserves data on error.
- **Common violations**: Placeholder-only labels; validation only on submit; "Submit" as button label; multi-column form on mobile; required indicator on every field when only one is optional; loss of entered data on validation failure.

### 5.2 Button Hierarchy and Placement

- **Hierarchy**: Primary (high emphasis, filled), Secondary (medium emphasis, outlined/tonal), Tertiary (low emphasis, text-only). One primary button per context.
- **Placement**: Primary action on the right in dialog boxes (Windows convention) or on the right/leading edge following platform convention. Destructive actions separated visually and positionally from constructive actions.
- **Sizing**: Minimum touch target 48x48dp mobile, 44x44pt iOS, 32px height desktop. Full-width buttons only when appropriate (mobile CTAs, single-column forms). Avoid full-width as default.
- **How to verify**: (a) Only one primary button per visible context. (b) Button hierarchy is visually distinct. (c) Destructive actions are visually differentiated (often red) and separated. (d) Button labels are action-oriented verbs. (e) Loading/disabled states exist.
- **Common violations**: Multiple primary-styled buttons on one screen; "OK" / "Cancel" instead of descriptive labels; destructive button adjacent to primary; full-width buttons by default; icon-only buttons without tooltip or aria-label.

### 5.3 Feedback Mechanisms

#### Toast / Snackbar

- **When to use**: Non-critical, temporary notifications. Action confirmations. Background process completion.
- **Best practices**: Auto-dismiss after 4-8 seconds. Include undo action when applicable. Do not block content. Stack or queue multiple toasts. Position at bottom or top consistently.
- **Common violations**: Toast for critical errors; auto-dismiss too fast for the message length; toast that blocks interactive elements; no way to review dismissed toasts.

#### Modal / Dialog

- **When to use**: Critical decisions requiring user attention. Confirmation of destructive actions. Focused sub-tasks that must complete before returning.
- **Best practices**: Clear title and description. Limit to one primary action. Dismissible via close button and overlay click (non-destructive) or only via explicit action (destructive). Focus trapped within modal. Scrollable content if needed.
- **Common violations**: Modal for non-critical information; nested modals; modal without close button; modal that opens on page load; modal with too much content; modal for simple yes/no that could be inline.

#### Inline Feedback

- **When to use**: Form validation errors. Field-level status. Contextual help. Real-time data changes.
- **Best practices**: Appears immediately adjacent to the relevant element. Persists until resolved. Uses color + icon + text (not color alone). Does not shift layout unexpectedly.
- **Common violations**: Inline error that causes layout shift; error messages far from the source field; disappearing on focus instead of on resolution; color-only feedback.

### 5.4 Micro-Interactions

- **Description**: Small, single-purpose animations/feedback that enhance the feeling of direct manipulation.
- **Examples**: Button press states, toggle animations, pull-to-refresh, like/heart animation, character count approaching limit.
- **Principles**: (a) Trigger: user action or system event. (b) Rules: what happens in response. (c) Feedback: visual/haptic/audio response. (d) Loops/modes: what happens on repeat or state change.
- **How to verify**: (a) Micro-interactions reinforce system state, not just decorate. (b) They respect reduced motion preferences. (c) They do not delay primary interaction. (d) They are consistent across similar interactions.
- **Common violations**: Decorative animations that delay interaction; inconsistent press states; animation that plays once but not on repeat interactions; micro-interactions that distract from the primary task.

### 5.5 Gesture Patterns (Mobile/Touch)

| Gesture          | Common use                       | Platform notes                       |
| ---------------- | -------------------------------- | ------------------------------------ |
| Tap              | Primary action                   | Universal                            |
| Double tap       | Zoom, like                       | Avoid for essential actions          |
| Long press       | Context menu, selection          | More common on Android               |
| Swipe horizontal | Navigate, delete, reveal actions | iOS: swipe actions; Android: similar |
| Swipe vertical   | Scroll, dismiss                  | Universal                            |
| Pinch            | Zoom in/out                      | Maps, images, documents              |
| Pull down        | Refresh                          | Universal (pull-to-refresh)          |
| Drag             | Reorder, move                    | Needs handle affordance              |

- **How to verify**: (a) All gestures have visual affordances or discoverability. (b) No gesture is the only way to perform an action (accessibility). (c) Gestures do not conflict with system gestures. (d) Gesture areas are large enough.
- **Common violations**: Swipe-only delete with no alternative; gesture conflicting with system back (Android) or swipe-back (iOS); no visual hint that swipe is available; drag targets too small.

### 5.6 Keyboard Navigation and Shortcuts

- **Tab order**: Follows visual order (left-to-right, top-to-bottom for LTR languages). All interactive elements are reachable by Tab. Skip navigation links for repetitive elements.
- **Focus indicators**: Always visible; minimum 3:1 contrast against adjacent colors; not removed via `outline: none` without a replacement.
- **Standard shortcuts**: Follow platform conventions (Ctrl/Cmd+Z undo, Ctrl/Cmd+S save, Ctrl/Cmd+F find, Escape to close/cancel).
- **Custom shortcuts**: Discoverable via help overlay or tooltip. Do not conflict with browser/OS shortcuts. Configurable when possible.
- **How to verify**: (a) All interactive elements reachable by keyboard. (b) Focus indicator is always visible. (c) Tab order matches visual order. (d) Escape closes modals/popups. (e) No keyboard traps (except intentional focus traps like modals).
- **Common violations**: Custom components not keyboard accessible; focus indicator removed for aesthetics; tab order that does not match visual order; keyboard traps; custom shortcuts overriding browser shortcuts.

---

## 6. Accessibility (WCAG 2.2)

### 6.1 POUR Principles

#### Perceivable

- **Description**: Information and UI components must be presentable to users in ways they can perceive.
- **Key requirements**: (a) Text alternatives for non-text content. (b) Captions and alternatives for multimedia. (c) Content adaptable to different presentations (e.g., screen reader). (d) Content distinguishable (color contrast, text sizing, audio control).
- **How to verify**: All images have alt text; videos have captions; color is not sole information carrier; contrast ratios meet requirements; text is resizable.
- **Common violations**: Decorative images with empty alt; missing video captions; information conveyed only by color; insufficient contrast; fixed font sizes.

#### Operable

- **Description**: UI components and navigation must be operable by all users.
- **Key requirements**: (a) All functionality via keyboard. (b) Users have enough time to read and use content. (c) Content does not cause seizures or physical reactions. (d) Users can navigate, find content, and determine where they are. (e) Input modalities beyond keyboard are supported.
- **How to verify**: Keyboard-only navigation testing; no auto-play without control; no flashing content exceeding 3 per second; skip links present; focus order logical.
- **Common violations**: Mouse-only interactions; auto-advancing carousels without pause; flash/strobe effects; no skip navigation; illogical focus order.

#### Understandable

- **Description**: Information and operation of UI must be understandable.
- **Key requirements**: (a) Text is readable and understandable. (b) Content appears and operates in predictable ways. (c) Users are helped to avoid and correct mistakes.
- **How to verify**: Language attribute set; content written at appropriate reading level; navigation is consistent across pages; form errors are clearly described; labels and instructions are clear.
- **Common violations**: Missing lang attribute; inconsistent navigation; cryptic error messages; auto-submitting forms; unexpected context changes.

#### Robust

- **Description**: Content must be robust enough to be reliably interpreted by a wide variety of user agents, including assistive technologies.
- **Key requirements**: (a) Valid HTML. (b) Proper use of ARIA roles, states, and properties. (c) Status messages communicated programmatically.
- **How to verify**: HTML validation; ARIA usage follows authoring practices; custom components expose proper roles; dynamic content changes announced by screen readers.
- **Common violations**: Invalid HTML; ARIA misuse (wrong roles, missing states); custom widgets without proper semantics; dynamic updates not announced.

### 6.2 Focus Management

- **Description**: Programmatic control of keyboard focus to guide users through dynamic content changes.
- **Key scenarios**: (a) Modal open: focus moves to modal. (b) Modal close: focus returns to trigger. (c) Inline content added: focus moves to new content or announced. (d) Page navigation in SPA: focus moves to main content or page title. (e) Delete action: focus moves to logical next item.
- **How to verify**: Open modal and verify focus is inside; close modal and verify focus returns; add/remove dynamic content and verify focus is managed; test SPA navigation with screen reader.
- **Common violations**: Focus remaining behind a modal; focus lost after modal close; SPA page changes not communicated; deleted item leaving focus on invisible element.

### 6.3 Screen Reader Compatibility

- **Key requirements**: (a) Semantic HTML used as first choice (button, nav, main, header, footer, article, section). (b) ARIA landmarks define page structure. (c) Live regions (aria-live) for dynamic updates. (d) Proper heading hierarchy (h1-h6 in order, no skipping). (e) Form inputs have associated labels. (f) Tables have proper headers (th, scope). (g) Custom components implement ARIA authoring practices.
- **How to verify**: Navigate entire UI with screen reader (VoiceOver, NVDA, TalkBack); verify all content is announced; verify interactive elements are properly described; verify dynamic changes are announced.
- **Common violations**: div/span used instead of semantic elements; missing landmarks; heading levels skipped (h1 to h3); unlabeled form inputs; complex tables without proper headers; custom components without ARIA.

### 6.4 Touch Target Sizes

| Standard               | Minimum            | Recommended      |
| ---------------------- | ------------------ | ---------------- |
| WCAG 2.2 AA (SC 2_5_8) | 24x24 CSS px       | 44x44 CSS px     |
| WCAG 2.2 AAA           | 44x44 CSS px       | 48x48 CSS px     |
| Android (Material)     | 48x48 dp           | 48x48 dp         |
| iOS (Apple HIG)        | 44x44 pt           | 44x44 pt         |
| Windows (Fluent)       | 32x32 px (pointer) | 40x40 px (touch) |

- **How to verify**: Measure interactive element sizes including padding; verify spacing between adjacent targets (at least 8dp/pt between edges); test with actual touch devices.
- **Common violations**: Icon buttons without padding; inline text links with no touch padding; closely spaced action items; checkboxes/radio buttons at native size without enlarged tap area.

### 6.5 Color Contrast Requirements

See Section 3.3 for detailed contrast ratio table.

Additional WCAG 2.2 considerations:

- **Focus appearance (SC 2_4_11 AA, SC 2_4_12 AAA)**: Focus indicator must have an area at least as large as a 2px thick perimeter of the unfocused component and a contrast ratio of at least 3:1 against adjacent colors.
- **Dragging movements (SC 2_5_7 AA)**: Any action achievable via dragging must also be achievable via a single pointer action (click/tap).
- **Consistent help (SC 3_2_6 A)**: If a help mechanism is provided across multiple pages, it must be in the same relative position.
- **Redundant entry (SC 3_3_7 A)**: Information previously entered by or provided to the user should be auto-populated or available for selection.

---

## 7. Anti-Patterns

### 7.1 Layout Anti-Patterns

| Anti-pattern                | Description                                                  | Impact                                            | Detection                                                          |
| --------------------------- | ------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------ |
| **Mystery meat navigation** | Navigation items with no text labels, only cryptic icons     | Users cannot discover features; high error rate   | Check all nav items have text labels or clear tooltips             |
| **False bottom**            | Layout suggests content ends when more exists below the fold | Users miss content; reduced engagement            | Verify no full-bleed sections create false termination cues        |
| **Trapped in space**        | Excessive white space that breaks visual grouping            | Content appears disconnected; reading flow breaks | Check spacing ratios between related vs. unrelated elements        |
| **Overloaded interface**    | Too many elements competing for attention                    | Decision paralysis; increased error rate          | Count distinct visual elements per screen; verify clear hierarchy  |
| **Inconsistent alignment**  | Mixed alignment systems on one screen                        | Visual noise; reduced trust                       | Check all elements align to a defined grid                         |
| **Content shifting**        | Layout moves as content loads (Cumulative Layout Shift)      | Accidental clicks; disorientation                 | Measure CLS score (target <0.1); reserve space for dynamic content |

### 7.2 Form Anti-Patterns

| Anti-pattern                  | Description                                      | Impact                                           | Detection                                                       |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------- |
| **Unnecessary fields**        | Collecting data not needed for the task          | Increased abandonment (each field adds friction) | Audit each field for necessity; remove or defer optional fields |
| **Placeholder-only labels**   | Using placeholder text as the sole label         | Label disappears on input; accessibility failure | Check all inputs have persistent visible labels                 |
| **Premature validation**      | Showing errors before user finishes input        | Frustration; perceived hostility                 | Verify validation triggers on blur, not on keystroke            |
| **Submit-only validation**    | Deferring all validation to form submission      | Users must find and fix errors after effort      | Verify inline validation exists for key fields                  |
| **Ambiguous required fields** | Not clearly indicating which fields are required | Users guess; submission errors                   | Check required/optional marking is clear and consistent         |
| **Reset button**              | Including a reset/clear button near submit       | Accidental data loss                             | Verify no reset button exists, or it requires confirmation      |
| **Infinite form**             | Single page with 20+ fields and no grouping      | Cognitive overload; abandonment                  | Check form length; verify grouping and progressive disclosure   |

### 7.3 Navigation Anti-Patterns

| Anti-pattern             | Description                                                  | Impact                                          | Detection                                              |
| ------------------------ | ------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------ |
| **Dead ends**            | Screens with no forward navigation or back path              | Users are stuck; must use browser back or close | Verify every screen has a clear exit path              |
| **Deep nesting**         | Navigation requiring 5+ levels to reach content              | Content is hard to find and return to           | Check max navigation depth; target 3 levels maximum    |
| **Broken back button**   | SPA or custom navigation that breaks browser/OS back         | Users lose orientation; data loss               | Test back button at every navigation point             |
| **Overloaded tabs**      | Too many tabs causing horizontal overflow without indication | Users do not realize more tabs exist            | Check tab count; verify scroll indicators for overflow |
| **Invisible navigation** | Navigation hidden behind gestures or hover-only triggers     | Discovery failure; mobile users stuck           | Verify all navigation is visible or has clear toggle   |
| **Ambiguous links**      | "Click here", "Read more" without context                    | Accessibility failure; confusion                | Check link text is descriptive out of context          |

### 7.4 Feedback Anti-Patterns

| Anti-pattern              | Description                                                | Impact                                          | Detection                                                       |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| **Silent failure**        | Action fails without any user notification                 | Users assume success; data loss                 | Verify all error paths have visible feedback                    |
| **Modal abuse**           | Using modals for every notification including non-critical | Interruption fatigue; dismissed without reading | Audit modal usage; toasts/inline for non-critical               |
| **Auto-dismiss critical** | Critical errors in auto-dismissing toasts                  | Users miss important information                | Verify critical messages persist until dismissed                |
| **Confirmation fatigue**  | Confirmation dialog for every action                       | Users click through without reading             | Reserve confirmation for destructive/irreversible actions only  |
| **Vague errors**          | "An error occurred" with no specifics                      | Users cannot self-recover                       | Check all error messages include what went wrong and what to do |
| **Blocking spinners**     | Full-screen spinner preventing all interaction             | Users cannot cancel or navigate away            | Verify loading states are scoped and cancellable                |

### 7.5 Mobile-Specific Anti-Patterns

| Anti-pattern                   | Description                                                     | Impact                                             | Detection                                                        |
| ------------------------------ | --------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| **Tiny targets**               | Interactive elements smaller than 44x44pt/48x48dp               | Misclicks; frustration; accessibility failure      | Measure all interactive elements including padding               |
| **Thumb-zone ignorance**       | Important actions in hard-to-reach screen areas                 | Single-hand use is difficult                       | Map actions to thumb-zone heatmap; primary actions in easy reach |
| **Horizontal scroll surprise** | Content exceeding viewport width without indication             | Users do not discover content; layout feels broken | Test at all supported widths; check for overflow                 |
| **Non-native patterns**        | iOS patterns on Android or vice versa                           | Unfamiliar interactions; user confusion            | Verify platform-appropriate patterns                             |
| **Splash screen abuse**        | Long splash screens or interstitials before content             | Abandonment; perception of slowness                | Measure time-to-interactive; splash under 2 seconds              |
| **Gesture-only actions**       | Actions only achievable via gestures with no button alternative | Accessibility failure; discoverability failure     | Verify all gestures have a visible alternative                   |

### 7.6 Performance Anti-Patterns

| Anti-pattern                         | Description                                  | Impact                                | Detection                                                    |
| ------------------------------------ | -------------------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| **Layout shift (CLS)**               | Content moves as additional resources load   | Misclicks; disorientation             | Measure CLS (Core Web Vital; target <0.1)                    |
| **Flash of unstyled content (FOUC)** | Content briefly appears without styles       | Perceived jank; reduced trust         | Test on throttled connection; verify critical CSS            |
| **Render blocking**                  | Large JS/CSS bundles blocking initial render | Slow perceived load; user abandonment | Measure FCP, LCP; verify code splitting                      |
| **Unoptimized images**               | Large image files causing slow load          | Data waste; slow paint                | Check image sizes, formats (WebP/AVIF), lazy loading         |
| **Unnecessary re-renders**           | UI updating more frequently than needed      | Jank; battery drain on mobile         | Profile render frequency; verify memoization                 |
| **Memory leaks**                     | Growing memory usage over session duration   | Slowdown; crashes on long sessions    | Monitor memory usage over time; check for detached DOM nodes |

### 7.7 Dark Patterns (Manipulative UI)

These are unethical design patterns that trick users. They should always be flagged as critical violations.

| Dark pattern          | Description                                                                    | Detection                                                   |
| --------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **Confirmshaming**    | Opt-out option uses guilt-inducing language ("No, I don't want to save money") | Check opt-out language for neutrality                       |
| **Roach motel**       | Easy to sign up, difficult to cancel or unsubscribe                            | Verify cancellation is as easy as registration              |
| **Trick questions**   | Confusing wording or double negatives to mislead                               | Review all checkbox/toggle labels for clarity               |
| **Sneak into basket** | Items added to cart without user action                                        | Verify cart only contains user-selected items               |
| **Hidden costs**      | Fees revealed only at checkout                                                 | Verify price transparency throughout flow                   |
| **Bait and switch**   | Promised action does something different                                       | Verify action outcomes match labels/descriptions            |
| **Forced continuity** | Free trial auto-converts to paid without clear notice                          | Verify clear trial-end notification and easy cancellation   |
| **Misdirection**      | Drawing attention to one thing to distract from another                        | Verify primary action alignment with user intent            |
| **Privacy zuckering** | Default settings that share maximum data                                       | Verify privacy defaults are restrictive; opt-in not opt-out |
| **Obstruction**       | Making unsubscribe/delete/cancel artificially difficult                        | Verify destructive-for-business actions are accessible      |
| **Nagging**           | Repeated interruptions to push a specific action                               | Count interruption frequency; verify dismissibility         |

---

## 8. UI/UX Specification Formats

### 8.1 How to Document UI Specs Effectively

A UI specification should enable unambiguous implementation. Required elements:

1. **Screen inventory**: Enumerated list of all screens/views with unique identifiers (SCR-001, SCR-002).
2. **Screen flow diagram**: Mermaid or similar showing navigation between screens, including conditions and error paths.
3. **Per-screen specification**: For each screen:
   - Screen ID and name
   - Purpose / user goal
   - Entry conditions (how does the user get here?)
   - Layout description or wireframe reference
   - Component inventory (what components appear?)
   - Data requirements (what data is displayed/collected?)
   - Interaction specifications (what happens on click/tap/hover?)
   - State variations (empty, loading, error, success, partial)
   - Exit paths (where can the user go from here?)
   - Responsive behavior (how does layout change at breakpoints?)
   - Accessibility requirements (focus order, aria labels, landmarks)
4. **Shared component specifications**: Reusable components specified once and referenced.
5. **Design token references**: Colors, typography, spacing linked to the design token system.

### 8.2 Design Token Systems

#### Structure

Design tokens are organized in three tiers:

1. **Global / Reference tokens**: Raw values (color-blue-500: #2196F3, spacing-4: 16px).
2. **Alias / Semantic tokens**: Purpose-mapped (color-primary: color-blue-500, spacing-md: spacing-4).
3. **Component tokens**: Component-specific (button-primary-bg: color-primary, button-padding-x: spacing-md).

#### Naming Conventions

```
[category]-[property]-[variant]-[state]

Examples:
color-text-primary
color-text-primary-disabled
color-bg-surface
color-bg-surface-elevated
spacing-inline-sm
spacing-stack-md
typography-body-md-font-size
typography-body-md-line-height
elevation-shadow-sm
border-radius-md
```

#### How to verify

- (a) Token names follow the defined convention.
- (b) No hard-coded values exist in component code (all reference tokens).
- (c) Semantic tokens exist for all use cases (text, background, border, interactive states).
- (d) Dark mode tokens map semantic names to alternate values.
- (e) Platform-specific token output exists (CSS custom properties, XML resources, Swift/Kotlin constants).

### 8.3 Component Specification Format

For each shared component, specify:

| Attribute           | Content                                                           |
| ------------------- | ----------------------------------------------------------------- |
| Name                | Unique name (e.g., PrimaryButton)                                 |
| Description         | Purpose and when to use                                           |
| Visual reference    | Link to design file or inline spec                                |
| Props / API         | All configurable properties with types, defaults, and constraints |
| Variants            | Visual/behavioral variants (size, color, state)                   |
| States              | Default, hover, focus, active, disabled, loading, error           |
| Tokens              | Design tokens consumed                                            |
| Responsive behavior | How component adapts across breakpoints                           |
| Accessibility       | ARIA role, keyboard interaction, screen reader announcement       |
| Do / Don't          | Usage guidelines with examples                                    |

### 8.4 Screen Flow Documentation Methods

1. **Mermaid flowcharts**: For inclusion in markdown-based specs.
   ```
   flowchart TD
     A[Login Screen] -->|Valid credentials| B[Dashboard]
     A -->|Invalid credentials| C[Error State]
     C -->|Retry| A
     B -->|Logout| A
   ```
2. **State diagrams**: For complex stateful interactions.
3. **Sequence diagrams**: For multi-actor interactions (user, frontend, backend).
4. **User story maps**: Jeff Patton format -- horizontal axis is user activities, vertical axis is priority/iteration.

### 8.5 Handoff Formats Between Design and Development

- **Design file links**: Figma/Sketch frames with inspect mode access.
- **Redline specifications**: Annotated screenshots with exact measurements (often auto-generated).
- **Token mapping table**: Maps design values to code tokens.
- **Interaction specification**: Written descriptions or prototypes for all states and transitions.
- **Asset export**: Icons, illustrations, images in required formats and resolutions (1x, 2x, 3x for mobile; SVG preferred for web).
- **Acceptance criteria alignment**: Each screen should trace back to user stories and acceptance criteria (REQ/AC traceability).

---

## 9. Review and Audit Frameworks

### 9.1 Heuristic Evaluation Methodology

**Process**:

1. Define the scope (entire app, specific flow, single screen).
2. Select evaluators (3-5 for reliable coverage; ideally UX specialists).
3. Each evaluator independently reviews against a heuristic set (Nielsen's 10 or custom).
4. Each finding is rated by severity: 0 (not a problem) to 4 (usability catastrophe).
5. Findings are consolidated, deduplicated, and prioritized.

**Severity scale**:
| Rating | Description | Action |
| --- | --- | --- |
| 0 | Not a usability problem | None |
| 1 | Cosmetic problem | Fix if time allows |
| 2 | Minor usability problem | Low priority fix |
| 3 | Major usability problem | High priority fix |
| 4 | Usability catastrophe | Must fix before release |

**QFAI application**: Map each heuristic violation to a specific heuristic ID (H1-H10), severity rating, screen/component reference, and recommended fix.

### 9.2 Cognitive Walkthrough Process

**Process**:

1. Define user personas and their goals.
2. Define the task sequence (step-by-step actions required to complete the goal).
3. At each step, evaluate:
   - Will the user try to achieve the right effect? (Goal formation)
   - Will the user notice the correct action is available? (Visibility)
   - Will the user associate the correct action with the desired effect? (Mapping)
   - If the correct action is performed, will the user see that progress is being made? (Feedback)
4. Document failures at each step with severity and recommendation.

**QFAI application**: For each user story, define the cognitive walkthrough as part of the acceptance criteria. Verify that each step in the user flow passes all four questions.

### 9.3 Usability Testing Frameworks

| Method              | When                                | Sample size       | Duration              |
| ------------------- | ----------------------------------- | ----------------- | --------------------- |
| Moderated in-person | Detailed qualitative insights       | 5-8 per round     | 60-90 min per session |
| Moderated remote    | Geographic diversity                | 5-8 per round     | 45-60 min per session |
| Unmoderated remote  | Quantitative + behavioral data      | 20-50+            | 15-30 min per session |
| A/B testing         | Comparing specific design choices   | 1000+ per variant | Depends on traffic    |
| Card sorting        | Information architecture validation | 15-30             | 20-30 min             |
| Tree testing        | Navigation structure validation     | 50+               | 10-15 min             |
| First-click testing | Findability of specific targets     | 30-50             | 5-10 min              |

**Key metrics**: Task success rate, time on task, error rate, System Usability Scale (SUS) score, Net Promoter Score (NPS), task-level satisfaction.

### 9.4 Automated Accessibility Testing

#### What automated tools CAN catch (approximately 30-40% of WCAG issues)

- Missing alt text on images
- Insufficient color contrast
- Missing form labels
- Missing document language
- Empty links and buttons
- Duplicate IDs
- Missing ARIA required attributes
- Invalid ARIA attribute values
- Heading level order violations
- Missing page title
- Tables without headers

#### What automated tools CANNOT catch (approximately 60-70% of WCAG issues)

- Quality/accuracy of alt text
- Keyboard navigation flow and usability
- Screen reader announcement quality
- Focus management in dynamic content
- Correct use of ARIA patterns
- Reading order of content
- Meaningful content structure
- Error message quality and placement
- Touch target adequacy in context
- Cognitive accessibility
- Motion/animation accessibility
- Complex widget keyboard interaction

#### Recommended tool stack

| Tool                     | Type                       | Coverage                    |
| ------------------------ | -------------------------- | --------------------------- |
| axe-core                 | Library (integrable in CI) | Automated rules             |
| Lighthouse               | Browser tool / CI          | Performance + accessibility |
| pa11y                    | CLI / CI                   | Automated rules             |
| WAVE                     | Browser extension          | Visual overlay of issues    |
| VoiceOver                | macOS/iOS screen reader    | Manual testing              |
| NVDA                     | Windows screen reader      | Manual testing              |
| TalkBack                 | Android screen reader      | Manual testing              |
| Colour Contrast Analyser | Desktop tool               | Contrast checking           |

### 9.5 Design System Audit Checklist

#### Token audit

- [ ] All color, typography, spacing, elevation, border tokens are defined
- [ ] Tokens follow naming convention
- [ ] No hard-coded values in component implementations
- [ ] Dark mode and high contrast tokens exist
- [ ] Platform-specific token outputs exist

#### Component audit

- [ ] All components are documented with specification format
- [ ] All states are defined (default, hover, focus, active, disabled, loading, error)
- [ ] Components meet accessibility requirements
- [ ] Components are responsive
- [ ] Components have consistent API patterns

#### Pattern audit

- [ ] Navigation patterns are consistent across the application
- [ ] Form patterns are consistent
- [ ] Feedback patterns are consistent (toast, modal, inline)
- [ ] Loading state patterns are consistent
- [ ] Error state patterns are consistent
- [ ] Empty state patterns are consistent

#### Accessibility audit

- [ ] All pages meet WCAG 2.2 AA contrast requirements
- [ ] Keyboard navigation works throughout
- [ ] Screen reader testing completed on primary flows
- [ ] Focus management verified for all dynamic content
- [ ] Touch targets meet minimum size requirements
- [ ] Reduced motion preferences respected
- [ ] High contrast mode supported (Windows)

---

## 10. Emerging Trends (2025-2026)

### 10.1 AI-Assisted Interfaces

- **Description**: AI integration into UI through conversational interfaces, predictive actions, content generation, and intelligent defaults.
- **Key principles**: (a) Transparency: always indicate when content is AI-generated. (b) User control: AI suggestions are suggestions, not actions. (c) Graceful fallback: AI features degrade gracefully when unavailable. (d) Correction mechanisms: users can easily correct AI outputs. (e) Confidence indication: show certainty levels when appropriate.
- **How to verify**: (a) AI-generated content is labeled. (b) Users can override AI suggestions. (c) AI features have non-AI alternatives. (d) Error rates for AI features are monitored. (e) Feedback mechanisms exist for AI quality improvement.
- **Common violations**: AI actions taken without user consent; AI-generated content not distinguishable from human content; no way to correct AI errors; AI features that block functionality when unavailable.

### 10.2 Voice and Multimodal UI

- **Description**: Interfaces that combine visual, voice, gesture, and other input modalities.
- **Key principles**: (a) Multimodal equivalence: all critical actions achievable via multiple modalities. (b) Context awareness: adapt modality to environment (voice in hands-free, touch in noisy). (c) Feedback modality matching: respond in the same modality as input when possible. (d) Progressive enhancement: voice/gesture enhances, not replaces, visual UI.
- **How to verify**: (a) Primary flows work with touch/pointer only. (b) Voice commands have visual equivalents. (c) Feedback is provided in appropriate modality. (d) Handoff between modalities is seamless.
- **Common violations**: Voice-only features with no visual alternative; visual-only features with no voice equivalent where expected; jarring modality transitions; voice UI without visual feedback.

### 10.3 Spatial Computing Considerations

- **Description**: UI design for AR, VR, and mixed reality environments (Apple Vision Pro, Meta Quest, etc.).
- **Key principles**: (a) Depth and spatial anchoring: UI elements exist in 3D space. (b) Ergonomics: content in comfortable viewing zones (arm's length, 15 degrees below eye level for primary content). (c) Input: eye tracking, hand gestures, voice. (d) Comfort: avoid UI that requires sustained arm raising or head turning. (e) Mixed reality: UI that coexists with the real world.
- **How to verify**: (a) Primary content is in the comfort zone. (b) Input methods are not fatiguing. (c) UI adapts to environment (lighting, space). (d) Text remains legible at viewing distance. (e) Motion does not cause discomfort.
- **Common violations**: UI too far away or too close; small text in spatial UI; UI requiring sustained physical effort; ignoring real-world occlusion; overwhelming spatial UI density.

### 10.4 Sustainability in UI Design

- **Description**: Designing digital products with awareness of environmental impact (energy consumption, data transfer, device longevity).
- **Key principles**: (a) Performance optimization reduces energy consumption. (b) Dark mode reduces energy on OLED screens. (c) Efficient media: appropriate image sizes, video compression, lazy loading. (d) Reduced data transfer: caching, efficient APIs, minimal asset sizes. (e) Supporting older devices: lighter resource requirements extend device lifespan.
- **How to verify**: (a) Page weight is minimized (target under 1MB for initial load). (b) Images are optimized (WebP/AVIF, responsive sizes). (c) Unnecessary animations/effects are avoidable. (d) Dark mode is available. (e) Application works on devices 3-4 years old.
- **Common violations**: Multi-megabyte pages; auto-playing video; uncompressed images; requiring latest hardware; animations with no reduced-motion respect; excessive network requests.

---

## Appendix A: Quick Reference -- Verification Checklist Summary

This checklist summarizes key verification points for QFAI review processes.

### Layout and Visual Design

- [ ] Grid system defined and consistently applied
- [ ] Typography scale uses defined ratios; no arbitrary sizes
- [ ] Spacing uses 4px/8px base grid
- [ ] Color contrast meets WCAG 2.2 AA minimum
- [ ] Color is not the sole means of conveying information
- [ ] Dark mode meets all contrast requirements
- [ ] No cumulative layout shift on content load

### Navigation

- [ ] Current location always identifiable
- [ ] Maximum navigation depth is 3 levels
- [ ] All screens have a clear exit path
- [ ] Back button behavior is predictable
- [ ] Primary action is clear on every screen

### Interaction

- [ ] All interactive elements have visible hover/focus states
- [ ] Touch targets meet platform minimums (44pt iOS, 48dp Android, 24px WCAG AA)
- [ ] Forms use single-column layout with visible labels
- [ ] Validation is inline and triggered on blur
- [ ] Destructive actions require confirmation
- [ ] Error messages explain what happened and what to do

### Accessibility

- [ ] Keyboard-only navigation works for all functionality
- [ ] Focus indicators are visible with 3:1 contrast
- [ ] Screen reader can navigate all content
- [ ] Heading hierarchy is correct (no skips)
- [ ] ARIA landmarks define page structure
- [ ] Dynamic content changes are announced
- [ ] Reduced motion preference is respected

### States

- [ ] Empty states are defined with guidance and primary action
- [ ] Loading states use skeleton screens or progress indicators
- [ ] Error states provide recovery path
- [ ] Success states provide confirmation

### Performance

- [ ] Initial load under 3 seconds (typical connection)
- [ ] Interactive response under 100ms for direct manipulation
- [ ] System response under 400ms for most operations
- [ ] Progress indicator shown for operations over 1 second

### Platform Compliance

- [ ] Platform-specific navigation patterns followed
- [ ] Platform typography recommendations applied
- [ ] System theme (light/dark) respected
- [ ] Platform-specific accessibility features supported

---

## Appendix B: Anti-Pattern Severity Classification for QFAI

| Severity     | Category                              | Examples                                                              | Action                   |
| ------------ | ------------------------------------- | --------------------------------------------------------------------- | ------------------------ |
| **Critical** | Dark patterns, accessibility blockers | Confirmshaming, no keyboard access, seizure-inducing content          | Block release            |
| **High**     | Major usability failures              | Dead ends, silent failures, mystery navigation, contrast failures     | Fix before release       |
| **Medium**   | Significant friction                  | Unnecessary form fields, inconsistent patterns, poor error messages   | Fix in current iteration |
| **Low**      | Polish and optimization               | Minor spacing inconsistency, cosmetic alignment, suboptimal animation | Fix when time allows     |

---

_End of UI/UX Best Practices Reference._

_This document is the SSOT for UI/UX quality criteria within the QFAI discussion pack process. It should be updated as guidelines evolve and new platform versions are released._
