/** The cycle-0 UI contract scope has one authoritative field. */
export type UiContractsCoveredResult =
  { kind: "ok"; value: string[] } | { kind: "legacy" } | { kind: "malformed"; reason: string };

const UI_CONTRACT_ID = /^CON-UI-\d{4}$/u;

export function readUiContractsCovered(value: unknown): UiContractsCoveredResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { kind: "malformed", reason: "record is not an object" };
  }
  const record = value as Record<string, unknown>;
  if ("specsCovered" in record || "frozenSpecsCovered" in record) {
    return { kind: "legacy" };
  }
  const covered = record.uiContractsCovered;
  if (!Array.isArray(covered) || covered.length === 0) {
    return { kind: "malformed", reason: "uiContractsCovered must be a non-empty array" };
  }
  if (covered.some((id: unknown) => typeof id !== "string" || !UI_CONTRACT_ID.test(id))) {
    return { kind: "malformed", reason: "uiContractsCovered entries must match CON-UI-NNNN" };
  }
  if (new Set(covered).size !== covered.length) {
    return { kind: "malformed", reason: "uiContractsCovered contains duplicate IDs" };
  }
  return { kind: "ok", value: covered as string[] };
}

export type UiContractScopeDrift = {
  drifted: boolean;
  added: string[];
  removed: string[];
};

/** Compare the frozen contract IDs with one live snapshot. */
export function checkUiContractsCoveredDrift(
  frozen: readonly string[],
  currentLive: readonly string[],
): UiContractScopeDrift {
  const frozenSet = new Set(frozen);
  const liveSet = new Set(currentLive);
  const added = [...liveSet].filter((id) => !frozenSet.has(id)).sort();
  const removed = [...frozenSet].filter((id) => !liveSet.has(id)).sort();
  return { drifted: added.length > 0 || removed.length > 0, added, removed };
}
