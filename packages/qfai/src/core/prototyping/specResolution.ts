/** Resolve prototyping units from declared UI contracts. */

import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { extractDeclaredContractIds } from "../contractsDecl.js";
import { isEnoent } from "../fs/errno.js";

export type ResolvedUiContract = {
  uiContractId: string;
  /** Project-root-relative POSIX path to the declaring contract. */
  contractPath: string;
  source: "config" | "contract-scan";
};

export type UiContractInventoryEntry = {
  uiContractId: string;
  contractPath: string;
  hasScreens: boolean;
  screenIds: string[];
};

/**
 * Read the same YAML extensions that the UI screen reader accepts. A file
 * contributes one unit only when it declares exactly one canonical UI ID.
 * Contract validation reports malformed and duplicate declarations separately.
 */
export async function readUiContractInventory(
  root: string,
  config: QfaiConfig,
): Promise<UiContractInventoryEntry[]> {
  const uiRoot = path.resolve(root, config.paths.contractsDir, "ui");
  const files = (
    await fg("**/*.{yaml,yml}", { cwd: uiRoot, absolute: true, onlyFiles: true })
  ).sort();
  const entries: UiContractInventoryEntry[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = await readFile(file, "utf-8");
    } catch (error) {
      if (isEnoent(error)) continue;
      throw error;
    }
    const declared = extractDeclaredContractIds(text).filter((id) => /^CON-UI-\d{4}$/.test(id));
    if (declared.length !== 1) continue;
    let parsed: unknown;
    try {
      parsed = parseYaml(text);
    } catch {
      continue;
    }
    const screens =
      parsed !== null &&
      typeof parsed === "object" &&
      "screens" in parsed &&
      Array.isArray(parsed.screens)
        ? parsed.screens
        : [];
    const screenIds = screens.flatMap((screen: unknown) =>
      screen !== null &&
      typeof screen === "object" &&
      "id" in screen &&
      typeof screen.id === "string"
        ? [screen.id]
        : [],
    );
    entries.push({
      uiContractId: declared[0] ?? "",
      contractPath: path.relative(root, file).replace(/\\/g, "/"),
      hasScreens: screens.length > 0,
      screenIds,
    });
  }
  return entries;
}

/** A primary pin selects one of the UI-bearing contracts; the flag wins upstream. */
export async function resolvePrimaryPrototypingSpec(
  root: string,
  config: QfaiConfig,
): Promise<ResolvedUiContract | undefined> {
  const candidates = (await readUiContractInventory(root, config))
    .filter((entry) => entry.hasScreens)
    .sort((a, b) => a.uiContractId.localeCompare(b.uiContractId));
  const pin = config.prototyping?.primaryUiContract;
  const selected = pin ? candidates.find((entry) => entry.uiContractId === pin) : candidates[0];
  if (!selected) return undefined;
  return {
    uiContractId: selected.uiContractId,
    contractPath: selected.contractPath,
    source: pin ? "config" : "contract-scan",
  };
}

/** Return every declared UI contract that has at least one screen. */
export async function resolveAllUiBearingSpecs(
  root: string,
  config: QfaiConfig,
): Promise<string[]> {
  const ids = (await readUiContractInventory(root, config))
    .filter((entry) => entry.hasScreens)
    .map((entry) => entry.uiContractId);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/** Live scope used by cycle drift, show and certification. */
export async function resolveSurfaceUnion(root: string, config: QfaiConfig): Promise<string[]> {
  return resolveAllUiBearingSpecs(root, config);
}
