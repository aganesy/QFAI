/**
 * Install-provenance record handling for files QFAI writes into an
 * adopter's tree (shipped-workflows contract).
 *
 * The record lives at `.qfai/install-provenance.json` in the adopter tree
 * and is tracked — deliberately NOT part of the managed gitignore block —
 * because a deliberately deleted (declined) file is only recognizable as
 * declined while the record survives a fresh clone.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type WorkflowProvenanceEntry = {
  /** Hex digest of the bytes QFAI wrote (not of the current file). */
  sha256: string;
  /** The package version that wrote the file. */
  installedByVersion: string;
  /** ISO 8601 timestamp of the write. */
  installedAt: string;
};

export type InstallProvenanceRecord = {
  workflows: Record<string, WorkflowProvenanceEntry>;
};

/**
 * Closed file-state enum from the shipped-workflows contract: decided by
 * two independent observations — whether the name has a provenance entry,
 * and what is on disk.
 */
export type WorkflowFileState = "absent" | "adopter-owned" | "installed" | "modified" | "declined";

const PROVENANCE_SEGMENTS = [".qfai", "install-provenance.json"] as const;

/**
 * Reads the install-provenance record from the adopter tree rooted at
 * `rootDir`.
 *
 * Fail-safe by contract: a missing or unreadable file, malformed JSON, or
 * a missing/invalid `workflows` key all resolve to an EMPTY record —
 * never a throw. An empty record means every file on disk is treated as
 * adopter-owned, which is the direction in which QFAI touches nothing.
 * Entries that do not carry the full string shape are dropped rather than
 * surfaced partially.
 */
export async function readInstallProvenance(rootDir: string): Promise<InstallProvenanceRecord> {
  const recordPath = path.join(rootDir, ...PROVENANCE_SEGMENTS);

  let raw: string;
  try {
    raw = await readFile(recordPath, "utf-8");
  } catch {
    // Absent or unreadable: empty record (fail-safe).
    return { workflows: {} };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Malformed JSON: empty record (fail-safe).
    return { workflows: {} };
  }

  return { workflows: extractWorkflows(parsed) };
}

/**
 * Resolves the file state for one shipped workflow name from the two
 * contract observations: the name's provenance entry (if any), the digest
 * of the file currently on disk (`undefined` when absent), and the digest
 * of the packaged template bytes.
 *
 * - no entry + absent on disk: `absent` (never installed)
 * - no entry + present on disk: `adopter-owned` (name collision — the
 *   adopter authored it, QFAI leaves it alone)
 * - entry + present on disk, bytes equal the packaged template: `installed`
 * - entry + present on disk, bytes differ: `modified`
 * - entry + present on disk, no packaged digest available (the current
 *   package no longer ships the name): `modified` — the conservative
 *   direction, since equality with the packaged template cannot be shown
 * - entry + absent on disk: `declined` (deliberately removed — never
 *   recreated, never reported as stale, never pruned)
 */
export function resolveWorkflowFileState(
  provenanceEntry: WorkflowProvenanceEntry | undefined,
  diskSha256: string | undefined,
  packagedSha256: string | undefined,
): WorkflowFileState {
  if (provenanceEntry === undefined) {
    return diskSha256 === undefined ? "absent" : "adopter-owned";
  }
  if (diskSha256 === undefined) {
    return "declined";
  }
  return packagedSha256 !== undefined && diskSha256 === packagedSha256 ? "installed" : "modified";
}

/**
 * Writes the install-provenance record into the adopter tree rooted at
 * `rootDir`, creating the parent directory when needed. This is the single
 * writer for the record file; the serialized form is the pretty-printed
 * JSON shape `readInstallProvenance` round-trips, with a trailing newline.
 */
export async function writeInstallProvenance(
  rootDir: string,
  record: InstallProvenanceRecord,
): Promise<void> {
  const recordPath = path.join(rootDir, ...PROVENANCE_SEGMENTS);
  await mkdir(path.dirname(recordPath), { recursive: true });
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf-8");
}

/**
 * Builds the record entry for one freshly written workflow file. The
 * sha256 is the hex digest of exactly the bytes that were written — never
 * of whatever the file holds later — which is what keeps a future byte
 * difference on disk attributable (adopter edit vs newer packaged
 * template). Stamped once at install time.
 */
export function createWorkflowProvenanceEntry(
  writtenBytes: Uint8Array,
  installedByVersion: string,
  installedAt: string,
): WorkflowProvenanceEntry {
  return {
    sha256: createHash("sha256").update(writtenBytes).digest("hex"),
    installedByVersion,
    installedAt,
  };
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractWorkflows(parsed: unknown): Record<string, WorkflowProvenanceEntry> {
  if (!isRecordObject(parsed)) {
    return {};
  }
  const workflowsValue = parsed["workflows"];
  if (!isRecordObject(workflowsValue)) {
    return {};
  }
  const workflows: Record<string, WorkflowProvenanceEntry> = {};
  for (const [name, value] of Object.entries(workflowsValue)) {
    const entry = toWorkflowEntry(value);
    if (entry !== undefined) {
      workflows[name] = entry;
    }
  }
  return workflows;
}

function toWorkflowEntry(value: unknown): WorkflowProvenanceEntry | undefined {
  if (!isRecordObject(value)) {
    return undefined;
  }
  const sha256 = value["sha256"];
  const installedByVersion = value["installedByVersion"];
  const installedAt = value["installedAt"];
  if (
    typeof sha256 !== "string" ||
    typeof installedByVersion !== "string" ||
    typeof installedAt !== "string"
  ) {
    return undefined;
  }
  return { sha256, installedByVersion, installedAt };
}
