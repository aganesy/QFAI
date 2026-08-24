/**
 * The four provenance defects PR #794's review found, each with the failure it produces.
 *
 * They are one family: the record is adopter-controlled, and every one of these is a way the
 * reader or the writer trusts it further than it should. Their consequences converge too — three of
 * the four end with a workflow the adopter never removed being treated as `declined`, which means
 * `qfai init` never creates it again.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  rename,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  readInstallProvenance,
  updateInstallProvenance,
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

// ── [09] / [31] ───────────────────────────────────
describe("a symlinked .qfai does not let the record escape the tree", () => {
  it("refuses to write through it, and leaves the outside file untouched", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-esc-"));
    dirs.push(dir);
    const root = path.join(dir, "repo");
    const outside = path.join(dir, "elsewhere");
    await mkdir(root, { recursive: true });
    await mkdir(outside, { recursive: true });
    const escaped = path.join(outside, "install-provenance.json");
    await writeFile(escaped, "{}\n", "utf-8");

    try {
      await symlink(outside, path.join(root, ".qfai"), "junction");
    } catch {
      // Windows without developer mode, or a platform that refuses the link type. The guard is
      // platform-independent; the fixture is not.
      return;
    }

    // The premise: the link really does resolve, so a write through it really would land outside.
    expect(await readFile(escaped, "utf-8")).toBe("{}\n");

    await expect(
      writeInstallProvenance(root, { workflows: { "qfai-tests.yml": entryTyped() } }),
      "`O_NOFOLLOW` on the leaf and `rename` on the leaf both say nothing about the path that " +
        "reaches it",
    ).rejects.toThrow(/symlink|outside this tree/i);

    expect(await readFile(escaped, "utf-8"), "the outside file must be exactly as it was").toBe(
      "{}\n",
    );

    // And the read direction: ownership markers must not be imported from over there either.
    await writeFile(escaped, JSON.stringify({ workflows: { "qfai-tests.yml": entry() } }), "utf-8");
    expect(Object.keys((await readInstallProvenance(root)).workflows)).toEqual([]);
  });

  it("still writes when .qfai is a real directory", async () => {
    // The other direction, so the check is an ancestor test and not a refusal to write.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: { "qfai-tests.yml": entryTyped() } });
    expect(Object.keys((await readInstallProvenance(root)).workflows)).toEqual(["qfai-tests.yml"]);
  });
});

// ── [23] ─────────────────────────────────────────
describe("an abandoned lock is reclaimed without deleting a live one", () => {
  it("lets many writers through a stale lock with no entry lost", async () => {
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });

    // A lock left behind by a run that died holding it, dated well past the staleness ceiling.
    const lockPath = path.join(root, ".qfai", ".install-provenance.lock");
    await writeFile(lockPath, "a-run-that-died", "utf-8");
    const longAgo = new Date(Date.now() - 60_000);
    await utimes(lockPath, longAgo, longAgo);

    // Six writers observe that same stale lock at the same moment. Reclaiming it by `unlink`
    // meant the second one deleted the first one's FRESH lock and both entered the section; the
    // symptom is an entry that is simply not in the record afterwards.
    const names = ["a", "b", "c", "d", "e", "f"].map((n) => `qfai-${n}.yml`);
    await Promise.all(
      names.map((name) =>
        updateInstallProvenance(root, (current) => ({
          ...current,
          workflows: { ...current.workflows, [name]: entryTyped() },
        })),
      ),
    );

    expect(
      Object.keys((await readInstallProvenance(root)).workflows).sort(),
      "every writer's entry must survive; a lost one leaves its file unrecordable forever",
    ).toEqual([...names].sort());
  });

  it("writes through a transient rename denial rather than failing the run", async () => {
    // Measured on this platform: a `rename` onto a destination another handle has open fails
    // with `EPERM`. It is neither a permission problem nor permanent — anything can hold that
    // handle for a moment, another writer mid-rename, a scanner, the indexer — and treating it
    // as fatal is what made `writeInstallProvenance` throw under load while the rest of the
    // suite passed. The atomicity is unaffected either way: the rename happened or it did not.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: { "qfai-first.yml": entryTyped() } });

    // The premise, asserted rather than assumed: with the handle open, a rename onto the record
    // really is denied on this platform. Without this the row would pass wherever it is not.
    const held = await open(recordPath(root), "r");
    let denied = false;
    try {
      const probe = path.join(root, ".qfai", "probe.tmp");
      await writeFile(probe, "{}", "utf-8");
      await rename(probe, recordPath(root)).catch((error: unknown) => {
        denied =
          typeof error === "object" && error !== null && Reflect.get(error, "code") === "EPERM";
      });
    } catch {
      // fall through: `denied` stays false and the row skips below
    }
    if (!denied) {
      await held.close();
      return; // a platform that permits it has nothing to retry
    }

    // Now the real thing, with the handle released while the write is retrying.
    const releasing = new Promise<void>((resolve) => {
      setTimeout(() => {
        void held.close().then(() => {
          resolve();
        });
      }, 200);
    });
    const updating = updateInstallProvenance(root, (current) => ({
      ...current,
      workflows: { ...current.workflows, "qfai-second.yml": entryTyped() },
    }));

    await Promise.all([releasing, updating]);
    expect(
      Object.keys((await readInstallProvenance(root)).workflows).sort(),
      "a denial that passes must not lose the write",
    ).toEqual(["qfai-first.yml", "qfai-second.yml"]);
  }, 60_000);

  it("keeps every entry under heavy concurrency", async () => {
    // The six-writer row above passed on an idle machine and FAILED inside the whole-suite run,
    // with `EPERM: rename` out of `writeInstallProvenance`. Two repairs came from that: the
    // reclaim is now winnable by exactly one writer (a second `wx` lock, because replacement plus
    // a read-back can be overtaken after the read-back), and the write verifies it survived and
    // re-applies if it did not.
    //
    // What this row is, honestly: a LOAD row, not a reproduction. Measured — with either repair
    // reverted it still passes here, because on an idle machine the lock alone serializes twenty
    // writers and the loop never has to fire. The failure needs a starved event loop, which is
    // what the whole-suite run supplies and what no in-process plant can. Its value is that it
    // runs INSIDE that suite, where the original defect was found; the row above is the
    // deterministic half.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });

    const lockPath = path.join(root, ".qfai", ".install-provenance.lock");
    await writeFile(lockPath, "a-run-that-died", "utf-8");
    const longAgo = new Date(Date.now() - 60_000);
    await utimes(lockPath, longAgo, longAgo);

    const names = Array.from({ length: 20 }, (_, index) => `qfai-w${String(index)}.yml`);
    await Promise.all(
      names.map((name) =>
        updateInstallProvenance(root, (current) => ({
          ...current,
          workflows: { ...current.workflows, [name]: entryTyped() },
        })),
      ),
    );

    expect(
      Object.keys((await readInstallProvenance(root)).workflows).sort(),
      "every writer's entry must survive; a lost one leaves its file unrecordable forever",
    ).toEqual([...names].sort());

    // And no lock is left behind for the next run to wait out.
    expect(await readFile(lockPath, "utf-8").catch(() => undefined)).toBeUndefined();
  }, 60_000);

  it("does not release a lock it no longer owns", async () => {
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    const lockPath = path.join(root, ".qfai", ".install-provenance.lock");

    // Overwritten from INSIDE the mutator, which is the only moment this writer holds the lock.
    // That models the state after another process reclaimed it: the file is still there, the token
    // in it is somebody else's, and an unconditional `unlink` on the way out would delete a lock
    // that writer is relying on — putting two of them in the section at once, which is the lost
    // update the lock exists to prevent.
    await updateInstallProvenance(root, (current) => {
      writeFileSync(lockPath, "someone-else", "utf-8");
      return current;
    });

    expect(
      readFileSync(lockPath, "utf-8"),
      "release must read the token first and remove only its own lock",
    ).toBe("someone-else");
  });

  // Two plants for this family stayed green, and both are measurements rather than gaps:
  //
  // - Reclaiming by `unlink` instead of by atomic replacement cannot be reproduced in-process. The
  //   damage needs one writer's `unlink` to land AFTER another's successful `wx`, and inside a
  //   single event loop every concurrent writer's `stat` resolves before any of their `unlink`s
  //   run, so they funnel through `wx` and stay exclusive. The defect is real between OS
  //   processes; the reproduction is not available here, and saying so is better than a row that
  //   passes either way.
  // - In `ancestorsAreRealDirectories`, `!inspected.isDirectory()` already refuses every link on
  //   its own: `lstat` describes the LINK, so it reports `isDirectory()` false for a symlink and
  //   for a Windows junction alike (measured). The `isSymbolicLink()` arm beside it names the
  //   intent rather than adding a second guard.
});

// ── [28] ───────────────────────────────────────────────────────────────────────────
describe("the calendar check reads the offset the timestamp declares", () => {
  it("keeps an offset timestamp whose UTC instant falls on the previous day", async () => {
    const root = await tempRoot();
    // 2020-01-01 in +05:00 is 2019-12-31T19:00Z. Comparing the written fields against the UTC
    // instant rejected this, and the [16] repair is what introduced that: an ordinary ISO 8601
    // instant lost its entry, and the workflow it named read as `adopter-owned` from then on.
    await writeRaw(root, {
      workflows: {
        "qfai-tests.yml": entry({ installedAt: "2020-01-01T00:00:00+05:00" }),
        "qfai-validate.yml": entry({ installedAt: "2020-12-31T23:00:00-08:00" }),
      },
    });

    expect(
      Object.keys((await readInstallProvenance(root)).workflows).sort(),
      "the pattern admits an offset, so the calendar check has to speak the same language",
    ).toEqual(["qfai-tests.yml", "qfai-validate.yml"]);
  });

  it("still drops an impossible date written with an offset", async () => {
    // The other direction, so the shift is a frame change and not a way out of the check.
    const root = await tempRoot();
    await writeRaw(root, {
      workflows: { "qfai-tests.yml": entry({ installedAt: "2021-02-30T00:00:00+09:00" }) },
    });
    expect(Object.keys((await readInstallProvenance(root)).workflows)).toEqual([]);
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
