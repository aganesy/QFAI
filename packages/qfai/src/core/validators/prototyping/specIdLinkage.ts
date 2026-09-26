import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import { PROTOTYPING_JSON_REL } from "../../prototyping/paths.js";
import { readUiContractsCovered } from "../../prototyping/specsCovered.js";
import { resolveSurfaceUnion } from "../../prototyping/specResolution.js";
import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

/** Validate that the frozen UI contract IDs still refer to declared contracts. */
export async function validateSpecIdLinkage(root: string, config: QfaiConfig): Promise<Issue[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path.join(root, PROTOTYPING_JSON_REL), "utf-8"));
  } catch {
    return [];
  }
  const covered = readUiContractsCovered(parsed);
  if (covered.kind !== "ok") {
    return [
      issue(
        "QFAI-PROT-008",
        "prototyping.json requires uiContractsCovered[] with full CON-UI-NNNN IDs. Re-seed with `qfai prototyping iterate --cycle 0`.",
        "error",
        PROTOTYPING_JSON_REL,
        "prototyping.uiContractLinkage.scope",
      ),
    ];
  }
  const live = new Set(await resolveSurfaceUnion(root, config));
  return covered.value
    .filter((id) => !live.has(id))
    .map((id) =>
      issue(
        "QFAI-PROT-008",
        `prototyping.json uiContractsCovered references UI contract ${id} without screens[].`,
        "error",
        PROTOTYPING_JSON_REL,
        "prototyping.uiContractLinkage.missingContract",
        [path.posix.join(config.paths.contractsDir.replace(/\\/g, "/"), "ui")],
      ),
    );
}
