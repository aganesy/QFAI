const HTML_FENCE_RE = /```html\s*\r?\n([\s\S]*?)```/g;
const ADJACENT_CSS_FENCE_RE = /^\s*```css\s*\r?\n([\s\S]*?)```/;
const SCREEN_MOCK_HEADING_RE =
  /^#{1,4}\s+(?:Screen\s+Mock(?:\s*[\u2014\-—]+\s*Fallback)?\s*\(HTML\+CSS\)|HTML\+CSS\s+Visual\s+Mock(?:\s*[:：].*)?)\s*$/gim;
const SCREEN_MOCK_COMMENT_RE = /<!--\s*Screen\s+Mock:\s*([^>\r\n]+?)\s*-->/gim;
const NEXT_HEADING_RE = /^#{1,4}\s+/m;

export type HtmlMockBlock = {
  html: string;
  rawBlock: string;
};

export function collectHtmlMockBlocks(content: string): HtmlMockBlock[] {
  const blocks: HtmlMockBlock[] = [];
  const seen = new Set<string>();

  const pushBlock = (html: string, rawBlock: string): void => {
    const trimmedHtml = html.trim();
    if (!trimmedHtml) {
      return;
    }
    if (!/[<>]/.test(trimmedHtml)) {
      return;
    }
    const key = `${trimmedHtml}\n---\n${rawBlock.trim()}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    blocks.push({ html: trimmedHtml, rawBlock: rawBlock.trim() });
  };

  for (const match of content.matchAll(HTML_FENCE_RE)) {
    if (match[1] && match[0]) {
      let html = match[1];
      let rawBlock = match[0];
      const sectionAfterHtml = content.slice(match.index + match[0].length);
      const cssMatch = ADJACENT_CSS_FENCE_RE.exec(sectionAfterHtml);
      if (cssMatch?.[1]) {
        html = mergeHtmlWithCss(html, cssMatch[1]);
        rawBlock = `${match[0]}\n${cssMatch[0]}`;
      }
      pushBlock(html, rawBlock);
    }
  }

  for (const headingMatch of content.matchAll(SCREEN_MOCK_HEADING_RE)) {
    const start = headingMatch.index;
    const headingLine = headingMatch[0];
    const bodyStart = start + headingLine.length;
    const remainder = content.slice(bodyStart);
    const nextHeadingOffset = remainder.search(NEXT_HEADING_RE);
    const section = nextHeadingOffset === -1 ? remainder : remainder.slice(0, nextHeadingOffset);
    const inlineHtml = extractInlineHtml(section);
    pushBlock(inlineHtml, `${headingLine}\n${section}`);
  }

  for (const commentMatch of content.matchAll(SCREEN_MOCK_COMMENT_RE)) {
    const start = commentMatch.index;
    const marker = commentMatch[0];
    const bodyStart = start + marker.length;
    const remainder = content.slice(bodyStart);
    const nextHeadingOffset = remainder.search(NEXT_HEADING_RE);
    const section = nextHeadingOffset === -1 ? remainder : remainder.slice(0, nextHeadingOffset);
    const inlineHtml = extractInlineHtml(section);
    pushBlock(inlineHtml, `${marker}\n${section}`);
  }

  return blocks;
}

export function collectScreenMockLabels(content: string): string[] {
  const labels = new Set<string>();

  const screenHeadingRe = /^#{2,4}\s+(?:Screen|画面)\s*[:：]\s*(\S+)/gm;
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
