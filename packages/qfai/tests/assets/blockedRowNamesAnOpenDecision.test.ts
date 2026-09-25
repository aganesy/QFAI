/**
 * A ledger row held at `blocked` names a Change Request still open.
 *
 * `blocked` says the row waits on a decision. A settled Change Request is a
 * decision somebody took, so a row still naming it reports work as waiting on
 * nothing — and the ledger is what a reader consults to answer
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

import {
  type ChangeRequestHeader,
  isChangeRequestSettled,
  parseChangeRequestHeader,
} from "../../src/core/decisionRecords.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SPECS = path.join(repoRoot, ".qfai", "specs");
const DECISIONS = path.join(repoRoot, ".qfai", "decisions");

/**
 * The rows already naming a decided Change Request.
 *
 * A backlog, not permission. The list may only shrink: the assertion is an
 * equality, so a row released without its entry being struck fails exactly as a
 * new one does.
 */
const KNOWN_BLOCKED_BY_A_DECIDED_REQUEST: readonly string[] = [];

const REQUEST_ID = /CR-\d{8}-\d{4}/g;

/**
 * Each Change Request's parsed header, by its declared id.
 *
 * Whether a request is decided is the validator's own predicate: a status
 * outside the template's vocabulary is not read as settled, and neither is an
 * `approved` request whose `Applied at` is still empty.
 */
async function requestStatuses(): Promise<Map<string, ChangeRequestHeader>> {
  const statuses = new Map<string, ChangeRequestHeader>();
  let entries;
  try {
    entries = await readdir(DECISIONS);
  } catch {
    return statuses;
  }
  for (const name of entries) {
    if (!name.startsWith("CR-") || !name.endsWith(".md")) continue;
    const header = parseChangeRequestHeader(await readFile(path.join(DECISIONS, name), "utf-8"));
    // The declared id rather than the filename: the two agree today, and a
    // record renamed without its id moving would otherwise be read as a
    // different request than the one the rows name.
    if (header.id !== null) statuses.set(header.id, header);
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

    // No ledger holds a blocked row today, so an empty read is the right one.
    const rows = await blockedRows();

    const released = rows
      .flatMap(({ pack, tdd, requests }) =>
        requests
          .map((id) => ({ id, header: statuses.get(id) }))
          .filter(({ header }) => header !== undefined && isChangeRequestSettled(header))
          .map(({ id, header }) => `${pack} ${tdd} -> ${id} ${header?.status ?? ""}`),
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
