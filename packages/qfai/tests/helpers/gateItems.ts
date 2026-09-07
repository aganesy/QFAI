/**
 * The numbered items of `qfai-implement`'s 12-point gate, read out of `SKILL.md`.
 *
 * Two suites read the same list for different reasons — one measures how the
 * gate spends its reader's attention, the other binds each item to the box of
 * the final checklist that restates it. Both had their own parser, and the two
 * disagreed on lazy continuation: an item wrapped the way Markdown allows,
 * with the tail unindented, was whole to one and truncated to the other. Which
 * of them is right is a property of the gate, not of the suite asking, so it
 * is decided once here.
 */

/** The heading the gate lives under. */
export const GATE_HEADING = "### Item completion checklist (12-point gate)";

/**
 * What follows the heading, up to the next `##` or `###`.
 *
 * The heading line itself is not in it. Nothing here reads it — an item is
 * found by its number — and leaving it out means a caller cannot mistake it
 * for one.
 */
function gateSection(skill: string): string {
  const start = skill.indexOf(GATE_HEADING);
  if (start === -1) throw new Error(`${GATE_HEADING} not found`);
  const rest = skill.slice(start + GATE_HEADING.length);
  const end = rest.search(/\n#{2,3} /);
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * Each item's body by its own number, continuation lines folded in.
 *
 * An item's body is its numbered line **plus every continuation line** up to
 * the next numbered item. Reading only the numbered line would let a budget be
 * satisfied by wrapping an item the way ordinary Markdown wraps a list item: a
 * short first line and the rest of the text in continuation lines, uncounted,
 * with the gate no lighter to read than before.
 *
 * The list ends where Markdown ends it — a blank line followed by an
 * unindented line — so prose after the last item is excluded. An indented
 * block after a blank line is still the item's own, and counts.
 *
 * Lines are joined with a single space. Runs of whitespace inside a line are
 * left alone; a caller that compares text against a pin should collapse them.
 */
export function gateItems(skill: string): Map<number, string> {
  const items = new Map<number, string>();
  let current: number | undefined;
  let afterBlank = false;

  for (const line of gateSection(skill).split(/\r?\n/)) {
    const match = /^(\d{1,2})\.\s+(.*)$/.exec(line);
    if (match) {
      const [, number, body] = match;
      if (number === undefined || body === undefined) continue;
      current = Number(number);
      // A repeated number would replace the first item and say nothing. The
      // callers count numbers, not lines, so a second `12.` still leaves
      // twelve of them: the parity suite finds no duplicate, the count check
      // passes, and where the two bodies agree the digest does not move
      // either.
      if (items.has(current)) {
        throw new Error(`gate item ${String(current)} is numbered twice`);
      }
      items.set(current, body.trim());
      afterBlank = false;
      continue;
    }
    if (current === undefined) continue;
    if (line.trim() === "") {
      afterBlank = true;
      continue;
    }
    // The list has ended, and so has the parse. Clearing the current item and
    // reading on would take a numbered step in the prose below — a sequencing
    // note, a migration procedure — as a gate item of its own.
    if (afterBlank && !/^\s/.test(line)) break;
    items.set(current, `${items.get(current) ?? ""} ${line.trim()}`.trim());
    afterBlank = false;
  }
  return items;
}

/**
 * The same items in document order, whitespace collapsed.
 *
 * For a caller that compares an item's text against a pinned digest: a rewrap
 * must not move the digest, so the runs of whitespace a rewrap changes are
 * flattened first.
 */
export function gateItemList(skill: string): { number: number; text: string }[] {
  return [...gateItems(skill)].map(([number, text]) => ({
    number,
    text: text.replace(/\s+/g, " "),
  }));
}
