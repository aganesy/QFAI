export type ParsedContractRefs = {
  lines: string[];
  ids: string[];
  invalidTokens: string[];
  hasNone: boolean;
};

export type ContractRefParseOptions = {
  allowCommentPrefix?: boolean;
};

const CONTRACT_REF_ID_RE = /^(?:API|UI|DB)-\d{4}$/;

export function parseContractRefs(
  text: string,
  options: ContractRefParseOptions = {},
): ParsedContractRefs {
  const linePattern = buildLinePattern(options);
  const lines: string[] = [];
  for (const match of text.matchAll(linePattern)) {
    lines.push((match[1] ?? "").trim());
  }

  const ids: string[] = [];
  const invalidTokens: string[] = [];
  let hasNone = false;

  for (const line of lines) {
    if (line.length === 0) {
      invalidTokens.push("(empty)");
      continue;
    }
    const tokens = line.split(",").map((token) => token.trim());
    for (const token of tokens) {
      if (token.length === 0) {
        invalidTokens.push("(empty)");
        continue;
      }
      if (token === "none") {
        hasNone = true;
        continue;
      }
      if (CONTRACT_REF_ID_RE.test(token)) {
        ids.push(token);
        continue;
      }
      invalidTokens.push(token);
    }
  }

  return {
    lines,
    ids: unique(ids),
    invalidTokens: unique(invalidTokens),
    hasNone,
  };
}

function buildLinePattern(options: ContractRefParseOptions): RegExp {
  // Scenario uses a comment line, so require "#" when the comment prefix is enabled.
  const prefix = options.allowCommentPrefix ? "#" : "";
  return new RegExp(
    `^[ \\t]*${prefix}[ \\t]*QFAI-CONTRACT-REF:[ \\t]*([^\\r\\n]*)[ \\t]*$`,
    "gm",
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
