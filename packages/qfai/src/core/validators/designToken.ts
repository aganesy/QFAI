import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import { parseDesignToken } from "../parse/designToken.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const VALID_TYPES = [
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
  "strokeStyle",
  "border",
  "transition",
  "shadow",
  "gradient",
  "typography",
  "string",
];

const VALID_PLATFORMS = ["web", "windows", "mobile-ios", "mobile-android"];

export async function validateDesignToken(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const designDir = path.join(root, config.paths.contractsDir, "design");
  const pattern = path.posix.join(
    designDir.replace(/\\/g, "/"),
    "design-tokens*.yaml",
  );
  const files = await fg(pattern, { absolute: true });

  if (files.length === 0) {
    return [];
  }

  const issues: Issue[] = [];

  for (const filePath of files) {
    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      issues.push(
        issue(
          "QFAI-DT-001",
          `Design Token file unreadable: ${rel}`,
          "error",
          rel,
          "designToken.readFile",
        ),
      );
      continue;
    }

    const result = parseDesignToken(content);

    for (const error of result.errors) {
      const severity = error.message.includes("Circular reference") ? "error" : "error";
      issues.push(
        issue(
          "QFAI-DT-002",
          error.message,
          severity,
          rel,
          "designToken.parse",
          error.path ? [error.path] : undefined,
        ),
      );
    }

    const hasPrimitive = result.primitives.size > 0;
    const hasSemantic = result.semantics.size > 0;

    if (!hasPrimitive && !hasSemantic && result.components.size === 0) {
      issues.push(
        issue(
          "QFAI-DT-003",
          `Design Token file has no token layers (primitive/semantic/component): ${rel}`,
          "warning",
          rel,
          "designToken.layers",
        ),
      );
    }

    const allTokens = [
      ...result.primitives.entries(),
      ...result.semantics.entries(),
      ...result.components.entries(),
    ];

    for (const [tokenPath, token] of allTokens) {
      if (token.$value === undefined || token.$value === null || String(token.$value).trim() === "") {
        issues.push(
          issue(
            "QFAI-DT-004",
            `Empty token value at: ${tokenPath}`,
            "error",
            rel,
            "designToken.emptyValue",
            [tokenPath],
          ),
        );
      }

      if (token.$type && !VALID_TYPES.includes(token.$type)) {
        issues.push(
          issue(
            "QFAI-DT-005",
            `Unknown token type "${token.$type}" at: ${tokenPath}`,
            "warning",
            rel,
            "designToken.unknownType",
            [tokenPath],
          ),
        );
      }

      if (token.platform && !VALID_PLATFORMS.includes(token.platform)) {
        issues.push(
          issue(
            "QFAI-DT-006",
            `Unknown platform "${token.platform}" at: ${tokenPath}. Known platforms: ${VALID_PLATFORMS.join(", ")}`,
            "warning",
            rel,
            "designToken.unknownPlatform",
            [tokenPath],
          ),
        );
      }
    }
  }

  return issues;
}
