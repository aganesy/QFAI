/**
 * The `pattern` a UI contract screen declares.
 *
 * The shipped business UI pattern reference describes what a standard screen of
 * each type contains: a list, a detail, a create and edit form, settings, member
 * management and a dashboard. Each type has a stable ID, and a screen names its
 * type as `pattern: <id>`, so the contract author, the implementer and the
 * screen reviewer read the same entry.
 *
 * ## What is asked, and of whom
 *
 * The key is optional, so a contract that never writes it is asked nothing. An
 * empty `pattern:`, or an empty string, is a slot nobody has filled yet. Two
 * filled values are reported:
 *
 * - a value outside the vocabulary, because it names an entry the reference
 *   does not have;
 * - any value on a screen that declares `surface: marketing`. The vocabulary
 *   is the business types, and a marketing screen's sections are named against
 *   the marketing pattern reference, so a marketing screen leaves the key out.
 *   A filled one would give the implementer and the reviewer two references to
 *   read the screen against.
 *
 * A `screens` that is not a list, and an entry that is not a mapping, are left
 * to `QFAI-CONTRACT-042`, which reports them.
 *
 * ## Severity
 *
 * An error, as for the other closed vocabularies of a UI contract.
 */

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { readUiContractDocuments } from "../contracts/screenContracts.js";
import type { Issue } from "../types.js";
import { isMapping, screenSurfaceOf, screensOf } from "./uiScreenSurface.js";
import { issue } from "./utils.js";

export const UI_SCREEN_PATTERN_RULE_ID = "QFAI-CONTRACT-056";

/** The screen type IDs of the shipped business UI pattern reference. */
export const SCREEN_PATTERNS = [
  "list",
  "detail",
  "form",
  "settings",
  "members",
  "dashboard",
] as const;

export type ScreenPattern = (typeof SCREEN_PATTERNS)[number];

function isScreenPattern(value: unknown): value is ScreenPattern {
  return SCREEN_PATTERNS.some((pattern) => pattern === value);
}

/**
 * The pattern a `screens[]` entry declares: `null` when it writes none or leaves
 * the key empty, and `undefined` for a value outside the vocabulary, which the
 * rule below reports.
 */
export function screenPatternOf(
  entry: Readonly<Record<string, unknown>>,
): ScreenPattern | null | undefined {
  const value = entry.pattern;
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return isScreenPattern(value) ? value : undefined;
}

/**
 * Why a screen's `pattern` is reported: a value outside the vocabulary, or any
 * filled value on a marketing screen, which takes none. A marketing screen is
 * reported once, as dropping the key settles both.
 */
type PatternFault = "unknown" | "marketing";

type ReportedPattern = {
  file: string;
  index: number;
  screenId: string;
  value: string;
  fault: PatternFault;
};

function faultOf(entry: Readonly<Record<string, unknown>>): PatternFault | null {
  const pattern = screenPatternOf(entry);
  if (pattern !== null && screenSurfaceOf(entry) === "marketing") {
    return "marketing";
  }
  return pattern === undefined ? "unknown" : null;
}

function reportedPatternsIn(parsed: unknown, file: string): ReportedPattern[] {
  return screensOf(parsed).flatMap((entry, index) => {
    if (!isMapping(entry)) {
      return [];
    }
    const fault = faultOf(entry);
    if (fault === null) {
      return [];
    }
    const screenId = typeof entry.id === "string" ? entry.id.trim() : "";
    const value = typeof entry.pattern === "string" ? entry.pattern : JSON.stringify(entry.pattern);
    return [{ file, index, screenId, value, fault }];
  });
}

export async function validateUiScreenPattern(root: string, config: QfaiConfig): Promise<Issue[]> {
  // The same walk `QFAI-CONTRACT-042` and the surface rule use.
  const uiDir = path.resolve(root, config.paths.contractsDir, "ui");
  const documents = (await readUiContractDocuments(uiDir, root))
    .slice()
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const reported = documents.flatMap(({ relativePath, parsed }) =>
    reportedPatternsIn(parsed, relativePath),
  );

  const vocabulary = SCREEN_PATTERNS.map((pattern) => `\`${pattern}\``).join(", ");
  return reported.map(({ file, index, screenId, value, fault }) => {
    const where = screenId
      ? `screen '${screenId}' (\`screens[${String(index)}]\`)`
      : `\`screens[${String(index)}]\``;
    const marketing = fault === "marketing";
    const message = marketing
      ? `UI contract ${where} declares \`surface: marketing\` and \`pattern: ${value}\`. A marketing screen takes no \`pattern\`: its sections are named against the marketing UI pattern reference, not a business screen type.`
      : `UI contract ${where} declares \`pattern: ${value}\`, which is not a screen type of the business UI pattern reference. The vocabulary is ${vocabulary}.`;
    const remedy = marketing
      ? "Drop `pattern` from the marketing screen, or drop `surface: marketing` when it is an application screen of that type."
      : `Set \`pattern\` to one of ${vocabulary}, or drop the key for a screen that fits no type, such as a marketing screen.`;
    return issue(
      UI_SCREEN_PATTERN_RULE_ID,
      message,
      "error",
      file,
      "contracts.ui.pattern",
      screenId ? [screenId] : undefined,
      "canonical",
      remedy,
    );
  });
}
