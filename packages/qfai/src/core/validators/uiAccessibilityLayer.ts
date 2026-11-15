/**
 * Whether a project with web screens has an accessibility check.
 *
 * The accessibility layer of `test-layers.md` runs axe through Playwright on
 * every route the UI contracts declare. This rule asks only whether that layer
 * exists: a project whose UI contracts declare a screen with a web route, and
 * whose selected test files call axe nowhere, ships its screens unchecked.
 *
 * ## What counts
 *
 * - A web route starts with `/`. A UI contract screen can also describe a
 *   terminal surface, whose route is a command line; axe has nothing to load
 *   there, so such a screen does not make a project a UI project.
 * - An axe call is `AxeBuilder` or an `@axe-core/` import in any test file the
 *   story-tree scan selects: the acceptance-layer directories and
 *   `validation.traceability.testFileGlobs`.
 *
 * ## Severity
 *
 * A warning. A project adopting the layer takes a dev dependency and a spec;
 * the rule says the layer is missing, it does not block a run that has no spec
 * yet. A scan that failed or was truncated cannot show that no file calls
 * axe, so it raises nothing here; `QFAI-SCAN-002` reports the scan itself.
 */

import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { readStoryTests } from "./storyTreeObligations.js";
import { issue } from "./utils.js";

export const UI_ACCESSIBILITY_LAYER_RULE_ID = "QFAI-AXE-001";

const AXE_CALL = /\bAxeBuilder\b|@axe-core\//;

/** True for a route axe can load in a browser: a path that starts with `/`. */
export function isWebRoute(route: string): boolean {
  return route.trim().startsWith("/");
}

/** True when the test source calls axe through `AxeBuilder` or an `@axe-core/` package. */
export function callsAxe(source: string): boolean {
  return AXE_CALL.test(source);
}

export async function validateUiAccessibilityLayer(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const screens = (await readUiContractScreenContracts(root, config.paths.contractsDir)).filter(
    (screen) => isWebRoute(screen.route),
  );
  const first = screens[0];
  if (first === undefined) return [];

  // A third read of the selected test files in a full scan, after the two the
  // obligation checks make. Accepted: it runs only once a web screen exists,
  // and sharing one scan would thread it through every profile runner.
  let scan: Awaited<ReturnType<typeof readStoryTests>>;
  try {
    scan = await readStoryTests(root, config);
  } catch {
    return [];
  }
  if (scan.truncated) return [];
  if (scan.files.some((file) => callsAxe(file.content))) return [];

  const file = first.sourceRef.split("#")[0];
  return [
    issue(
      UI_ACCESSIBILITY_LAYER_RULE_ID,
      `The UI contracts declare ${String(screens.length)} screen(s) with a web route, such as '${first.route}', and no selected test file calls axe (\`AxeBuilder\` or an \`@axe-core/\` package), so no route is checked for accessibility.`,
      "warning",
      file,
      "uiux.accessibilityLayer",
      screens.map((screen) => screen.screenId),
      "canonical",
      "Add the accessibility spec `implement-scaffold` writes from `.qfai/assistant/skill/qfai-implement/references/accessibility-check.md`: axe through `@axe-core/playwright` with the WCAG 2.2 A and AA tags, over every route the UI contracts declare, for each role that can reach it. A spec outside `<testsDir>` counts only when `validation.traceability.testFileGlobs` selects it.",
    ),
  ];
}
