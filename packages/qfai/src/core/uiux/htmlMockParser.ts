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

export type VarCallUsage = {
  index: number;
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

const TOKEN_COMMENT_RE = /\/\*\s*token:\s*\{([^}]+)\}\s*\*\//g;

export function extractTokenComments(text: string): string[] {
  const comments: string[] = [];
  for (const match of text.matchAll(TOKEN_COMMENT_RE)) {
    if (match[1]) comments.push(match[1].trim());
  }
  return comments;
}

export function collectVarUsages(text: string | null): VarCallUsage[] {
  if (!text) {
    return [];
  }

  const usages: VarCallUsage[] = [];
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
      usages.push({
        index: start,
        tokenName,
        fallback: parsed.fallbackExpr.trim(),
      });
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
