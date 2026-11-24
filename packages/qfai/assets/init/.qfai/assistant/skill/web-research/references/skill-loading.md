# How this skill is loaded

What the loader reads of this skill and when, and what happens when the front
matter of its `SKILL.md` does not parse. Read it when a question turns on how
the skill reached the context, or when its front matter fails to parse.

## Progressive Disclosure

SKILL.md files follow a **progressive disclosure** loading strategy:

- **Metadata-only on load**: When the skill roster is scanned, only the YAML
  front-matter (metadata) is parsed. The full body is not read into context.
- **Full body on task start**: The complete skill body is loaded only when the
  user invokes the skill command or a matching task is dispatched.

## Invalid SKILL.md Handling

If the YAML front-matter is **invalid** or produces a **parse error** (malformed
YAML), the loader reports the parse error with its details (the YAML error
message and its location) to the session log and activates
**default behavior** as a fallback. The skill is still listed in the roster
but operates with built-in defaults until the YAML is corrected.
