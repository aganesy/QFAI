import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { computeContrastRatio } from "../uiux/contrastRatio.js";
import { parseHtmlMock, extractTokenComments } from "../uiux/htmlMockParser.js";
import { collectHtmlMockBlocks } from "./htmlMockBlocks.js";
import { issue } from "./utils.js";

const WCAG_AA_RATIO = 4.5;
const MOBILE_TOUCH_TARGET_PX = 44;
const MOBILE_PLATFORMS = new Set(["mobile-ios", "mobile-android"]);

export async function validateHtmlMock(
  root: string,
  platform: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const startTime = performance.now();
  const budget = config.uiux?.htmlMockTimeout ?? 2000;

  const patterns = [
    path.posix.join(root.replace(/\\/g, "/"), config.paths.discussionDir, "**/*.md"),
    path.posix.join(root.replace(/\\/g, "/"), config.paths.specsDir, "**/*.md"),
  ];

  const files = await fg(patterns, { absolute: true });
  const mockBlocks: { file: string; html: string; rawBlock: string }[] = [];

  for (const filePath of files) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    const rel = path.relative(root, filePath).replace(/\\/g, "/");

    for (const block of collectHtmlMockBlocks(content)) {
      mockBlocks.push({ file: rel, html: block.html, rawBlock: block.rawBlock });
    }
  }

  for (const block of mockBlocks) {
    const result = parseHtmlMock(block.html);

    for (const err of result.parseErrors) {
      issues.push(
        issue("QFAI-MOCK-001", `HTML syntax error: ${err}`, "error", block.file, "htmlMock.syntax"),
      );
    }

    // External URL check
    for (const url of result.externalUrls) {
      issues.push(
        issue(
          "QFAI-MOCK-002",
          `External URL reference in HTML Mock: ${url}`,
          "error",
          block.file,
          "htmlMock.externalUrl",
        ),
      );
    }

    for (const ref of result.localRefs) {
      issues.push(
        issue(
          "QFAI-MOCK-010",
          `Local file reference in HTML Mock: ${ref}`,
          "error",
          block.file,
          "htmlMock.localRef",
        ),
      );
    }

    for (const url of result.unsafeUrls) {
      issues.push(
        issue(
          "QFAI-MOCK-011",
          `Unsafe URL scheme in HTML Mock: ${url}`,
          "error",
          block.file,
          "htmlMock.unsafeUrl",
        ),
      );
    }

    for (const handler of result.eventHandlers) {
      issues.push(
        issue(
          "QFAI-MOCK-012",
          `Inline event handler is prohibited in HTML Mock: ${handler}`,
          "error",
          block.file,
          "htmlMock.eventHandler",
        ),
      );
    }

    // Script tag check
    if (result.scriptTags > 0) {
      issues.push(
        issue(
          "QFAI-MOCK-003",
          `Script tag detected in HTML Mock (${result.scriptTags} tag(s)). Script tags are prohibited.`,
          "error",
          block.file,
          "htmlMock.scriptTag",
        ),
      );
    }

    // CSS fallback check
    for (const usage of result.varUsages) {
      if (!usage.fallback) {
        issues.push(
          issue(
            "QFAI-MOCK-004",
            `CSS var() without fallback value: ${usage.tokenName}`,
            "error",
            block.file,
            "htmlMock.cssFallback",
          ),
        );
      }
    }

    // Token comment annotation check
    const tokenComments = extractTokenComments(block.rawBlock);
    if (result.varUsages.length > 0 && tokenComments.length === 0) {
      issues.push(
        issue(
          "QFAI-MOCK-005",
          "HTML Mock uses CSS custom properties but has no token comment annotations (/* token: {semantic.xxx} */)",
          "warning",
          block.file,
          "htmlMock.tokenComment",
        ),
      );
    }

    // State variant check
    const states = new Set(result.stateAttributes);
    if (states.size > 0 && !states.has("default")) {
      issues.push(
        issue(
          "QFAI-MOCK-006",
          'State variants present but missing "default" state',
          "warning",
          block.file,
          "htmlMock.stateVariant",
        ),
      );
    }
    if (states.size > 0 && !states.has("error")) {
      issues.push(
        issue(
          "QFAI-MOCK-007",
          'State variants present but missing "error" state',
          "warning",
          block.file,
          "htmlMock.stateVariant",
        ),
      );
    }

    // Contrast ratio check
    for (const pair of result.colorPairs) {
      const ratio = computeContrastRatio(pair.color, pair.backgroundColor);
      if (ratio !== null && ratio < WCAG_AA_RATIO) {
        issues.push(
          issue(
            "QFAI-MOCK-008",
            `Contrast ratio ${ratio.toFixed(2)}:1 below WCAG AA threshold (${WCAG_AA_RATIO}:1) on <${pair.element}>`,
            "warning",
            block.file,
            "htmlMock.contrastRatio",
          ),
        );
      }
    }

    // Touch target check
    const isMobile = MOBILE_PLATFORMS.has(platform);
    for (const dim of result.inlineDimensions) {
      if (!dim.interactive) {
        continue;
      }
      if (dim.width == null || dim.height == null) {
        continue;
      }
      const minDim = Math.min(dim.width, dim.height);
      if (minDim < MOBILE_TOUCH_TARGET_PX) {
        issues.push(
          issue(
            "QFAI-MOCK-009",
            `Touch target size ${minDim}px below ${MOBILE_TOUCH_TARGET_PX}px minimum on <${dim.element}>`,
            isMobile ? "error" : "warning",
            block.file,
            "htmlMock.touchTarget",
          ),
        );
      }
    }
  }

  if (performance.now() - startTime > budget) {
    issues.push(
      issue(
        "QFAI-MOCK-099",
        `HTML Mock validation exceeded ${budget}ms budget. All blocks were validated.`,
        "warning",
        undefined,
        "htmlMock.performanceBudget",
      ),
    );
  }

  return issues;
}
