/**
 * A ledger row held at `blocked` names a Change Request still open.
 *
 * `blocked` says the row waits on a decision. A Change Request at a terminal
 * `Status` is a decision somebody took, so a row still naming it reports work
 * as waiting on nothing — and the ledger is what a reader consults to answer
 * "what is left". Six rows of one pack read that way while their own test files
 * said in their headers that both Change Requests were approved.
 *
 * Nothing had these two side by side. `TDDLIST_EXCEPTION_UNRESOLVED_DR` reads a
 * `DR-ID` against the design-rationale records, which is a different column and
 * a different register: a row can name an approved Change Request with its `DR`
 * cell empty and satisfy that check entirely.
 *
 * **Releasing a row is not this check's job.** `Status` and `Evidence` are
 * `/qfai-implement`'s columns under the Drift Protocol, so a row moves by a
 * stage run. What this reports is the disagreement, which is what makes the run
 * happen.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SPECS = path.join(repoRoot, ".qfai", "specs");
const DECISIONS = path.join(repoRoot, ".qfai", "decisions");

/**
 * Every `Status` that means the Change Request has been decided.
 *
 * `open` is the only value that blocks. The rest are enumerated rather than
 * derived from "not open", because a status nobody wrote down is one nobody
 * reviewed — and reading an unrecognised value as terminal would release rows
 * on a typo.
 */
const DECIDED = new Set(["approved", "rejected", "superseded", "applied", "withdrawn"]);

/**
 * The rows already naming a decided Change Request.
 *
 * A backlog, not permission. The list may only shrink: the assertion is an
 * equality, so a row released without its entry being struck fails exactly as a
 * new one does.
 */
const KNOWN_BLOCKED_BY_A_DECIDED_REQUEST: readonly string[] = [
  "spec-0017 TDD-0016 -> CR-20260818-0007 approved",
  "spec-0017 TDD-0030 -> CR-20260820-0001 approved",
  "spec-0017 TDD-0032 -> CR-20260820-0007 approved",
  "spec-0017 TDD-0033 -> CR-20260820-0007 approved",
  "spec-0017 TDD-0034 -> CR-20260820-0007 approved",
  "spec-0017 TDD-0035 -> CR-20260820-0007 approved",
];

const REQUEST_ID = /CR-\d{8}-\d{4}/g;

/** Each Change Request's `Status`, by its declared id. */
async function requestStatuses(): Promise<Map<string, string>> {
  const statuses = new Map<string, string>();
  let entries;
  try {
    entries = await readdir(DECISIONS);
  } catch {
    return statuses;
  }
  for (const name of entries) {
    if (!name.startsWith("CR-") || !name.endsWith(".md")) continue;
    const text = await readFile(path.join(DECISIONS, name), "utf-8");
    // The declared id rather than the filename: the two agree today, and a
    // record renamed without its id moving would otherwise be read as a
    // different request than the one the rows name.
    const id = /^-\s*ID:\s*`(CR-\d{8}-\d{4})`/m.exec(text)?.[1];
    const status = /^-\s*Status:\s*`([^`]*)`/m.exec(text)?.[1];
    if (id === undefined || status === undefined) continue;
    statuses.set(id, status.trim().toLowerCase());
  }
  return statuses;
}

interface BlockedRow {
  readonly pack: string;
  readonly tdd: string;
  readonly requests: readonly string[];
}

/** Every `blocked` row, with the Change Requests its cells name. */
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
      continue;
    }
    let headers: string[] | null = null;
    for (const line of text.split(/\r?\n/)) {
      if (!line.trimStart().startsWith("|")) {
        headers = null;
        continue;
      }
      const cells = line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());
      if (cells[0] === "TDD-ID") {
        headers = cells;
        continue;
      }
      if (headers === null) continue;
      const at = (name: string): string => {
        const index = headers === null ? -1 : headers.indexOf(name);
        return index < 0 ? "" : (cells[index] ?? "");
      };
      const tdd = at("TDD-ID");
      if (!/^TDD-\d{4}$/.test(tdd)) continue;
      if (at("Status").toLowerCase() !== "blocked") continue;
      // Both cells, because the pack that showed this used each: `Blocked-By`
      // is where the identifier belongs, and `Evidence` is where six of them
      // actually were.
      const named = `${at("Blocked-By")} ${at("Evidence")}`;
      rows.push({
        pack,
        tdd,
        requests: [...new Set([...named.matchAll(REQUEST_ID)].map((m) => m[0]))],
      });
    }
  }
  return rows;
}

describe("a blocked row waits on a decision nobody has taken", () => {
  it("reports every blocked row whose Change Request has been decided", async () => {
    const statuses = await requestStatuses();
    expect(statuses.size, "no change requests were read").toBeGreaterThan(0);

    const rows = await blockedRows();
    expect(rows.length, "no blocked rows were read").toBeGreaterThan(0);

    const released = rows
      .flatMap(({ pack, tdd, requests }) =>
        requests
          .map((id) => ({ id, status: statuses.get(id) }))
          .filter(({ status }) => status !== undefined && DECIDED.has(status))
          .map(({ id, status }) => `${pack} ${tdd} -> ${id} ${status ?? ""}`),
      )
      .sort();

    expect([...new Set(released)]).toEqual([...KNOWN_BLOCKED_BY_A_DECIDED_REQUEST].sort());
  });

  it("reports a blocked row naming a Change Request no record declares", async () => {
    // The other way the two can disagree, and the one the list above cannot
    // hold: an identifier with no record behind it blocks on nothing at all,
    // and reads as waiting rather than as a typo.
    const statuses = await requestStatuses();
    const rows = await blockedRows();

    const missing = rows
      .flatMap(({ pack, tdd, requests }) =>
        requests.filter((id) => !statuses.has(id)).map((id) => `${pack} ${tdd} -> ${id}`),
      )
      .sort();

    expect(missing).toEqual([]);
  });
});
