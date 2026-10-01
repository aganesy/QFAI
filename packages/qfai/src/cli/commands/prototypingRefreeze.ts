/**
 * Re-take the frozen `DESIGN.md` hash after an edit that changed only prose.
 *
 * Cycle 0 records two hashes: one over the file's bytes, which every later
 * cycle and `certify` compare, and one over the tokens the parser reads. When
 * the tokens still hash alike, the edit touched nothing a capture is checked
 * against, so the byte hash is replaced and the loop goes on. A token change
 * is refused: it needs a new loop from cycle 0.
 */
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";

import { hashDesignMd, hashDesignMdTokens, parseDesignMd } from "../../core/design/designMd.js";
import { PROTOTYPING_JSON_REL } from "../../core/prototyping/paths.js";
import { info, warn } from "../../core/logger.js";

const ROOT_DESIGN_MD_REL = "DESIGN.md";
const COMMAND = "qfai prototyping refreeze";

/** What the caller asked for. */
export type RefreezeOptions = {
  readonly root: string;
  readonly dryRun: boolean;
};

/** One re-freeze, appended to `prototyping.json#designMdRefreezeLog`. */
export type RefreezeLogEntry = {
  readonly from: string;
  readonly to: string;
  readonly cycle: number | null;
  readonly at: string;
};

/**
 * Re-take the hash, or refuse and say why.
 *
 * Returns the process exit code: `0` re-frozen (or would be, under
 * `dryRun`), or nothing to do; `2` refused, the exit the hash gate itself
 * uses.
 */
export async function runPrototypingRefreeze(options: RefreezeOptions): Promise<number> {
  const protoAbs = path.join(options.root, PROTOTYPING_JSON_REL);
  const record = await readJsonObject(protoAbs);
  if (record === null) {
    warn(`${COMMAND}: cannot read ${PROTOTYPING_JSON_REL}. Cycle 0 is what freezes DESIGN.md.`);
    return 2;
  }
  const plan = await planRefreeze(options.root, record);
  if (plan.kind === "refused") {
    warn(`${COMMAND}: ${plan.reason}`);
    return 2;
  }
  if (plan.kind === "unchanged") {
    info(`${COMMAND}: DESIGN.md matches the frozen hash. Nothing to do.`);
    return 0;
  }

  const entry: RefreezeLogEntry = {
    from: plan.from,
    to: plan.to,
    cycle: typeof record.cycle === "number" ? record.cycle : null,
    at: new Date().toISOString(),
  };
  if (options.dryRun) {
    info(`${COMMAND}: dry run — nothing written.`);
    info(`  DESIGN.md sha256: ${entry.from} -> ${entry.to} (tokens unchanged)`);
    return 0;
  }
  const designMd: Record<string, unknown> = isRecord(record.designMd) ? record.designMd : {};
  const nextRecord: Record<string, unknown> = {
    ...record,
    designMd: { ...designMd, sha256: plan.to },
    designMdRefreezeLog: [...readLog(record.designMdRefreezeLog), entry],
  };
  await writeFile(protoAbs, `${JSON.stringify(nextRecord, null, 2)}\n`, "utf-8");
  info(`${COMMAND}: ${PROTOTYPING_JSON_REL} updated.`);
  info(`  DESIGN.md sha256: ${entry.from} -> ${entry.to} (tokens unchanged)`);
  info("  A certified loop needs `qfai prototyping certify` again to refresh its certificate.");
  return 0;
}

type RefreezePlan =
  | { readonly kind: "refused"; readonly reason: string }
  | { readonly kind: "unchanged" }
  | { readonly kind: "refreeze"; readonly from: string; readonly to: string };

/** Decide from the frozen record and the live file, writing nothing. */
async function planRefreeze(root: string, record: Record<string, unknown>): Promise<RefreezePlan> {
  const frozen = readFrozenDesignMd(record.designMd);
  if (frozen === null) {
    return {
      kind: "refused",
      reason: `${PROTOTYPING_JSON_REL}#designMd records no sha256. Re-run from cycle 0.`,
    };
  }
  let text: string;
  try {
    text = await readFile(path.join(root, ROOT_DESIGN_MD_REL), "utf-8");
  } catch {
    return { kind: "refused", reason: `root DESIGN.md is missing at ${ROOT_DESIGN_MD_REL}.` };
  }
  const currentSha = hashDesignMd(text);
  if (currentSha === frozen.sha256) return { kind: "unchanged" };
  if (frozen.tokensSha256 === null) {
    return {
      kind: "refused",
      reason:
        `${PROTOTYPING_JSON_REL}#designMd records no tokensSha256, so a prose-only edit cannot ` +
        "be told from a token edit. Re-run prototyping from cycle 0.",
    };
  }
  const parsed = parseDesignMd(text);
  if ("error" in parsed) {
    return {
      kind: "refused",
      reason:
        `root DESIGN.md failed to parse — ${parsed.error.message} ` +
        `(path=${parsed.error.path || "<root>"}).`,
    };
  }
  if (hashDesignMdTokens(parsed.data) !== frozen.tokensSha256) {
    return {
      kind: "refused",
      reason:
        "the DESIGN.md tokens changed since cycle 0, not only its prose. " +
        "Re-run prototyping from cycle 0.",
    };
  }
  return { kind: "refreeze", from: frozen.sha256, to: currentSha };
}

function readFrozenDesignMd(
  value: unknown,
): { sha256: string; tokensSha256: string | null } | null {
  if (!isRecord(value) || typeof value.sha256 !== "string") return null;
  return {
    sha256: value.sha256,
    tokensSha256: typeof value.tokensSha256 === "string" ? value.tokensSha256 : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A JSON object at `abs`, or `null` when it is absent or not an object. */
async function readJsonObject(abs: string): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await readFile(abs, "utf-8");
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Earlier entries, or `[]` when the field is absent or malformed. */
function readLog(value: unknown): RefreezeLogEntry[] {
  if (!Array.isArray(value)) return [];
  const out: RefreezeLogEntry[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    if (typeof entry.from !== "string" || typeof entry.to !== "string") continue;
    out.push({
      from: entry.from,
      to: entry.to,
      cycle: typeof entry.cycle === "number" ? entry.cycle : null,
      at: typeof entry.at === "string" ? entry.at : "",
    });
  }
  return out;
}
