/**
 * The four provenance defects PR #794's review found, each with the failure it produces.
 *
 * They are one family: the record is adopter-controlled, and every one of these is a way the
 * reader or the writer trusts it further than it should. Their consequences converge too — three of
 * the four end with a workflow the adopter never removed being treated as `declined`, which means
 * `qfai init` never creates it again.
 */

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  readInstallProvenance,
  writeInstallProvenance,
  type InstallProvenanceRecord,
} from "../../../src/shared/provenance.js";

const dirs: string[] = [];

async function tempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-prov-"));
  dirs.push(dir);
  await mkdir(path.join(dir, ".qfai"), { recursive: true });
  return dir;
}

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

const recordPath = (root: string): string => path.join(root, ".qfai", "install-provenance.json");

function entry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sha256: createHash("sha256").update("x").digest("hex"),
    installedByVersion: "1.0.0",
    installedAt: "2026-01-02T03:04:05.000Z",
    ...overrides,
  };
}

async function writeRaw(root: string, value: unknown): Promise<void> {
  await writeFile(recordPath(root), `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

// ── [09] ─────────────────────────────────────────────────────────────────────
describe("an unknown namespace named __proto__ survives a read/write round trip", () => {
  it("keeps it as data rather than dropping it into the prototype", async () => {
    const root = await tempRoot();
    // Written as TEXT, not as an object literal: `__proto__:` in a literal sets the prototype and
    // creates no key at all — the same trap the production defect was, reproduced in the fixture on
    // the first attempt, which is why this is spelled out rather than built.
    const raw = JSON.stringify({ workflows: { "qfai-tests.yml": entry() } });
    const withProto =
      raw.slice(0, -1) +
      ',"__proto__":{"owner":"a-later-version"},"normalNamespace":{"keep":true}}';
    await writeFile(recordPath(root), withProto + "\n", "utf-8");

    const read = await readInstallProvenance(root);
    expect(
      Object.keys(read.otherNamespaces ?? {}).sort(),
      "both unknown namespaces must be present, including the one named after a prototype",
    ).toEqual(["__proto__", "normalNamespace"]);

    // Non-vacuity, and the half that catches a prototype write rather than a missing key: the value
    // must be an OWN property of the map, not something reached through its prototype chain.
    expect(
      Object.prototype.hasOwnProperty.call(read.otherNamespaces ?? {}, "__proto__"),
      "the namespace must be an own property; reaching it through the prototype is the defect",
    ).toBe(true);

    await writeInstallProvenance(root, read);
    const roundTripped: unknown = JSON.parse(await readFile(recordPath(root), "utf-8"));
    expect(
      JSON.stringify(roundTripped).includes("a-later-version"),
      "the older version must not delete the newer one's ownership data",
    ).toBe(true);
  });
});

// ── [13] ─────────────────────────────────────────────────────────────────────
describe("the writer respects the ceiling its own reader enforces", () => {
  it("refuses a record whose pretty-printed form would read back as empty", async () => {
    const root = await tempRoot();
    // Well under the 1 MiB ceiling compactly; past it once indented two spaces per element.
    const record: InstallProvenanceRecord = {
      workflows: {},
      otherNamespaces: { bulky: { values: Array.from({ length: 150_000 }, () => 0) } },
    };

    await expect(
      writeInstallProvenance(root, record),
      "a write that would read back as an empty record loses every ownership and declined marker",
    ).rejects.toThrow(/ceiling/i);

    // And it left nothing behind: the previous state is what a caller can still recover from.
    await expect(readFile(recordPath(root), "utf-8")).rejects.toThrow();
  });

  it("still writes a record that fits", async () => {
    // The other direction, so the guard is a ceiling and not a refusal to write.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: { "qfai-tests.yml": entryTyped() } });
    const read = await readInstallProvenance(root);
    expect(Object.keys(read.workflows)).toEqual(["qfai-tests.yml"]);
  });
});

function entryTyped(): { sha256: string; installedByVersion: string; installedAt: string } {
  return {
    sha256: createHash("sha256").update("x").digest("hex"),
    installedByVersion: "1.0.0",
    installedAt: "2026-01-02T03:04:05.000Z",
  };
}

// ── [16] ─────────────────────────────────────────────────────────────────────
describe("a timestamp naming a date that does not exist is not a timestamp", () => {
  it("drops an entry dated 31 February, which Date.parse silently moves to March", async () => {
    const root = await tempRoot();
    await writeRaw(root, {
      workflows: {
        "qfai-tests.yml": entry({ installedAt: "2020-02-31T00:00:00Z" }),
        "qfai-validate.yml": entry(),
      },
    });

    // The premise, asserted rather than assumed: this is not a NaN parse, which is why the regex
    // plus `Date.parse` accepted it.
    expect(Number.isNaN(Date.parse("2020-02-31T00:00:00Z"))).toBe(false);

    const read = await readInstallProvenance(root);
    expect(
      Object.keys(read.workflows),
      "an entry whose date is not on the calendar must be dropped; kept, it reads as `declined` and " +
        "the workflow is never created again",
    ).toEqual(["qfai-validate.yml"]);
  });

  it("keeps a real leap day, so the check is a calendar and not a month-length table", async () => {
    const root = await tempRoot();
    await writeRaw(root, {
      workflows: { "qfai-tests.yml": entry({ installedAt: "2020-02-29T00:00:00Z" }) },
    });
    expect(Object.keys((await readInstallProvenance(root)).workflows)).toEqual(["qfai-tests.yml"]);
  });
});

// ── [23] ─────────────────────────────────────────────────────────────────────
describe("a symlinked record is refused on every platform", () => {
  it("reads the empty record rather than following the link", async () => {
    const root = await tempRoot();
    const outside = path.join(root, "outside.json");
    await writeFile(
      outside,
      `${JSON.stringify({ workflows: { "qfai-tests.yml": entry() } })}\n`,
      "utf-8",
    );
    try {
      await symlink(outside, recordPath(root));
    } catch {
      // Windows without developer mode refuses symlink creation for an unprivileged process. The
      // guard is platform-independent; the FIXTURE is not, so the row skips rather than passing
      // for a reason that has nothing to do with the code.
      return;
    }

    // The premise: the link resolves to a readable record. Without this the assertion below holds
    // whenever the fixture failed to write anything.
    expect(JSON.parse(await readFile(outside, "utf-8"))).toHaveProperty("workflows");

    const read = await readInstallProvenance(root);
    expect(
      Object.keys(read.workflows),
      "a record reached through a symlink is a record outside the repository; its entries would " +
        "make uncreated workflows look declined",
    ).toEqual([]);
  });
});
