/** Resolve prototyping units from declared UI contracts. */

import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { declaredContractId, extractDeclaredContractIds } from "../contractsDecl.js";
import { isCanonicalSurface, type CanonicalSurface } from "../domain/surface.js";
import { extractH2Sections } from "../parse/markdown.js";
import { parseRenderedMarkdownTables } from "../specPackParsers.js";
import { isEnoent } from "../fs/errno.js";

/** Project surface declared by the Stack table of the configured technology contract. */
export async function readProjectSurface(
  root: string,
  config: QfaiConfig,
): Promise<CanonicalSurface | undefined> {
  let text: string;
  try {
    text = await readFile(path.resolve(root, config.paths.contractsDir, "tech.md"), "utf-8");
  } catch (error) {
    if (isEnoent(error)) return undefined;
    throw error;
  }
  const section = extractH2Sections(text).get("Stack");
  const table = section && parseRenderedMarkdownTables(section.body)[0];
  if (!table) return undefined;
  const row = table.rows.find((cells) => cells[table.headers.indexOf("Component")] === "Surface");
  const choice = row?.[table.headers.indexOf("Choice")]?.replaceAll("`", "").trim();
  return choice && isCanonicalSurface(choice) ? choice : undefined;
}

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
 * Markdown supplies a UI responsibility; YAML supplies its concrete screen entries. Each file
 * contributes one unit only when it declares exactly one canonical UI ID.
 * Contract validation reports malformed and duplicate declarations separately.
 */
export async function readUiContractInventory(
  root: string,
  config: QfaiConfig,
): Promise<UiContractInventoryEntry[]> {
  const uiRoot = path.resolve(root, config.paths.contractsDir, "ui");
  const files = (
    await fg("**/*.{yaml,yml,md}", { cwd: uiRoot, absolute: true, onlyFiles: true })
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
    const contractPath = path.relative(root, file).split(path.sep).join("/");
    if (path.extname(file).toLowerCase() === ".md") {
      const id = declaredContractId(file, text);
      if (id?.startsWith("UI-")) {
        entries.push({ uiContractId: id, contractPath, hasScreens: false, screenIds: [] });
      }
      continue;
    }
    const declared = extractDeclaredContractIds(text).filter((id) => /^UI-\d{4}$/.test(id));
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
      contractPath,
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
    .filter((entry) => entry.hasScreens || entry.contractPath.endsWith(".md"))
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

/** Return every Markdown UI responsibility and every structured UI contract with screens. */
export async function resolveAllUiBearingSpecs(
  root: string,
  config: QfaiConfig,
): Promise<string[]> {
  const ids = (await readUiContractInventory(root, config))
    .filter((entry) => entry.hasScreens || entry.contractPath.endsWith(".md"))
    .map((entry) => entry.uiContractId);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/** Live scope used by cycle drift, show and certification. */
export async function resolveSurfaceUnion(root: string, config: QfaiConfig): Promise<string[]> {
  return resolveAllUiBearingSpecs(root, config);
}
