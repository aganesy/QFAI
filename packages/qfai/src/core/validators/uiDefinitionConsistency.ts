import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { parseDesignToken } from "../parse/designToken.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const SCREEN_MOCK_HEADING_RE = /^#{1,3}\s+Screen\s+Mock\s*\(HTML\+CSS\)/im;
const HTML_FENCE_RE = /```html\s*\n([\s\S]*?)```/g;

export async function validateUiDefinitionConsistency(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  // Load Design Tokens
  const designDir = path.join(root, config.paths.contractsDir, "design");
  const tokenPattern = path.posix.join(designDir.replace(/\\/g, "/"), "design-tokens*.yaml");
  const tokenFiles = await fg(tokenPattern, { absolute: true });

  const resolvedTokens = new Map<string, string>();
  for (const tokenFile of tokenFiles) {
    try {
      const content = await readFile(tokenFile, "utf-8");
      const result = parseDesignToken(content);
      for (const [key, val] of result.resolved) {
        resolvedTokens.set(key, val);
      }
    } catch {
      // skip unreadable token files
    }
  }

  // Load UI Contract screen IDs
  const uiContractDir = path.join(root, config.paths.contractsDir, "ui");
  const uiPattern = path.posix.join(uiContractDir.replace(/\\/g, "/"), "**/*.yaml");
  const uiFiles = await fg(uiPattern, { absolute: true });
  const contractScreenIds = new Set<string>();

  for (const uiFile of uiFiles) {
    try {
      const content = await readFile(uiFile, "utf-8");
      const parsed: unknown = parseYaml(content);
      if (parsed && typeof parsed === "object") {
        const screens = (parsed as Record<string, unknown>).screens;
        if (Array.isArray(screens)) {
          for (const screen of screens) {
            if (
              screen &&
              typeof screen === "object" &&
              "id" in (screen as Record<string, unknown>)
            ) {
              contractScreenIds.add(String((screen as Record<string, unknown>).id));
            }
          }
        }
      }
    } catch {
      // skip
    }
  }

  // Load HTML Mock blocks
  const mdPatterns = [
    path.posix.join(root.replace(/\\/g, "/"), config.paths.discussionDir, "**/*.md"),
    path.posix.join(root.replace(/\\/g, "/"), config.paths.specsDir, "**/*.md"),
  ];
  const mdFiles = await fg(mdPatterns, { absolute: true });
  const mockScreenIds = new Set<string>();

  for (const mdFile of mdFiles) {
    try {
      const content = await readFile(mdFile, "utf-8");
      if (!SCREEN_MOCK_HEADING_RE.test(content)) continue;

      const rel = path.relative(root, mdFile).replace(/\\/g, "/");

      // Check Token↔Mock fallback mismatch within each HTML fence
      if (resolvedTokens.size > 0) {
        for (const htmlFence of content.matchAll(HTML_FENCE_RE)) {
          const html = htmlFence[1] ?? "";
          const tokenMatches = [...html.matchAll(/\/\*\s*token:\s*\{([^}]+)\}\s*\*\//g)];
          const varMatches = [...html.matchAll(/var\(\s*--([^,)]+)\s*,\s*([^)]+)\s*\)/g)];

          for (const tokenMatch of tokenMatches) {
            const tokenRef = tokenMatch[1]?.trim();
            if (!tokenRef) continue;

            const resolvedValue = resolvedTokens.get(tokenRef);
            if (!resolvedValue) continue;

            const tokenIndex = tokenMatch.index;
            const precedingVars = varMatches.filter((m) => m.index <= tokenIndex);
            const pairedVar =
              precedingVars.length > 0
                ? precedingVars[precedingVars.length - 1]
                : varMatches.find((m) => m.index >= tokenIndex);
            const fallback = pairedVar?.[2]?.trim();
            if (fallback && resolvedValue !== fallback) {
              issues.push(
                issue(
                  "QFAI-CONSISTENCY-001",
                  `Fallback value mismatch: "${fallback}" != resolved token value "${resolvedValue}" for {${tokenRef}}`,
                  "warning",
                  rel,
                  "uiDefinitionConsistency.fallbackMismatch",
                ),
              );
            }
          }
        }
      }

      // Extract screen mock IDs from headings
      const screenHeadingRe = /^#{2,4}\s+(?:Screen|画面)\s*[:：]\s*(\S+)/gm;
      for (const match of content.matchAll(screenHeadingRe)) {
        if (match[1]) mockScreenIds.add(match[1]);
      }
    } catch {
      // skip
    }
  }

  // Check Contract↔Mock screen alignment
  for (const screenId of contractScreenIds) {
    if (!mockScreenIds.has(screenId)) {
      issues.push(
        issue(
          "QFAI-CONSISTENCY-002",
          `HTML Mock missing for screen: ${screenId} (defined in UI Contract)`,
          "warning",
          undefined,
          "uiDefinitionConsistency.screenAlignment",
          [screenId],
        ),
      );
    }
  }

  return issues;
}
