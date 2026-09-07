export type Heading = { level: number; title: string; line: number };

export type H2Section = {
  title: string;
  startLine: number;
  endLine: number;
  body: string;
};

/**
 * ATX heading, with the up-to-three leading spaces CommonMark allows. A
 * document that indents a heading — the third space is still a heading, the
 * fourth makes it an indented code block — was read as ordinary prose, so a
 * required-heading gate reported a section the author had written as missing.
 */
const HEADING_RE = /^ {0,3}(#{1,6})\s+(.+?)\s*$/;

/**
 * A fenced code block's opening or closing line: up to three leading spaces,
 * then a run of at least three backticks or tildes.
 *
 * Tracked because a fenced block's CONTENTS are not Markdown, and the heading
 * pattern above cannot tell the difference on its own. The two rules interact
 * badly in one specific and very common case: a YAML comment indented by two
 * spaces — `  # unit | integration | …` — satisfies the heading pattern
 * exactly. Every delta document whose `Verification.Plan` is a fenced YAML
 * block therefore reported a phantom H1 in the middle of that block, and
 * `readHeadingBody` truncated the block at it, so the plan failed to parse with
 * an error pointing at the fence marker itself.
 */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*(.*)$/;

/**
 * Whether `line` closes a block opened with `marker`.
 *
 * Three conditions, and dropping the third is a real bug rather than a
 * simplification: a closer is the same fence character, at least as long, AND
 * carries no info string. A line reading ```` ```yaml ```` inside a wider block
 * is CONTENT — that is exactly how a document shows a fenced example — so
 * closing on it reopens the heading scan in the middle of the outer block and
 * undoes what the fence tracking is for.
 */
function closesFence(line: string, marker: string): boolean {
  const match = FENCE_RE.exec(line);
  if (match === null) return false;
  const run = match[1] ?? "";
  const info = (match[2] ?? "").trim();
  return info === "" && run[0] === marker[0] && run.length >= marker.length;
}

export function parseHeadings(md: string): Heading[] {
  const lines = md.split(/\r?\n/);
  const headings: Heading[] = [];
  /** The open fence's marker, or null outside a fenced block. */
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (fence !== null) {
      if (closesFence(line, fence)) fence = null;
      // Every line of an open block is content, the closer included.
      continue;
    }
    const fenceMatch = FENCE_RE.exec(line);
    if (fenceMatch) {
      // An info string is allowed on the OPENER, which is why the marker is
      // kept rather than a boolean: the closer is matched against it.
      fence = fenceMatch[1] ?? "";
      continue;
    }
    const match = line.match(HEADING_RE);
    if (!match) continue;
    const levelToken = match[1];
    const title = match[2];
    if (!levelToken || !title) continue;
    headings.push({
      level: levelToken.length,
      title: title.trim(),
      line: i + 1,
    });
  }
  return headings;
}

export function extractH2Sections(md: string): Map<string, H2Section> {
  const lines = md.split(/\r?\n/);
  const headings = parseHeadings(md).filter((heading) => heading.level === 2);
  const sections = new Map<string, H2Section>();

  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    if (!current) continue;
    const next = headings[i + 1];
    const startLine = current.line + 1;
    const endLine = (next?.line ?? lines.length + 1) - 1;
    const body = startLine <= endLine ? lines.slice(startLine - 1, endLine).join("\n") : "";

    sections.set(current.title.trim(), {
      title: current.title.trim(),
      startLine,
      endLine,
      body,
    });
  }

  return sections;
}
