export type Heading = { level: number; title: string; line: number };

export type H2Section = {
  title: string;
  startLine: number;
  endLine: number;
  body: string;
};

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;

export function parseHeadings(md: string): Heading[] {
  const lines = md.split(/\r?\n/);
  const headings: Heading[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(HEADING_RE);
    if (!match) continue;
    headings.push({
      level: match[1].length,
      title: match[2].trim(),
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
    const next = headings[i + 1];
    const startLine = current.line + 1;
    const endLine = (next?.line ?? (lines.length + 1)) - 1;
    const body =
      startLine <= endLine
        ? lines.slice(startLine - 1, endLine).join("\n")
        : "";

    sections.set(current.title.trim(), {
      title: current.title.trim(),
      startLine,
      endLine,
      body,
    });
  }

  return sections;
}
