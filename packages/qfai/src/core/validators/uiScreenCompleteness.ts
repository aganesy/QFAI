/**
 * The `states` and the `navigation` an application screen of a UI contract
 * declares.
 *
 * A screen built from its contract holds what the contract lists. One that
 * names no states is built without its empty, loading, error and success
 * states, and one that names no navigation is built as a page outside the app.
 * Both are standard parts of a screen, so a missing one is reported.
 *
 * ## What is asked, and of whom
 *
 * Every `screens[]` mapping entry whose `surface` is not `marketing`. A
 * marketing screen is read against the marketing pattern reference, which asks
 * for neither part. A `screens` that is not a list, and an entry that is not a
 * mapping, are left to `QFAI-CONTRACT-042`.
 *
 * - `QFAI-CONTRACT-053`: the screen has no `states` list, or the list has no
 *   entry for one of the five state ids. A state the screen cannot reach is
 *   still listed, with `none` and the reason, so a missing id is a state nobody
 *   decided on.
 * - `QFAI-CONTRACT-054`: the screen has no `navigation` mapping, or one that
 *   holds nothing. A screen that deliberately sits in no navigation writes
 *   `navigation: { none: <reason> }`; a `none` with an empty reason states
 *   nothing.
 *
 * What an entry holds beyond its id, and which navigation keys are set, is the
 * reviewer's to judge.
 *
 * ## Severity
 *
 * A warning: the screen can still be built and reviewed, and the finding names
 * a part the contract has not decided on rather than a contract that is wrong.
 */

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { readUiContractDocuments } from "../contracts/screenContracts.js";
import type { Issue } from "../types.js";
import { screenSurfaceOf } from "./uiScreenSurface.js";
import { issue } from "./utils.js";

export const UI_SCREEN_STATES_RULE_ID = "QFAI-CONTRACT-053";
export const UI_SCREEN_NAVIGATION_RULE_ID = "QFAI-CONTRACT-054";

/** The states every application screen lists, in the order the guide writes them. */
export const SCREEN_STATE_IDS = ["default", "empty", "loading", "error", "success"] as const;

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isMapping(value)) return Object.keys(value).length > 0;
  return true;
}

/**
 * The state ids a screen does not list, or `undefined` when it has no `states`
 * list at all.
 */
function missingStateIds(entry: Readonly<Record<string, unknown>>): string[] | undefined {
  const states = entry.states;
  if (!Array.isArray(states)) return undefined;
  const listed = new Set(
    states.flatMap((state: unknown) =>
      isMapping(state) && typeof state.id === "string" ? [state.id.trim()] : [],
    ),
  );
  return SCREEN_STATE_IDS.filter((id) => !listed.has(id));
}

/** Whether a screen's `navigation` places it in the app or says why it is in none. */
function declaresNavigation(entry: Readonly<Record<string, unknown>>): boolean {
  const navigation = entry.navigation;
  if (!isMapping(navigation)) return false;
  return Object.entries(navigation).some(([key, value]) =>
    key === "none" ? typeof value === "string" && value.trim().length > 0 : isFilled(value),
  );
}

type ScreenEntry = {
  file: string;
  index: number;
  screenId: string;
  entry: Record<string, unknown>;
};

function applicationScreensIn(parsed: unknown, file: string): ScreenEntry[] {
  if (!isMapping(parsed) || !Array.isArray(parsed.screens)) return [];
  const screens: unknown[] = parsed.screens;
  return screens.flatMap((entry, index) => {
    if (!isMapping(entry) || screenSurfaceOf(entry) === "marketing") return [];
    const screenId = typeof entry.id === "string" ? entry.id.trim() : "";
    return [{ file, index, screenId, entry }];
  });
}

function whereOf({ index, screenId }: ScreenEntry): string {
  return screenId
    ? `screen '${screenId}' (\`screens[${String(index)}]\`)`
    : `\`screens[${String(index)}]\``;
}

function statesFinding(screen: ScreenEntry): Issue | undefined {
  const missing = missingStateIds(screen.entry);
  if (missing !== undefined && missing.length === 0) return undefined;
  const what =
    missing === undefined
      ? "declares no `states`"
      : `lists no ${missing.map((id) => `\`${id}\``).join(", ")} state`;
  const all = SCREEN_STATE_IDS.map((id) => `\`${id}\``).join(", ");
  return issue(
    UI_SCREEN_STATES_RULE_ID,
    `UI contract ${whereOf(screen)} ${what}, so the screen is built without deciding what it shows there.`,
    "warning",
    screen.file,
    "contracts.ui.states",
    screen.screenId ? [screen.screenId] : undefined,
    "canonical",
    `List one \`states\` entry for each of ${all}, with what renders and the next action, or \`none\` with the reason for a state the screen cannot reach. A marketing screen sets \`surface: marketing\` instead.`,
  );
}

function navigationFinding(screen: ScreenEntry): Issue | undefined {
  if (declaresNavigation(screen.entry)) return undefined;
  return issue(
    UI_SCREEN_NAVIGATION_RULE_ID,
    `UI contract ${whereOf(screen)} declares no \`navigation\`, so the screen is built without its place in the app.`,
    "warning",
    screen.file,
    "contracts.ui.navigation",
    screen.screenId ? [screen.screenId] : undefined,
    "canonical",
    "Write `navigation` with the `shell` the screen renders inside, its `entry_points` and `back_to`, or `navigation: { none: <reason> }` for a screen that is in no navigation on purpose. A marketing screen sets `surface: marketing` instead.",
  );
}

export async function validateUiScreenCompleteness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  // The same walk `QFAI-CONTRACT-042` and the screen reader use, so this rule
  // sees exactly the contract files they see.
  const uiDir = path.resolve(root, config.paths.contractsDir, "ui");
  const documents = (await readUiContractDocuments(uiDir, root))
    .slice()
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const screens = documents.flatMap(({ relativePath, parsed }) =>
    applicationScreensIn(parsed, relativePath),
  );
  return [
    ...screens.flatMap((screen) => statesFinding(screen) ?? []),
    ...screens.flatMap((screen) => navigationFinding(screen) ?? []),
  ];
}
