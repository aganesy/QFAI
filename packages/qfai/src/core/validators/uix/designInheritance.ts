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
import { readUiContractScreenIds } from "../../contracts/screenContracts.js";
import { maskNonSpecRegions } from "../../specPackParsers.js";
import { readSafe } from "../utils.js";
import { isPlaceholder } from "./placeholder.js";

const CLASSIFICATION_HEADING = "## ui-bearing classification";
const DESIGN_DIRECTION_HEADING = "## design direction";
const DESIGN_DIRECTION_RE = /^\s*-\s*design_direction:(.*)$/im;
const SCREEN_ID_RE = /^\s*-\s*screen_id:\s*(\S+)\s*$/gim;
const DIRECTION_FIELDS = ["adopted_theme", "brand_accent"] as const;

/** The values `design_direction` accepts. */
export const DESIGN_DIRECTION_VALUES = ["new", "inherit"] as const;

/**
 * What the classification block says about the design direction. An absent
 * field and an unfilled template slot both read as `absent`.
 */
export type DesignDirectionDeclaration =
  { kind: "absent" } | { kind: "new" } | { kind: "inherit" } | { kind: "invalid"; value: string };

/** Reads `design_direction` from the classification block of `01_Context.md` content. */
export function readDesignDirectionDeclaration(contextContent: string): DesignDirectionDeclaration {
  const block = h2Section(maskNonSpecRegions(contextContent), CLASSIFICATION_HEADING);
  const value = DESIGN_DIRECTION_RE.exec(block)?.[1]?.trim();
  if (value === undefined || isPlaceholder(value)) return { kind: "absent" };
  if (value === "new" || value === "inherit") return { kind: value };
  return { kind: "invalid", value };
}

/** True when `01_Context.md` content declares `design_direction: inherit`. */
export function declaresInheritedDesign(contextContent: string): boolean {
  return readDesignDirectionDeclaration(contextContent).kind === "inherit";
}

/** True when the pack at `root` declares `design_direction: inherit`. */
export async function packInheritsDesign(root: string): Promise<boolean> {
  const content = await readSafe(path.join(root, "01_Context.md"));
  return content ? declaresInheritedDesign(content) : false;
}

export type InheritanceConflicts = {
  /** `screen_id` values in the pack that no UI contract's `screens[].id` declares. */
  newScreens: string[];
  /** Design Direction fields the pack fills with a value of its own. */
  directionFields: string[];
};

/**
 * What makes an inheritance declaration wrong for the pack at `root`.
 *
 * `projectRoot` is the project whose UI contracts hold the screens that
 * already exist. Without it, the project is the directory holding
 * `qfai.config.yaml` above the pack.
 */
export async function findInheritanceConflicts(
  root: string,
  contextContent: string,
  config: QfaiConfig,
  projectRoot?: string,
): Promise<InheritanceConflicts> {
  return {
    newScreens: await findNewScreens(root, config, projectRoot),
    directionFields: findDirectionFields(contextContent),
  };
}

async function findNewScreens(
  root: string,
  config: QfaiConfig,
  projectRoot: string | undefined,
): Promise<string[]> {
  const contracts = await readSafe(path.join(root, "uiux", "40_screen_contracts.md"));
  if (!contracts) return [];
  const packScreens = [...maskNonSpecRegions(contracts).matchAll(SCREEN_ID_RE)]
    .map((match) => match[1] ?? "")
    .filter((id) => !isPlaceholder(id));
  if (packScreens.length === 0) return [];

  const project = projectRoot ?? (await findConfigRoot(root)).root;
  const declared = await readUiContractScreenIds(project, config.paths.contractsDir);
  return [...new Set(packScreens.filter((id) => !declared.has(id)))];
}

function findDirectionFields(contextContent: string): string[] {
  const section = h2Section(maskNonSpecRegions(contextContent), DESIGN_DIRECTION_HEADING);
  return DIRECTION_FIELDS.filter((field) => {
    const value = new RegExp(`^\\s*-\\s*${field}:(.*)$`, "im").exec(section)?.[1];
    return value !== undefined && !isPlaceholder(value);
  });
}

/** The body of the H2 section whose lowercased heading is `heading`, or "". */
function h2Section(content: string, heading: string): string {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.trim().toLowerCase() === heading);
  if (start === -1) return "";
  const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  return lines.slice(start + 1, end === -1 ? lines.length : end).join("\n");
}
