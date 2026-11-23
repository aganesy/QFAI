/**
 * Reading markdown prose for the tests that assert what a shipped document says.
 */

/**
 * The index of the next markdown heading at or after `from`, or `-1`, **ignoring headings inside a
 * fenced block**.
 *
 * Round 19 widened three region terminators from an enumeration of heading levels (`#{2,4}`, `^## `,
 * `#{3}`) to any level, because each was one heading away from round 17's defect. Round 20 showed the
 * widening opened a different hole in the same place: a `# comment` inside a ```text block now ends a
 * section, so a phantom class C member hidden behind one is invisible — round 15's finding restored by
 * the repair for round 19's.
 *
 * A fence ends only at a closing line of its own character, at least as long as the opening run and
 * carrying nothing but whitespace after it, so a triple-backtick example inside a four-backtick block, or
 * a `~~~` line inside a backtick block, stays inside the fence. A fence never closed runs to the end of
 * the text. A heading is a heading only outside a fence, and this is the one place that is decided.
 */
export function nextHeadingAt(text: string, from: number): number {
  let fence: string | undefined;
  let at = from;
  while (at < text.length) {
    const lineEnd = text.indexOf("\n", at);
    const stop = lineEnd === -1 ? text.length : lineEnd;
    const line = text.slice(at, stop);
    if (fence !== undefined) {
      if (closesFence(line, fence)) fence = undefined;
    } else {
      fence = openingFence(line);
      if (fence === undefined && at > from && /^#{1,6} /.test(line)) return at;
    }
    if (lineEnd === -1) return -1;
    at = lineEnd + 1;
  }
  return -1;
}

/** The delimiter run a line opens a fence with, or `undefined` when it opens none. */
function openingFence(line: string): string | undefined {
  const opening = /^ {0,3}(`{3,}|~{3,})([^\n]*)$/.exec(line);
  if (opening === null) return undefined;
  const [, run = "", rest = ""] = opening;
  // A backtick fence's info string cannot hold a backtick; such a line is inline code, not a fence.
  return run.startsWith("`") && rest.includes("`") ? undefined : run;
}

/** Whether `line` closes a fence opened with the delimiter run `fence`. */
function closesFence(line: string, fence: string): boolean {
  const run = /^ {0,3}(`{3,}|~{3,})[ \t\r]*$/.exec(line)?.[1];
  return run !== undefined && run[0] === fence[0] && run.length >= fence.length;
}
