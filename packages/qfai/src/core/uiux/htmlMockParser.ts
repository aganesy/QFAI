import { JSDOM } from "jsdom";

export type HtmlMockParseResult = {
  externalUrls: string[];
  varUsages: VarUsage[];
  stateAttributes: string[];
  breakpointAttributes: string[];
  inlineDimensions: InlineDimension[];
  colorPairs: ColorPair[];
  scriptTags: number;
  parseErrors: string[];
};

export type VarUsage = {
  property: string;
  tokenName: string;
  fallback: string;
};

export type InlineDimension = {
  element: string;
  width: number | null;
  height: number | null;
};

export type ColorPair = {
  element: string;
  color: string;
  backgroundColor: string;
};

const EXTERNAL_URL_RE =
  /(?:href|src|action)\s*=\s*["']?(https?:\/\/[^"'\s>]+)/gi;

const VAR_USAGE_RE = /var\(\s*--([^,)]+)\s*(?:,\s*([^)]+))?\s*\)/g;

const TOKEN_COMMENT_RE = /\/\*\s*token:\s*\{([^}]+)\}\s*\*\//g;

export function parseHtmlMock(html: string): HtmlMockParseResult {
  const result: HtmlMockParseResult = {
    externalUrls: [],
    varUsages: [],
    stateAttributes: [],
    breakpointAttributes: [],
    inlineDimensions: [],
    colorPairs: [],
    scriptTags: 0,
    parseErrors: [],
  };

  let dom: JSDOM;
  try {
    dom = new JSDOM(html, { runScripts: "outside-only" });
  } catch (error) {
    result.parseErrors.push(
      `HTML parse error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return result;
  }

  const doc = dom.window.document;

  // External URLs
  for (const match of html.matchAll(EXTERNAL_URL_RE)) {
    if (match[1]) result.externalUrls.push(match[1]);
  }

  // Script tags
  result.scriptTags = doc.querySelectorAll("script").length;

  // Var usages from inline styles
  const allElements = doc.querySelectorAll("*");
  for (const el of allElements) {
    const style = el.getAttribute("style") ?? "";
    if (!style) continue;

    for (const match of style.matchAll(VAR_USAGE_RE)) {
      result.varUsages.push({
        property: "inline-style",
        tokenName: `--${match[1]?.trim() ?? ""}`,
        fallback: match[2]?.trim() ?? "",
      });
    }

    // Inline dimensions
    const widthMatch = /width\s*:\s*(\d+(?:\.\d+)?)\s*px/i.exec(style);
    const heightMatch = /height\s*:\s*(\d+(?:\.\d+)?)\s*px/i.exec(style);
    if (widthMatch || heightMatch) {
      result.inlineDimensions.push({
        element: el.tagName.toLowerCase(),
        width: widthMatch ? parseFloat(widthMatch[1]!) : null,
        height: heightMatch ? parseFloat(heightMatch[1]!) : null,
      });
    }

    // Color pairs
    const colorMatch = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style);
    const bgMatch = /background(?:-color)?\s*:\s*([^;]+)/i.exec(style);
    if (colorMatch && bgMatch) {
      result.colorPairs.push({
        element: el.tagName.toLowerCase(),
        color: colorMatch[1]!.trim(),
        backgroundColor: bgMatch[1]!.trim(),
      });
    }

    // State attributes
    const state = el.getAttribute("data-state");
    if (state) result.stateAttributes.push(state);

    // Breakpoint attributes
    const bp = el.getAttribute("data-breakpoint");
    if (bp) result.breakpointAttributes.push(bp);
  }

  // Also extract var usages from style tags
  const styleTags = doc.querySelectorAll("style");
  for (const styleTag of styleTags) {
    const css = styleTag.textContent ?? "";
    for (const match of css.matchAll(VAR_USAGE_RE)) {
      result.varUsages.push({
        property: "stylesheet",
        tokenName: `--${match[1]?.trim() ?? ""}`,
        fallback: match[2]?.trim() ?? "",
      });
    }
  }

  dom.window.close();
  return result;
}

export function extractTokenComments(text: string): string[] {
  const comments: string[] = [];
  for (const match of text.matchAll(TOKEN_COMMENT_RE)) {
    if (match[1]) comments.push(match[1].trim());
  }
  return comments;
}
