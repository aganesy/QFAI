/**
 * The pack-level declaration that a discussion pack inherits the current root
 * `DESIGN.md`.
 *
 * A pack that changes existing screens and keeps the design direction writes
 * `- design_direction: inherit` in the classification block of
 * `01_Context.md`. The research a new direction needs is then not owed: the
 * Trend Scan, the minimum counts of competitive and catalogue references, and
 * the screen contracts and review bundle sidecars.
 *
 * The declaration is not allowed on a pack that adds a screen or records a
 * direction of its own; {@link findInheritanceConflicts} names each case.
 */
import path from "node:path";

import { findConfigRoot, type QfaiConfig } from "../../config.js";
import { readUiContractScreenContracts } from "../../contracts/screenContracts.js";
import { maskNonSpecRegions } from "../../specPackParsers.js";
import { readSafe } from "../utils.js";

const DESIGN_DIRECTION_RE = /^\s*-\s*design_direction:\s*(\S+)\s*$/im;
const SCREEN_ID_RE = /^\s*-\s*screen_id:\s*(\S+)\s*$/gim;
const DIRECTION_FIELDS = ["adopted_theme", "brand_accent"] as const;
const UNFILLED_RE = /^(?:\[[^\]]*\]|tbd|todo|n\/a|none)?$/i;

/** True when `01_Context.md` content declares `design_direction: inherit`. */
export function declaresInheritedDesign(contextContent: string): boolean {
  return DESIGN_DIRECTION_RE.exec(contextContent)?.[1] === "inherit";
}

/** True when the pack at `root` declares `design_direction: inherit`. */
export async function packInheritsDesign(root: string): Promise<boolean> {
  const content = await readSafe(path.join(root, "01_Context.md"));
  return content ? declaresInheritedDesign(content) : false;
}

export type InheritanceConflicts = {
  /** Screen IDs the pack's screen contracts name that no UI contract of the project declares. */
  newScreens: string[];
  /** Design Direction fields the pack fills with a value of its own. */
  directionFields: string[];
};

/**
 * What makes an inheritance declaration wrong for the pack at `root`.
 *
 * The project is the directory holding `qfai.config.yaml` above the pack; its
 * UI contracts are the screens that already exist.
 */
export async function findInheritanceConflicts(
  root: string,
  contextContent: string,
  config: QfaiConfig,
): Promise<InheritanceConflicts> {
  return {
    newScreens: await findNewScreens(root, config),
    directionFields: findDirectionFields(contextContent),
  };
}

async function findNewScreens(root: string, config: QfaiConfig): Promise<string[]> {
  const contracts = await readSafe(path.join(root, "uiux", "40_screen_contracts.md"));
  if (!contracts) return [];
  const packScreens = [...maskNonSpecRegions(contracts).matchAll(SCREEN_ID_RE)]
    .map((match) => match[1] ?? "")
    .filter((id) => !UNFILLED_RE.test(id));
  if (packScreens.length === 0) return [];

  const project = await findConfigRoot(root);
  const declared = new Set(
    (await readUiContractScreenContracts(project.root, config.paths.contractsDir)).map(
      (screen) => screen.screenId,
    ),
  );
  return [...new Set(packScreens.filter((id) => !declared.has(id)))];
}

function findDirectionFields(contextContent: string): string[] {
  const section = designDirectionSection(contextContent);
  return DIRECTION_FIELDS.filter((field) => {
    const value = new RegExp(`^\\s*-\\s*${field}:(.*)$`, "im").exec(section)?.[1]?.trim();
    return value !== undefined && !UNFILLED_RE.test(value);
  });
}

function designDirectionSection(content: string): string {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.trim().toLowerCase() === "## design direction");
  if (start === -1) return "";
  const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  return lines.slice(start + 1, end === -1 ? lines.length : end).join("\n");
}
