import { resolvePath, type QfaiConfig } from "../config.js";

const HTML_FENCE_RE = /```html\s*\r?\n([\s\S]*?)```/g;
const ADJACENT_CSS_FENCE_RE = /^\s*```css\s*\r?\n([\s\S]*?)```/;
const SCREEN_MOCK_HEADING_RE =
  /^#{1,4}\s+(?:Screen\s+Mock(?:\s*[-\u2014]+\s*Fallback)?\s*\(HTML\+CSS\)|HTML\+CSS\s+Visual\s+Mock(?:\s*[:\uFF1A].*)?)\s*$/gim;
const SCREEN_MOCK_COMMENT_RE = /<!--\s*Screen\s+Mock:\s*([^>\r\n]+?)\s*-->/gim;
const NEXT_HEADING_RE = /^#{1,4}\s+/m;

export type HtmlMockBlock = {
  html: string;
  rawBlock: string;
};

/** The directory whose Markdown files an HTML mock can sit in: `paths.specsDir`, resolved. */
export function mockMarkdownDir(root: string, config: QfaiConfig): string {
  return resolvePath(root, config, "specsDir");
}

/** A half-open span `[start, end)` of the Markdown source. */
type SourceRange = { start: number; end: number };

/**
 * Each block is keyed by the source it came from, not by its text. A fence under a mock heading is
 * reached by the fence pass and again by the heading's section, with different raw text each time,
 * so a text key let it through twice; and two separate fences holding the same HTML are two
 * blocks, which a text key merged into one.
 */
export function collectHtmlMockBlocks(content: string): HtmlMockBlock[] {
  const blocks: HtmlMockBlock[] = [];
  const claimed: SourceRange[] = [];

  const pushBlock = (html: string, rawBlock: string, range: SourceRange): void => {
    const trimmedHtml = html.trim();
    if (!trimmedHtml) {
      return;
    }
    if (!/[<>]/.test(trimmedHtml)) {
      return;
    }
    claimed.push(range);
    blocks.push({ html: trimmedHtml, rawBlock: rawBlock.trim() });
  };

  for (const match of content.matchAll(HTML_FENCE_RE)) {
    if (match[1] && match[0]) {
      let html = match[1];
      let rawBlock = match[0];
      let end = match.index + match[0].length;
      const cssMatch = ADJACENT_CSS_FENCE_RE.exec(content.slice(end));
      if (cssMatch?.[1]) {
        html = mergeHtmlWithCss(html, cssMatch[1]);
        rawBlock = `${match[0]}\n${cssMatch[0]}`;
        end += cssMatch[0].length;
      }
      pushBlock(html, rawBlock, { start: match.index, end });
    }
  }

  const pushSection = (opener: string, bodyStart: number): void => {
    const remainder = content.slice(bodyStart);
    const nextHeadingOffset = remainder.search(NEXT_HEADING_RE);
    const range = {
      start: bodyStart,
      end: nextHeadingOffset === -1 ? content.length : bodyStart + nextHeadingOffset,
    };
    const section = unclaimedText(content, range, claimed);
    pushBlock(extractInlineHtml(section), `${opener}\n${section}`, range);
  };

  for (const headingMatch of content.matchAll(SCREEN_MOCK_HEADING_RE)) {
    pushSection(headingMatch[0], headingMatch.index + headingMatch[0].length);
  }

  for (const commentMatch of content.matchAll(SCREEN_MOCK_COMMENT_RE)) {
    pushSection(commentMatch[0], commentMatch.index + commentMatch[0].length);
  }

  return blocks;
}

/** The text of `range` with every span an earlier block already took cut out. */
function unclaimedText(
  content: string,
  range: SourceRange,
  claimed: readonly SourceRange[],
): string {
  const overlapping = claimed
    .filter((taken) => taken.end > range.start && taken.start < range.end)
    .sort((a, b) => a.start - b.start);
  const pieces: string[] = [];
  let cursor = range.start;
  for (const taken of overlapping) {
    if (taken.start > cursor) {
      pieces.push(content.slice(cursor, taken.start));
    }
    cursor = Math.max(cursor, taken.end);
  }
  if (cursor < range.end) {
    pieces.push(content.slice(cursor, range.end));
  }
  return pieces.join("\n");
}

export function collectScreenMockLabels(content: string): string[] {
  const labels = new Set<string>();

  // The Japanese word for "screen" (\u753B\u9762) and the full-width colon (\uFF1A) are both accepted.
  const screenHeadingRe = /^#{2,4}\s+(?:Screen|\u753B\u9762)\s*[:\uFF1A]\s*(\S+)/gm;
  for (const match of content.matchAll(screenHeadingRe)) {
    if (match[1]) {
      labels.add(match[1]);
    }
  }

  for (const match of content.matchAll(SCREEN_MOCK_COMMENT_RE)) {
    const label = (match[1] ?? "").trim();
    if (label) {
      labels.add(label);
    }
  }

  return [...labels];
}

function extractInlineHtml(section: string): string {
  const lines = section.split(/\r?\n/);
  const htmlLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }
    return (
      trimmed.startsWith("<") ||
      trimmed.startsWith("</") ||
      trimmed.startsWith("<!--") ||
      trimmed.startsWith("/*")
    );
  });
  return htmlLines.join("\n");
}

function mergeHtmlWithCss(html: string, css: string): string {
  const trimmedCss = css.trim();
  if (!trimmedCss) {
    return html;
  }

  const styleTag = `<style>\n${trimmedCss}\n</style>`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${styleTag}\n</head>`);
  }
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${styleTag}\n</body>`);
  }
  return `${styleTag}\n${html}`;
}
