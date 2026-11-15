/**
 * The `omitted` list a UI contract screen declares.
 *
 * `.agents/rules/interface-clarity.md` lists the parts every business screen
 * has, and leaving one out needs a reason recorded in the screen's UI contract.
 * `omitted` is that record: each entry names the part it leaves out and why. A
 * reviewer reads it to tell a deliberate omission from a missing part, so an
 * entry it cannot read as a part and a reason defeats the list.
 *
 * ## What is asked, and of whom
 *
 * The key is optional, so a contract that never writes it is asked nothing. An
 * empty `omitted:` reads as no entries. A value that is not a list, an entry
 * that is not a mapping, and an entry whose `part` or `reason` is missing or
 * blank are reported. Which part names are meaningful is the reviewer's to
 * judge, not this rule's: it checks the shape only.
 *
 * A `screens` that is not a list, and a screen entry that is not a mapping, are
 * left to `QFAI-CONTRACT-042`, which reports them.
 *
 * ## Severity
 *
 * An error, as for the other shape checks of a UI contract screen.
 */

import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { readUiContractDocuments } from "../contracts/screenContracts.js";
import type { Issue } from "../types.js";
import { isMapping, screensOf } from "./uiScreenSurface.js";
import { issue } from "./utils.js";

export const UI_SCREEN_OMITTED_RULE_ID = "QFAI-CONTRACT-052";

/** The keys each `omitted` entry must fill with a non-blank string. */
export const OMITTED_ENTRY_KEYS = ["part", "reason"] as const;

function isFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * What is wrong with a screen's `omitted` value, one sentence per defect, or
 * nothing when the key is absent, empty or well formed.
 */
export function omittedDefectsOf(entry: Readonly<Record<string, unknown>>): string[] {
  const value = entry.omitted;
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    return ["`omitted` is not a list"];
  }
  return value.flatMap((item: unknown, index) => {
    const where = `\`omitted[${String(index)}]\``;
    if (!isMapping(item)) {
      return [`${where} is not a mapping with \`part\` and \`reason\``];
    }
    const missing = OMITTED_ENTRY_KEYS.filter((key) => !isFilled(item[key]));
    return missing.length === 0
      ? []
      : [`${where} has no ${missing.map((key) => `non-blank string \`${key}\``).join(" and no ")}`];
  });
}

type OmittedDefect = { file: string; index: number; screenId: string; defect: string };

function omittedDefectsIn(parsed: unknown, file: string): OmittedDefect[] {
  return screensOf(parsed).flatMap((entry, index) => {
    if (!isMapping(entry)) {
      return [];
    }
    const screenId = typeof entry.id === "string" ? entry.id.trim() : "";
    return omittedDefectsOf(entry).map((defect) => ({ file, index, screenId, defect }));
  });
}

export async function validateUiScreenOmitted(root: string, config: QfaiConfig): Promise<Issue[]> {
  // The same walk `QFAI-CONTRACT-042` and the surface check use, so this rule
  // sees exactly the contract files they see.
  const uiDir = path.resolve(root, config.paths.contractsDir, "ui");
  const documents = (await readUiContractDocuments(uiDir, root))
    .slice()
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const defects = documents.flatMap(({ relativePath, parsed }) =>
    omittedDefectsIn(parsed, relativePath),
  );

  return defects.map(({ file, index, screenId, defect }) => {
    const where = screenId
      ? `screen '${screenId}' (\`screens[${String(index)}]\`)`
      : `\`screens[${String(index)}]\``;
    return issue(
      UI_SCREEN_OMITTED_RULE_ID,
      `UI contract ${where}: ${defect}. Each \`omitted\` entry names a part the screen leaves out and the reason, as \`{ part, reason }\`.`,
      "error",
      file,
      "contracts.ui.omitted",
      screenId ? [screenId] : undefined,
      "canonical",
      "Write each entry as a mapping with a non-blank `part`, naming a part from the list in `.agents/rules/interface-clarity.md` that applies to the screen, and a non-blank `reason` saying why the screen leaves it out. Drop the key when the screen leaves nothing out.",
    );
  });
}
