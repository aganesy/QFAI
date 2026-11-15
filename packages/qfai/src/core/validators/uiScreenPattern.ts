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
 * empty `pattern:`, or an empty string, is a slot nobody has filled yet. Only a
 * value outside the vocabulary is reported, because it names an entry the
 * reference does not have. The vocabulary is the business types: a marketing
 * screen's sections are named against the marketing pattern reference, so a
 * marketing screen leaves the key out, and a value it writes is read the same
 * way as on any other screen.
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

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The `screens` list of a parsed contract, or nothing when it holds none. */
function screensOf(parsed: unknown): unknown[] {
  if (!isMapping(parsed)) {
    return [];
  }
  const screens = parsed.screens;
  return Array.isArray(screens) ? screens : [];
}

type UnknownPattern = { file: string; index: number; screenId: string; value: string };

function unknownPatternsIn(parsed: unknown, file: string): UnknownPattern[] {
  return screensOf(parsed).flatMap((entry, index) => {
    if (!isMapping(entry) || screenPatternOf(entry) !== undefined) {
      return [];
    }
    const screenId = typeof entry.id === "string" ? entry.id.trim() : "";
    const value = typeof entry.pattern === "string" ? entry.pattern : JSON.stringify(entry.pattern);
    return [{ file, index, screenId, value }];
  });
}

export async function validateUiScreenPattern(root: string, config: QfaiConfig): Promise<Issue[]> {
  // The same walk `QFAI-CONTRACT-042` and the surface rule use.
  const uiDir = path.resolve(root, config.paths.contractsDir, "ui");
  const documents = (await readUiContractDocuments(uiDir, root))
    .slice()
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const unknown = documents.flatMap(({ relativePath, parsed }) =>
    unknownPatternsIn(parsed, relativePath),
  );

  const vocabulary = SCREEN_PATTERNS.map((pattern) => `\`${pattern}\``).join(", ");
  return unknown.map(({ file, index, screenId, value }) => {
    const where = screenId
      ? `screen '${screenId}' (\`screens[${String(index)}]\`)`
      : `\`screens[${String(index)}]\``;
    return issue(
      UI_SCREEN_PATTERN_RULE_ID,
      `UI contract ${where} declares \`pattern: ${value}\`, which is not a screen type of the business UI pattern reference. The vocabulary is ${vocabulary}.`,
      "error",
      file,
      "contracts.ui.pattern",
      screenId ? [screenId] : undefined,
      "canonical",
      `Set \`pattern\` to one of ${vocabulary}, or drop the key for a screen that fits no type, such as a marketing screen.`,
    );
  });
}
