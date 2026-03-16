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

const EVENT_HANDLER_RE = /\s(on[a-z]+)\s*=/gi;

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
  const allElements = doc.querySelectorAll("*");

  // URL references (strictly from href/src/action attributes)
  for (const el of allElements) {
    for (const attr of ["href", "src", "action"] as const) {
      const rawUrl = el.getAttribute(attr)?.trim();
      if (!rawUrl) continue;

      if (/^(https?:)?\/\//i.test(rawUrl)) {
        result.externalUrls.push(rawUrl);
        continue;
      }

      if (
        /^javascript:/i.test(rawUrl) ||
        (/^data:/i.test(rawUrl) && !/^data:image\//i.test(rawUrl))
      ) {
        result.unsafeUrls.push(rawUrl);
        continue;
      }

      if (/^(#|mailto:|tel:)/i.test(rawUrl)) {
        continue;
      }

      result.localRefs.push(rawUrl);
    }
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
  for (const el of allElements) {
    const style = el.getAttribute("style") ?? "";
    if (!style) continue;

    for (const usage of extractVarUsages(style)) {
      result.varUsages.push({
        property: "inline-style",
        tokenName: usage.tokenName,
        fallback: usage.fallback,
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
    for (const usage of extractVarUsages(css)) {
      result.varUsages.push({
        property: "stylesheet",
        tokenName: usage.tokenName,
        fallback: usage.fallback,
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

function extractVarUsages(text: string | null): Array<{ tokenName: string; fallback: string }> {
  if (!text) {
    return [];
  }

  const usages: Array<{ tokenName: string; fallback: string }> = [];
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const start = text.indexOf("var(", searchFrom);
    if (start < 0) {
      break;
    }

    const parsed = parseVarCall(text, start);
    if (!parsed) {
      searchFrom = start + 4;
      continue;
    }

    const tokenName = parsed.tokenExpr.trim();
    if (tokenName.startsWith("--")) {
      usages.push({ tokenName, fallback: parsed.fallbackExpr.trim() });
    }
    searchFrom = parsed.nextIndex;
  }

  return usages;
}

function parseVarCall(
  text: string,
  start: number,
): { tokenExpr: string; fallbackExpr: string; nextIndex: number } | null {
  let i = start + 4;
  let depth = 1;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === "(") {
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
    }
    i += 1;
  }

  if (depth !== 0) {
    return null;
  }

  const inner = text.slice(start + 4, i - 1);
  const commaIndex = findTopLevelComma(inner);
  const tokenExpr = commaIndex >= 0 ? inner.slice(0, commaIndex) : inner;
  const fallbackExpr = commaIndex >= 0 ? inner.slice(commaIndex + 1) : "";
  return { tokenExpr, fallbackExpr, nextIndex: i };
}

function findTopLevelComma(text: string): number {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") {
      depth += 1;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (ch === "," && depth === 0) {
      return i;
    }
  }
  return -1;
}
