/**
 * Line ceiling for a canonical `SKILL.md`.
 *
 * One number for every skill, defined once. It was previously four literals in
 * three files (240 / 350 / 360 / 400 / 400 / 310, depending on which test you
 * read), which disagreed with each other about the same file and had to be
 * raised one at a time as skills grew.
 *
 * The ceiling is a backstop, not the design rule. The design rule is that a
 * `SKILL.md` stays thin: it states the contract and points at the topic file
 * that carries the detail, under the skill's own `references/`, `templates/` or
 * `examples/` directory. Those files are split by topic too — a single
 * oversized reference is the same problem moved one directory down. A skill
 * approaching this number is a signal to move a section out, not to raise it.
 */
export const SKILL_MD_MAX_LINES = 500;
