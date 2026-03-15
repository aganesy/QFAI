import { JSDOM } from "jsdom";

export type HtmlMockParseResult = {
  externalUrls: string[];
  localRefs: string[];
  unsafeUrls: string[];
  eventHandlers: string[];
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
  interactive: boolean;
};

export type ColorPair = {
  element: string;
  color: string;
  backgroundColor: string;
};

const URL_ATTR_RE = /(?:href|src|action)\s*=\s*["']?([^"'\s>]+)/gi;
const EVENT_HANDLER_RE = /\s(on[a-z]+)\s*=/gi;

const VAR_USAGE_RE = /var\(\s*--([^,)]+)\s*(?:,\s*([^)]+))?\s*\)/g;

const TOKEN_COMMENT_RE = /\/\*\s*token:\s*\{([^}]+)\}\s*\*\//g;

export function parseHtmlMock(html: string): HtmlMockParseResult {
  const result: HtmlMockParseResult = {
    externalUrls: [],
    localRefs: [],
    unsafeUrls: [],
    eventHandlers: [],
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

  // URL references
  for (const match of html.matchAll(URL_ATTR_RE)) {
    const rawUrl = match[1]?.trim();
    if (!rawUrl) continue;

    if (/^https?:\/\//i.test(rawUrl)) {
      result.externalUrls.push(rawUrl);
      continue;
    }

    if (/^(javascript:|data:)/i.test(rawUrl)) {
      result.unsafeUrls.push(rawUrl);
      continue;
    }

    if (/^(#|mailto:|tel:)/i.test(rawUrl)) {
      continue;
    }

    result.localRefs.push(rawUrl);
  }

  // Inline event handlers
  for (const match of html.matchAll(EVENT_HANDLER_RE)) {
    if (match[1]) {
      result.eventHandlers.push(match[1].toLowerCase());
    }
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
        width: widthMatch && widthMatch[1] ? parseFloat(widthMatch[1]) : null,
        height: heightMatch && heightMatch[1] ? parseFloat(heightMatch[1]) : null,
        interactive: isInteractiveElement(el),
      });
    }

    // Color pairs
    const colorMatch = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style);
    const bgMatch = /background(?:-color)?\s*:\s*([^;]+)/i.exec(style);
    if (colorMatch && bgMatch) {
      const color = colorMatch[1];
      const backgroundColor = bgMatch[1];
      if (!color || !backgroundColor) {
        continue;
      }
      result.colorPairs.push({
        element: el.tagName.toLowerCase(),
        color: color.trim(),
        backgroundColor: backgroundColor.trim(),
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
    const css = styleTag.textContent;
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

function isInteractiveElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  const interactiveTags = new Set(["a", "button", "input", "select", "textarea", "summary"]);
  const interactiveRoles = new Set([
    "button",
    "link",
    "checkbox",
    "radio",
    "switch",
    "tab",
    "menuitem",
  ]);

  const ariaDisabledAttr = el.getAttribute("aria-disabled");
  const isAriaDisabled =
    typeof ariaDisabledAttr === "string" && ariaDisabledAttr.toLowerCase() === "true";
  const disabled = el.hasAttribute("disabled") || isAriaDisabled;
  if (disabled) {
    return false;
  }

  if (interactiveTags.has(tag)) {
    return true;
  }

  const roleAttr = el.getAttribute("role");
  const role = typeof roleAttr === "string" ? roleAttr.toLowerCase() : "";
  if (interactiveRoles.has(role)) {
    return true;
  }

  const tabIndexAttr = el.getAttribute("tabindex");
  const tabIndex = Number.parseInt(typeof tabIndexAttr === "string" ? tabIndexAttr : "", 10);
  return Number.isFinite(tabIndex) && tabIndex >= 0;
}

export function extractTokenComments(text: string): string[] {
  const comments: string[] = [];
  for (const match of text.matchAll(TOKEN_COMMENT_RE)) {
    if (match[1]) comments.push(match[1].trim());
  }
  return comments;
}
