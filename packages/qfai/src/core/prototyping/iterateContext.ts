/**
 * Advisory `iter-NN/iterate-context.json` writer + reader.
 *
 * The file is a structured prior-cycle hint consumed by reviewer
 * subagents that need to see what the previous cycle measured /
 * blocked on. It is NOT part of the certify gate; certify ignores
 * presence / absence.
 *
 * Locked top-level shape:
 *
 *     {
 *       priorCycle: number,
 *       priorScores: {
 *         informationArchitecture: string,
 *         navigationFlow: string,
 *         usability: string,
 *         functionality: string,
 *       },
 *       openBlockers: string[],
 *       priorTailwindContract: string,
 *     }
 *
 * No additional top-level keys are accepted by `isIterateContext`; any
 * additive field requires a spec amendment + ledger entry.
 */

import type { OrdinalScore } from "./iteration.js";

export type IterateContextScores = {
  readonly informationArchitecture: OrdinalScore;
  readonly navigationFlow: OrdinalScore;
  readonly usability: OrdinalScore;
  readonly functionality: OrdinalScore;
};

export type IterateContext = {
  readonly priorCycle: number;
  readonly priorScores: IterateContextScores;
  readonly openBlockers: readonly string[];
  readonly priorTailwindContract: string;
};

export const ITERATE_CONTEXT_KEYS: readonly (keyof IterateContext)[] = [
  "priorCycle",
  "priorScores",
  "openBlockers",
  "priorTailwindContract",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Strict shape lockdown: exactly the 4 top-level keys, with the typed
 * sub-shapes. Returns `false` for any additive key.
 */
export function isIterateContext(value: unknown): value is IterateContext {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  const expected = [...ITERATE_CONTEXT_KEYS].sort();
  if (keys.length !== expected.length) return false;
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i] !== expected[i]) return false;
  }
  if (typeof value.priorCycle !== "number" || !Number.isInteger(value.priorCycle)) return false;
  if (!isRecord(value.priorScores)) return false;
  const scoreKeys = ["informationArchitecture", "navigationFlow", "usability", "functionality"];
  for (const k of scoreKeys) {
    if (typeof value.priorScores[k] !== "string") return false;
  }
  if (!Array.isArray(value.openBlockers)) return false;
  if (!value.openBlockers.every((v) => typeof v === "string")) return false;
  if (typeof value.priorTailwindContract !== "string") return false;
  return true;
}

/**
 * Canonicalise an iterate-context record so the JSON serialisation has
 * a stable key order (matches `ITERATE_CONTEXT_KEYS`).
 */
export function canonicalIterateContext(ctx: IterateContext): IterateContext {
  return {
    priorCycle: ctx.priorCycle,
    priorScores: {
      informationArchitecture: ctx.priorScores.informationArchitecture,
      navigationFlow: ctx.priorScores.navigationFlow,
      usability: ctx.priorScores.usability,
      functionality: ctx.priorScores.functionality,
    },
    openBlockers: [...ctx.openBlockers],
    priorTailwindContract: ctx.priorTailwindContract,
  };
}
