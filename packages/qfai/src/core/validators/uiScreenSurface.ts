/**
 * The `surface` a UI contract screen declares.
 *
 * A screen is either part of the application a member uses after signing in,
 * or part of the marketing site a visitor reads before signing in: a home page,
 * an audience page, pricing, a guide, an about page with a contact form, a legal
 * notice. The two are built and reviewed against different patterns, and the
 * business-screen floor (app shell, list behaviour, feedback after a change)
 * applies to the first only. `surface` says which one a screen is.
 *
 * ## What is asked, and of whom
 *
 * The key is optional and defaults to `application`, so a contract that never
 * writes it is asked nothing. Only a value outside the vocabulary is reported,
 * because the reviewer and the implementer would read the screen against a
 * pattern list that does not exist. An empty `surface:`, or an empty string, is
 * a slot nobody has filled yet and reads as the default.
 *
 * A `screens` that is not a list, and an entry that is not a mapping, are left
 * to `QFAI-CONTRACT-042`, which reports them; this rule reads every mapping
 * entry, including one that has no `id` or `route`.
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

export const UI_SCREEN_SURFACE_RULE_ID = "QFAI-CONTRACT-051";

/** The surface kinds a screen can declare; the first is the default. */
export const SCREEN_SURFACES = ["application", "marketing"] as const;

export type ScreenSurface = (typeof SCREEN_SURFACES)[number];

/** The surface a screen reads as when its entry writes none. */
export const DEFAULT_SCREEN_SURFACE: ScreenSurface = "application";

function isScreenSurface(value: unknown): value is ScreenSurface {
  return SCREEN_SURFACES.some((surface) => surface === value);
}

/**
 * The surface a `screens[]` entry declares, or the default when it writes none
 * or leaves the key empty. A value outside the vocabulary is returned as
 * `undefined`; the rule below reports it.
 */
export function screenSurfaceOf(
  entry: Readonly<Record<string, unknown>>,
): ScreenSurface | undefined {
  const value = entry.surface;
  if (value === undefined || value === null || value === "") {
    return DEFAULT_SCREEN_SURFACE;
  }
  return isScreenSurface(value) ? value : undefined;
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

type UnknownSurface = { file: string; index: number; screenId: string; value: string };

function unknownSurfacesIn(parsed: unknown, file: string): UnknownSurface[] {
  return screensOf(parsed).flatMap((entry, index) => {
    if (!isMapping(entry) || screenSurfaceOf(entry) !== undefined) {
      return [];
    }
    const screenId = typeof entry.id === "string" ? entry.id.trim() : "";
    const value = typeof entry.surface === "string" ? entry.surface : JSON.stringify(entry.surface);
    return [{ file, index, screenId, value }];
  });
}

export async function validateUiScreenSurface(root: string, config: QfaiConfig): Promise<Issue[]> {
  // The same walk `QFAI-CONTRACT-042` and the screen reader use, so this rule
  // sees exactly the contract files they see.
  const uiDir = path.resolve(root, config.paths.contractsDir, "ui");
  const documents = (await readUiContractDocuments(uiDir, root))
    .slice()
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const unknown = documents.flatMap(({ relativePath, parsed }) =>
    unknownSurfacesIn(parsed, relativePath),
  );

  const vocabulary = SCREEN_SURFACES.map((surface) => `\`${surface}\``).join(" or ");
  return unknown.map(({ file, index, screenId, value }) => {
    const where = screenId
      ? `screen '${screenId}' (\`screens[${String(index)}]\`)`
      : `\`screens[${String(index)}]\``;
    return issue(
      UI_SCREEN_SURFACE_RULE_ID,
      `UI contract ${where} declares \`surface: ${value}\`, which is not a surface kind. The vocabulary is ${vocabulary}.`,
      "error",
      file,
      "contracts.ui.surface",
      screenId ? [screenId] : undefined,
      "canonical",
      `Set \`surface\` to ${vocabulary}, or drop the key for an application screen. A marketing screen is one a visitor sees before signing in that exists to explain, persuade or inform.`,
    );
  });
}
