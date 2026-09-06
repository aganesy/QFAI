import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { computeContrastRatio } from "../uiux/contrastRatio.js";
import { extractTokenComments } from "../uiux/htmlMockParser.js";
import { collectHtmlMockBlocks } from "./htmlMockBlocks.js";
import { issue } from "./utils.js";

const WCAG_AA_RATIO = 4.5;
const MOBILE_TOUCH_TARGET_PX = 44;
const MOBILE_PLATFORMS = new Set(["mobile-ios", "mobile-android"]);

/**
 * Where `validateHtmlMock` leaves how long parsing the mock blocks cost.
 *
 * The measurement is handed back instead of compared here, because the two
 * halves belong in different places: only this function knows when the parser
 * finished loading and the parsing began, and only the caller may decide what
 * to do with a number that describes the machine rather than the tree. Left at
 * whatever the caller initialised it to when there is nothing to parse.
 */
export type HtmlMockTiming = { parseMs: number };

export async function validateHtmlMock(
  root: string,
  platform: string,
  config: QfaiConfig,
  timing?: HtmlMockTiming,
): Promise<Issue[]> {
  const issues: Issue[] = [];

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

  // Nothing to parse, so nothing to load. Moving the import off module scope stopped every `qfai`
  // command paying jsdom's 910 ms; importing it here regardless handed that cost straight back to
  // every `validate` run, including the overwhelmingly common one with no mock block at all.
  if (mockBlocks.length === 0) {
    return issues;
  }

  // Loaded here, not at module scope: this is the only production caller, and the module it pulls
  // in requires jsdom, which costs 910 ms measured. Static, every qfai command paid it.
  const { parseHtmlMock } = await import("../uiux/htmlMockDom.js");

  // The clock starts AFTER the load, and that is the finding rather than a tidiness.
  //
  // `htmlMockTimeout` is a budget for parsing mock blocks, and while the clock started above the
  // import, the one-off cost of pulling in jsdom was charged to it. Measured at 910 ms, so every
  // project configuring anything under a second was reported over budget on every run however fast
  // its blocks parsed. The comment where the import used to sit predicted exactly this and the
  // code was arranged the other way round.
  //
  // The load is a real cost and it is still paid; it is simply not what this budget is about, and
  // it is paid once per process rather than per block.
  //
  // Measured here rather than around the call for the same reason: only this side of the import
  // knows where the parsing starts, so a caller wrapping `validateHtmlMock` would be back to
  // timing the load.
  const startTime = performance.now();

  try {
    for (const block of mockBlocks) {
      const result = await parseHtmlMock(block.html);

      for (const err of result.parseErrors) {
        issues.push(
          issue(
            "QFAI-MOCK-001",
            `HTML syntax error: ${err}`,
            "error",
            block.file,
            "htmlMock.syntax",
          ),
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
  } finally {
    // `finally` so a rejecting parse still leaves a measurement behind: what gets
    // reported must not depend on the pass having succeeded.
    if (timing) {
      timing.parseMs = performance.now() - startTime;
    }
  }

  return issues;
}
