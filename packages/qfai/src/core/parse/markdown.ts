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

export function parseHeadings(md: string): Heading[] {
  const lines = md.split(/\r?\n/);
  const headings: Heading[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
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
