/**
 * A `blocked` ledger row, read against the change request it names.
 *
 * `blocked` says the row cannot proceed until something is decided, and the
 * thing is named in the row: a `CR-*` whose record lives in `.qfai/decisions/`.
 * Once that record reaches a terminal `Status`, the block is over — but nothing
 * moves the row, and nothing reports it either. Six rows of one pack sat that
 * way for a month while their tests existed, carried their annotation and ran
 * in CI, and the ledger answered "what is left" with nineteen where nine were
 * open.
 *
 * The finding is per row rather than per request: one approved request releases
 * a whole blocked set, and a reader repairing them takes them one at a time.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const DECISIONS = path.join(repoRoot, ".qfai", "decisions");
const SPECS = path.join(repoRoot, ".qfai", "specs");

/**
 * The rows already known to be blocked over a decision that has been taken.
 *
 * A backlog, not permission. Moving a row out of `blocked` is `/qfai-implement`'s
 * write — it owns `Status` and `Evidence` — so the repair is a stage run rather
 * than an edit, and this list is what stops a seventh row joining them while
 * that run is outstanding.
 *
 * The list may only shrink. A repair strikes its entry in the same change,
 * because the assertion below is an equality: a row that leaves the set without
 * leaving this list fails exactly as a new one does.
 */
const KNOWN_BLOCKED_OVER_A_DECISION: readonly string[] = [];

/** The one `Status` a change request carries while it still blocks anything. */
const OPEN = "open";

const CHANGE_REQUEST = /CR-\d{8}-\d{4}/g;

/** Every change request's recorded status, by id. */
async function requestStatuses(): Promise<Map<string, string>> {
  const statuses = new Map<string, string>();
  for (const name of await readdir(DECISIONS)) {
    if (!name.startsWith("CR-") || !name.endsWith(".md")) continue;
    const text = await readFile(path.join(DECISIONS, name), "utf-8");
    const id = /- ID: `([^`]+)`/.exec(text)?.[1];
    const status = /- Status: `([^`]+)`/.exec(text)?.[1];
    if (id !== undefined && status !== undefined) statuses.set(id, status);
  }
  return statuses;
}

type BlockedRow = { pack: string; tdd: string; requests: string[] };

/** Every ledger row at `blocked`, with the change requests its cells name. */
async function blockedRows(): Promise<BlockedRow[]> {
  const rows: BlockedRow[] = [];
  const packs = (await readdir(SPECS, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("spec-"))
    .map((entry) => entry.name)
    .sort();
  for (const pack of packs) {
    let text: string;
    try {
      text = await readFile(path.join(SPECS, pack, "tdd", "test-list.md"), "utf-8");
    } catch {
      // A pack with no ledger has no rows to read.
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("|")) continue;
      const cells = line.split("|").map((cell) => cell.trim());
      const tdd = cells[1] ?? "";
      if (!/^TDD-\d{4}$/.test(tdd)) continue;
      if (!cells.some((cell) => cell.toLowerCase() === "blocked")) continue;
      rows.push({ pack, tdd, requests: [...new Set(line.match(CHANGE_REQUEST) ?? [])] });
    }
  }
  return rows;
}

describe("a blocked row names a decision that is still open", () => {
  it("reports every row whose change request has already been decided", async () => {
    const statuses = await requestStatuses();
    expect(statuses.size, "no change request records were read").toBeGreaterThan(0);

    const rows = await blockedRows();
    const decided = rows
      .flatMap(({ pack, tdd, requests }) =>
        requests
          .map((id) => ({ id, status: statuses.get(id) }))
          .filter(({ status }) => status !== undefined && status !== OPEN)
          .map(({ id, status }) => `${pack} ${tdd} ${id} ${status}`),
      )
      .sort();

    expect(decided).toEqual([...KNOWN_BLOCKED_OVER_A_DECISION].sort());
  });

  it("reports a blocked row that names no change request at all", async () => {
    // `blocked` with nothing named is a row nobody can unblock: there is no
    // record to read, so no later run can tell whether the reason still holds.
    const rows = await blockedRows();
    const nameless = rows
      .filter(({ requests }) => requests.length === 0)
      .map(({ pack, tdd }) => `${pack} ${tdd}`)
      .sort();

    expect(nameless).toEqual([]);
  });

  it("reports a blocked row naming a change request with no record", async () => {
    // The id resolves to nothing, so the block rests on a document that is not
    // there — indistinguishable, from the ledger, from one that is still open.
    const statuses = await requestStatuses();
    const rows = await blockedRows();
    const dangling = rows
      .flatMap(({ pack, tdd, requests }) =>
        requests.filter((id) => !statuses.has(id)).map((id) => `${pack} ${tdd} ${id}`),
      )
      .sort();

    expect(dangling).toEqual([]);
  });
});
