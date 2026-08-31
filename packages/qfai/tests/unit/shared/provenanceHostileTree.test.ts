/**
 * The four provenance defects PR #794's review found, each with the failure it produces.
 *
 * They are one family: the record is adopter-controlled, and every one of these is a way the
 * reader or the writer trusts it further than it should. Their consequences converge too — three of
 * the four end with a workflow the adopter never removed being treated as `declined`, which means
 * `qfai init` never creates it again.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import {
  mkdir,
  mkdtemp,
  open,
  readdir,
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

/**
 * The lock, as the writer now shapes it: a directory whose entry NAMES its holder.
 *
 * Review finding [39]. While the lock was a file whose CONTENTS named its holder, both the
 * reclaim and the release identified it by path — read the token, then unlink the name — and a
 * holder stalled past the staleness ceiling deleted whatever had since been published under
 * that name. Naming the holder in the directory ENTRY makes both removals exact: `unlink` names
 * one specific holder, and `rmdir` refuses a directory holding anybody else's marker.
 */
const lockDir = (root: string): string => path.join(root, ".qfai", ".install-provenance.lock.d");

/** Plants a lock held by `holder`, aged `ageMs` into the past. */
async function plantLock(root: string, holder: string, ageMs: number): Promise<string> {
  const dir = lockDir(root);
  await mkdir(dir, { recursive: true });
  const markerPath = path.join(dir, holder);
  await writeFile(markerPath, "", "utf-8");
  const at = new Date(Date.now() - ageMs);
  await utimes(markerPath, at, at);
  return markerPath;
}

/** The holders named in the lock right now, or `undefined` when there is no lock. */
async function lockHolders(root: string): Promise<string[] | undefined> {
  return await readdir(lockDir(root)).catch(() => undefined);
}

/** The provenance module's own source, which several rows below assert on directly. */
async function provenanceSource(): Promise<string> {
  return await readFile(path.resolve(__dirname, "../../../src/shared/provenance.ts"), "utf-8");
}

/**
 * A numeric constant the provenance module declares, read from its source.
 *
 * Read rather than restated so a row and the constant it reasons about cannot drift apart, and
 * throwing rather than answering `NaN` when the declaration is gone: a renamed constant is a
 * broken row, not a failing claim, and `NaN` comparisons pass silently in one direction.
 */
async function lockConstant(name: string): Promise<number> {
  const declared = new RegExp(`const ${name} = ([0-9_]+);`).exec(await provenanceSource())?.[1];
  if (declared === undefined) {
    throw new Error(`provenance.ts declares no ${name}`);
  }
  return Number(declared.replace(/_/g, ""));
}

/**
 * The body of a top-level function in the provenance module, with comment lines removed.
 *
 * Comments are stripped because what these rows measure is CODE — its order, and which calls
 * appear in which function. A sibling row already reddened once on the very paragraph that
 * explained the thing it was asserting, which is how the stripping got here.
 */
function functionBody(source: string, declaration: string): string {
  const start = source.indexOf(declaration);
  if (start < 0) {
    throw new Error(`provenance.ts declares no ${declaration}`);
  }
  return source
    .slice(start, source.indexOf("\n}\n", start) + 3)
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
    .join("\n");
}

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

// ── [66] ─────────────────────────────────────────────────────
describe("a workflows map has no prototype for a record to replace", () => {
  it("keeps a __proto__ entry as data instead of assigning it to the prototype", async () => {
    // Review finding [66] filed a chain one step longer than what reproduces, and the difference
    // is worth writing down: it said a `__proto__` value carrying an extra `qfai-tests.yml` key
    // would make that shipped name resolve through the prototype, classifying a first `init` as
    // `declined` forever. Measured — `toWorkflowEntry` returns a FRESH three-field object, so what
    // would become the prototype carries no extra key and `workflows["qfai-tests.yml"]` stays
    // undefined. That half does not happen.
    //
    // What DOES happen is the mechanism the finding names: `workflows["__proto__"] = entry`
    // creates no own property at all. The entry is silently dropped from the record — a namespace
    // that does not survive a round trip, which this file already requires of every other one —
    // and `workflows.sha256` then answers a string for a name no record holds. Both are worth
    // closing, and `Object.create(null)` plus `defineProperty` closes them together.
    const root = await tempRoot();
    // TEXT, not an object literal: `__proto__:` in a literal sets the prototype rather than
    // creating a key, so a literal would plant something other than what a record carries.
    // `JSON.parse` makes it an own property, which is what reaches the reader.
    const value = JSON.stringify(entry());
    await writeFile(recordPath(root), `{"workflows":{"__proto__":${value}}}\n`, "utf-8");

    const record = await readInstallProvenance(root);
    expect(
      Object.keys(record.workflows),
      "an entry named __proto__ is data like any other; assigned, it vanishes from the record",
    ).toEqual(["__proto__"]);
    expect(
      record.workflows["sha256"],
      "and no field of it may answer for a name the record does not hold",
    ).toBeUndefined();
  });

  it("keeps an ordinary entry, so the map is a map and not a refusal", async () => {
    const root = await tempRoot();
    await writeRaw(root, { workflows: { "qfai-tests.yml": entry() } });
    expect(
      Object.keys((await readInstallProvenance(root)).workflows),
      "an ordinary record must still read",
    ).toEqual(["qfai-tests.yml"]);
  });
});

// ── [67] ─────────────────────────────────────────────────────
describe("a marker dated in the future is not the freshest possible holder", () => {
  it("reclaims a lock whose marker is far ahead of this process's clock", async () => {
    // A clock rolled back, restored filesystem metadata, or a hostile tree gives the marker an
    // mtime in the future, and `Date.now() - mtimeMs` is then NEGATIVE — which satisfies
    // `age <= LOCK_STALE_MS` until the wall clock catches up. A lock with no process behind it was
    // never reclaimed, and every `qfai init` waited out its whole patience and failed with
    // `another process is writing`.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    await plantLock(root, "a-marker-from-the-future", -3_600_000);

    await updateInstallProvenance(root, (current) => ({
      ...current,
      workflows: { ...current.workflows, "qfai-after.yml": entryTyped() },
    }));

    expect(
      Object.keys((await readInstallProvenance(root)).workflows),
      "a marker no live holder could have written must not hold the lock until the clock agrees",
    ).toEqual(["qfai-after.yml"]);
  }, 120_000);

  it("still waits out a marker only marginally ahead, which is ordinary clock skew", async () => {
    // The other direction, and the reason the tolerance exists: a filesystem a second or two ahead
    // of this process is normal, and treating that as corrupt would evict live holders.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    const marker = await plantLock(root, "a-holder-just-ahead", -1_000);
    const stillGoing = setInterval(() => {
      const ahead = new Date(Date.now() + 1_000);
      try {
        utimesSync(marker, ahead, ahead);
      } catch {
        // the row is finishing and the tree is going away
      }
    }, 250);

    try {
      await expect(
        updateInstallProvenance(root, (current) => current),
        "a holder whose clock is marginally ahead is still a holder",
      ).rejects.toThrow(/another process is writing the record/i);
    } finally {
      clearInterval(stillGoing);
    }
  }, 120_000);
});

// ── [31] ─────────────────────────────────────────────────────
describe("a version made of spaces is not a version", () => {
  it("drops an entry whose installedByVersion is whitespace only", async () => {
    const root = await tempRoot();
    await writeRaw(root, {
      workflows: {
        "qfai-tests.yml": entry({ installedByVersion: "   " }),
        "qfai-validate.yml": entry(),
      },
    });

    // The premise, asserted rather than assumed: the field IS a string and it IS non-empty,
    // which is exactly why `length === 0` let it through.
    expect(typeof "   ").toBe("string");
    expect("   ".length).toBeGreaterThan(0);

    const read = await readInstallProvenance(root);
    expect(
      Object.keys(read.workflows),
      "an entry naming no version must be dropped; kept, a name whose file is absent reads as " +
        "`declined` and the workflow is never created again",
    ).toEqual(["qfai-validate.yml"]);
  });

  it("keeps a version with incidental surrounding whitespace, so the check is emptiness and not shape", async () => {
    // The other direction. A record hand-edited to `" 1.0.0 "` still NAMES a version, and
    // dropping it would resurrect the same permanent-`declined` loss from the other side.
    const root = await tempRoot();
    await writeRaw(root, {
      workflows: { "qfai-tests.yml": entry({ installedByVersion: " 1.0.0 " }) },
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
    await plantLock(root, "a-run-that-died", 60_000);

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

    await plantLock(root, "a-run-that-died", 60_000);

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
    expect(await lockHolders(root)).toBeUndefined();
  }, 60_000);

  it("does not release a lock it no longer owns", async () => {
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });

    // Replaced from INSIDE the mutator, which is the only moment this writer holds the lock. That
    // models the state after another process reclaimed it and published its own: this writer's
    // marker is gone and somebody else's is there. Review finding [39] measured what the old
    // release did about it — nothing: it read the token, found its own, and unlinked the PATH,
    // which by then named the other writer's lock. Two of them were then in the section at once,
    // which is the lost update the lock exists to prevent.
    //
    // Reproducing it needs the replacement to happen while the lock is held, and the mutator is
    // the one callback that runs there. Sync fs, because the mutator must not do async I/O.
    await updateInstallProvenance(root, (current) => {
      const dir = lockDir(root);
      for (const held of readdirSync(dir)) rmSync(path.join(dir, held));
      writeFileSync(path.join(dir, "someone-else"), "", "utf-8");
      return current;
    });

    expect(
      await lockHolders(root),
      "release must remove only its own marker, and must not remove a directory holding another " +
        "writer's",
    ).toEqual(["someone-else"]);
  });

  it("removes its own lock when it is still the holder, so the release is not a refusal", async () => {
    // The other direction. Without it every assertion above holds for a release that never
    // removes anything — and a lock nothing releases makes the next writer wait out the whole
    // staleness ceiling before it can reclaim.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    await updateInstallProvenance(root, (current) => current);
    expect(await lockHolders(root), "the lock must be gone after an uncontended write").toBe(
      undefined,
    );
  });

  it("waits out a LIVE lock and then refuses, leaving no staging directory", async () => {
    // Three properties in one row, because one fixture establishes all three and none has
    // another deterministic reproduction. The fixture costs a full `LOCK_PATIENCE_MS` to build,
    // which is the other reason not to spend it three times.
    //
    // 1. The staleness ceiling is CONSULTED. A lock whose marker is fresh belongs to a holder
    //    that may still be inside the section, and taking it would put two writers there. With
    //    the ceiling check removed this row's writer reclaims the live lock immediately and the
    //    call succeeds — measured, and the reason this row is phrased as a refusal.
    // 2. The unpublished staging directory is cleaned up. A `rename` that SUCCEEDS consumes it,
    //    so every row where the writer gets the lock passes whether or not anything cleans up;
    //    the exhaustion path is the only one that leaves one behind. Measured: with the cleanup
    //    removed, every other row here stayed green.
    //
    // The marker is KEPT FRESH while the writer waits, and that is the whole fixture rather than
    // a detail. Giving up takes `LOCK_PATIENCE_MS`, which OUTLIVES the staleness ceiling on
    // purpose — a waiter that gave up first could never reach the reclaim it was waiting for. So
    // a marker left alone would be judged abandoned partway through this row, the writer would
    // take the lock and the row would fail. A holder that is still going is precisely one whose
    // marker keeps moving; without that the row asserts nothing about a LIVE lock at all.
    //
    // The elapsed time is asserted too, and that is the half a duration buys. As an iteration
    // count the wait was `attempts * (poll + whatever each attempt cost)`, so a slower attempt
    // bought more patience than the constants declared and nothing said so; against a deadline
    // the cost of an attempt can only make the last poll late.
    //
    // The refresh here stands for ANOTHER PROCESS, which is what a lock is for and what no
    // in-process fixture can supply. Review finding [46] read it the other way round and was
    // right to: the production holder had no heartbeat at all, so a writer whose own section ran
    // past the ceiling was reclaimed while it was still inside it. That is now `acquireRecordLock`'s
    // own interval, and the row below is what says so.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    const marker = await plantLock(root, "a-writer-that-is-still-going", 0);
    const stillGoing = setInterval(() => {
      const now = new Date();
      try {
        utimesSync(marker, now, now);
      } catch {
        // the row is finishing and the tree is going away
      }
    }, 250);

    const patience = await lockConstant("LOCK_PATIENCE_MS");
    const startedAt = Date.now();
    try {
      await expect(
        updateInstallProvenance(root, (current) => ({
          ...current,
          workflows: { ...current.workflows, "qfai-blocked.yml": entryTyped() },
        })),
        "a live lock must be waited out and then refused, never taken",
      ).rejects.toThrow(/another process is writing the record/i);
      const waited = Date.now() - startedAt;

      // 3. The patience is a DURATION, and this is where that is observable. Both bounds matter:
      //    below `LOCK_PATIENCE_MS` the writer gave up before the ceiling it must outlive, and
      //    far above it the budget is being spent in some other unit than time — which is what an
      //    iteration count did, buying more patience than the constants declared whenever an
      //    attempt got slower. One poll of slack for the attempt in flight when the deadline
      //    passes, and generous headroom above that so a loaded machine is not itself the claim.
      expect(
        waited,
        "a waiter must not give up before its declared patience",
      ).toBeGreaterThanOrEqual(patience);
      expect(
        waited,
        "and must not spend a budget denominated in attempts rather than in time",
      ).toBeLessThan(patience * 2);

      expect(
        await lockHolders(root),
        "and the live holder's lock must still be exactly as it was",
      ).toEqual(["a-writer-that-is-still-going"]);

      expect(
        (await readdir(path.join(root, ".qfai"))).filter((name) => name.includes("staging")),
        "the staging directory of a write that never published must not be left behind",
      ).toEqual([]);
    } finally {
      clearInterval(stillGoing);
    }
  }, 60_000);

  it("renews its marker while it holds the lock, on an interval under the ceiling", async () => {
    // Review finding [46]. The marker was stamped once, at acquisition, so a writer whose
    // read-modify-write ran longer than the staleness ceiling — a slow disk, a suspended process, a
    // loaded machine — was judged abandoned and reclaimed while it was still inside the section.
    // Two writers in there at once is the lost update this primitive exists to prevent, and it is
    // not self-healing: the file stays on disk with no entry, reads as `adopter-owned`, and is
    // never recorded again.
    //
    // Asserted on the SOURCE, and the reason is worth stating rather than hiding. The heartbeat
    // fires on a timer, and the only seam inside the lock is `mutate`, which is synchronous by
    // contract — a mutator that waits long enough for the timer also blocks the loop the timer runs
    // on, and one that returns immediately releases the lock (and unlinks the marker) before any
    // renewal could be observed. So there is no in-process interleaving that reaches it. This
    // repository already pins a handful of properties this way, and saying which instrument was
    // used beats a behavioural row that passes either way.
    const source = await readFile(
      path.resolve(__dirname, "../../../src/shared/provenance.ts"),
      "utf-8",
    );
    const acquire = source.slice(source.indexOf("async function acquireRecordLock("));
    const body = acquire.slice(0, acquire.indexOf("\n}\n") + 3);
    expect(body, "the lock primitive must exist to be checked").not.toBe("");

    expect(body, "the holder must renew its own marker while it holds the lock").toMatch(
      /setInterval\([\s\S]*utimes\(/,
    );
    expect(
      body,
      "and stop renewing when it releases, or a released lock keeps looking alive",
    ).toMatch(/clearInterval\(/);

    // The interval has to be strictly under the ceiling, and by enough that losing one renewal is
    // not enough to be reclaimed. Read from the constants rather than restated, so the two cannot
    // drift apart in a later edit.
    const stale = Number(/const LOCK_STALE_MS = ([0-9_]+);/.exec(source)?.[1]?.replace(/_/g, ""));
    const beat = Number(
      /const LOCK_HEARTBEAT_MS = ([0-9_]+);/.exec(source)?.[1]?.replace(/_/g, ""),
    );
    expect(Number.isFinite(stale) && Number.isFinite(beat), "both constants must be readable").toBe(
      true,
    );
    expect(
      beat * 2,
      "a holder must get at least two renewals inside the ceiling, so losing one is survivable",
    ).toBeLessThan(stale);
  });

  it("removes only what it moved aside, never a path under the lock name", async () => {
    // Review finding [62], the fourth on this function and the first that could not be answered by
    // checking harder: `lstat` the directory, compare `dev`/`ino`, `lstat` each marker — and the
    // `unlink` still resolved `lockDir/<marker>` through a parent a concurrent process could replace
    // one syscall earlier, landing the removal on an external file of the same name. Every version
    // of that repair was an identity check followed by a pathname operation.
    //
    // The repair is structural: the lock is RENAMED to a name nothing else holds and only the moved
    // object is examined and removed. Asserted on the SOURCE because the interleaving it closes is
    // between two processes — the acquisition path refuses a linked lock name outright (the row
    // above), so no in-process caller can reach this function with a link in place, and that is the
    // defence-in-depth ordering rather than a gap.
    const source = await readFile(
      path.resolve(__dirname, "../../../src/shared/provenance.ts"),
      "utf-8",
    );
    const start = source.indexOf("async function clearAbandonedLock(");
    expect(start, "the reclaim must exist to be checked").toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("\n}\n", start) + 3);

    // It moves first.
    expect(body, "the reclaim must take the lock aside before it examines it").toMatch(
      /await rename\(lockDir, quarantine\)/,
    );

    // …and every destructive call names the moved object. A `rm`, `rmdir` or `unlink` reaching for
    // `lockDir` is the pathname operation the move exists to remove.
    const code = body
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    const destructive = [...code.matchAll(/\b(?:rm|rmdir|unlink)\(([^)]*)\)/g)].map(
      (match) => match[1] ?? "",
    );
    expect(
      destructive.length,
      "the reclaim must still remove something, or this row passes over a no-op",
    ).toBeGreaterThan(0);
    expect(
      destructive.filter((args) => args.includes("lockDir")),
      "a removal aimed at the lock NAME is the operation the move removes",
    ).toEqual([]);
  });
  it("still reclaims a lock whose holder is gone, so the heartbeat is not a way to wedge one", async () => {
    // The other direction, and the one that stops the repair from being a regression: a heartbeat
    // lives in the holder's process, so a crashed holder renews nothing and its lock is reclaimed
    // exactly as before. Without this row, "never reclaim a lock" would satisfy the row above.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    await plantLock(root, "a-run-that-died", 60_000);

    await updateInstallProvenance(root, (current) => ({
      ...current,
      workflows: { ...current.workflows, "qfai-after.yml": entryTyped() },
    }));

    expect(
      Object.keys((await readInstallProvenance(root)).workflows),
      "a lock with no process behind it must not outlive its holder",
    ).toEqual(["qfai-after.yml"]);
    expect(await lockHolders(root)).toBeUndefined();
  });

  it("reclaims a lock left by a run that died moments ago, within one run", async () => {
    // The waiter's whole patience must exceed the staleness ceiling, or the reclaim path is
    // unreachable from inside a single run: 200 polls of 25ms is five seconds against a ten-second
    // ceiling, so a lock left by a run killed less than five seconds earlier could never be judged
    // abandoned before the waiter gave up. `qfai init` then threw, and its rollback DELETED the
    // workflows it had just copied — over a holder that no longer existed.
    //
    // Planted at age zero with NOTHING refreshing it, which is exactly what a killed process
    // leaves: no heartbeat, because there is no process. The sibling row above plants the same age
    // and DOES refresh it, and must still be refused; the two together are the difference between
    // a holder that is gone and one that is working.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    await plantLock(root, "a-run-that-was-killed", 0);

    await updateInstallProvenance(root, (current) => ({
      ...current,
      workflows: { ...current.workflows, "qfai-after.yml": entryTyped() },
    }));

    expect(
      Object.keys((await readInstallProvenance(root)).workflows),
      "a run must outlast the ceiling it waits for, or it can never reclaim inside one run",
    ).toEqual(["qfai-after.yml"]);
  }, 120_000);

  it("stamps the marker when the lock is published, not when the attempt began", async () => {
    // The marker is created once, in the private staging directory, before the wait — and renaming
    // a directory does not touch the mtime of a file inside it. Without a stamp at publication the
    // lock enters the world carrying the age of the WAIT: a writer that waited past the ceiling
    // published a lock that was already reclaimable, and the heartbeat could not have helped,
    // because until the rename there is no `lockDir/<marker>` for it to touch.
    //
    // Asserted on the source for the reason the heartbeat row gives: the only seam inside the lock
    // is `mutate`, which is synchronous, so no in-process interleaving observes the marker between
    // the rename and the release.
    const source = await provenanceSource();

    // The stamp lives in the step that runs only once a rename has SUCCEEDED, and the waiting
    // step carries none of it. That placement is the claim: a stamp reachable from inside the
    // wait would date a lock that does not exist yet.
    expect(
      functionBody(source, "async function confirmPublishedLock("),
      "the step that runs after a successful publish must stamp the marker it published",
    ).toMatch(/await utimes\(path\.join\(lockDir, marker\)/);
    expect(
      functionBody(source, "async function publishLock("),
      "and the step that is still waiting must not stamp anything: there is no lock to date yet",
    ).not.toMatch(/utimes\(/);

    // And the patience, read from the constants rather than restated.
    //
    // ONE comparison now, where it used to be `attempts * poll` against the ceiling. That product
    // was only the real wait at the nominal sleep, so it had to be restated whenever either half
    // moved — and it was wrong twice, once in each direction. A duration compares directly.
    const patience = await lockConstant("LOCK_PATIENCE_MS");
    const stale = await lockConstant("LOCK_STALE_MS");
    expect(
      patience,
      "a waiter that gives up before the ceiling can never reach the reclaim it is waiting for",
    ).toBeGreaterThan(stale);

    // …and the confirmation window is not a second helping of it. It exists to outlast another
    // process's move-and-restore, so a lock momentarily quarantined is not read as taken over;
    // stretched past the ceiling it would instead keep a holder claiming a lock the tree has
    // already judged abandoned.
    expect(
      await lockConstant("LOCK_CONFIRM_MS"),
      "re-reading a published lock must stay well inside the ceiling it is not a substitute for",
    ).toBeLessThan(stale);
  });
  it("leaves no staging directory behind, on either path", async () => {
    // The publish is a private directory renamed onto the lock name, and a rename that SUCCEEDS
    // consumes it while one that fails does not. A leftover staging directory would be litter in
    // the adopter's `.qfai/` — and one per contended attempt, at that.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    await plantLock(root, "a-run-that-died", 60_000);
    await Promise.all(
      ["a", "b", "c"].map((suffix) =>
        updateInstallProvenance(root, (current) => ({
          ...current,
          workflows: { ...current.workflows, [`qfai-${suffix}.yml`]: entryTyped() },
        })),
      ),
    );
    expect(
      (await readdir(path.join(root, ".qfai"))).filter((name) => name.includes("staging")),
      "a staging directory survived the write",
    ).toEqual([]);
  });

  // Three plants for this family stayed green, and all three are measurements rather than gaps:
  //
  // - Reclaiming with a recursive `rm` of the lock directory instead of unlinking the markers
  //   this call OBSERVED. The damage needs a publish to land between one writer's observation
  //   and its removal, so that the removal takes a lock somebody else is already holding; the
  //   20-writer row did not produce that interleaving here. What the named removal buys is
  //   stated rather than measured: `unlink` on a marker that is gone is `ENOENT`, and `rmdir`
  //   on a directory holding another writer's marker is `ENOTEMPTY`, so an overtaken reclaimer
  //   cannot destroy a live lock however late it acts. A recursive `rm` can, and between OS
  //   processes it will.
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

// ── [47] ────────────────────────────────────────────
describe("a lock path this run did not create is refused, not followed", () => {
  it("does not enumerate or delete through a symlinked lock directory", async () => {
    // `ancestorsAreRealDirectories` checks the components ABOVE the record, and the lock is a leaf
    // beside it. Anything that can write `.qfai/` could leave `.install-provenance.lock.d` as a link
    // to a directory outside the tree — and the reclaim enumerates it and unlinks every entry older
    // than ten seconds. `qfai init` would delete an arbitrary set of the invoking user's files.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });

    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-lock-outside-"));
    dirs.push(outside);
    const bystander = path.join(outside, "somebody-elses-file.txt");
    await writeFile(bystander, "not this run's to delete\n", "utf-8");
    const longAgo = new Date(Date.now() - 60_000);
    await utimes(bystander, longAgo, longAgo);

    try {
      await symlink(outside, lockDir(root), "junction");
    } catch {
      return; // a platform that refuses the link; the guard is platform-independent
    }

    await expect(
      updateInstallProvenance(root, (current) => current),
      "a lock path that is a link must stop the run rather than be followed",
    ).rejects.toThrow(/not a directory this run created/i);

    expect(
      await readFile(bystander, "utf-8"),
      "the reclaim must not reach through the link to a file outside the tree",
    ).toBe("not this run's to delete\n");
  });

  it("still takes a lock when the path is a real directory, so the check is not a refusal", async () => {
    // The control. Without it the row above holds for a primitive that refuses every lock.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    await updateInstallProvenance(root, (current) => ({
      ...current,
      workflows: { ...current.workflows, "qfai-ok.yml": entryTyped() },
    }));
    expect(Object.keys((await readInstallProvenance(root)).workflows)).toEqual(["qfai-ok.yml"]);
  });
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

describe("the record writer pins the directory it verified", () => {
  it("compares the record directory across the staging write, before the rename", async () => {
    // Review finding [73]. `ancestorsAreRealDirectories` runs before the `mkdir` and again after it,
    // and then the write happens — three pathname operations with the same gap between them the
    // reviewer-artifact writers already close. A concurrent process that moves `.qfai` aside and
    // leaves a link in its place has the staging file created on the far side, and the rename
    // replaces an `install-provenance.json` outside the repository.
    //
    // Asserted on the SOURCE, for the reason the heartbeat row gives. Node has no `openat` or
    // `renameat`, so the repair is an identity comparison that narrows the window to one syscall,
    // and there is no in-process seam between the `writeFile` and the `rename` where a fixture could
    // swap the directory. What a test can pin is that the comparison exists, that it sits BETWEEN
    // those two calls, and that it refuses rather than warns.
    const source = await readFile(
      path.resolve(__dirname, "../../../src/shared/provenance.ts"),
      "utf-8",
    );
    const start = source.indexOf("export async function writeInstallProvenance(");
    expect(start, "the writer must exist to be checked").toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("\n}\n", start) + 3);
    // Comment lines stripped first: what this measures is the ORDER of the calls, and a paragraph
    // that grows must not be able to change the answer.
    const code = body
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");

    const observed = code.indexOf("await lstat(recordDir)");
    const staged = code.indexOf('flag: "wx"');
    const compared = code.indexOf("sameDirectory(await lstat(recordDir), observed)");
    const renamed = code.indexOf("renameWithRetry(");
    expect(
      observed,
      "the directory's identity must be read before anything is written into it",
    ).toBeGreaterThan(-1);
    expect(staged, "the staging write must still be exclusive").toBeGreaterThan(observed);
    expect(
      compared,
      "and the identity re-read and compared with it after the write",
    ).toBeGreaterThan(staged);
    expect(renamed, "before the rename publishes the record").toBeGreaterThan(compared);

    expect(code, "a directory that changed under the write is a refusal, not a warning").toMatch(
      /sameDirectory\(await lstat\(recordDir\), observed\)\)[\s\S]{0,80}?throw/,
    );
  });
});

describe("releasing a lock does not follow a name that was swapped under it", () => {
  it("leaves an outside file named like its marker exactly where it was", async () => {
    // Review finding [122]. Release was `unlink(lockDir/marker)` then `rmdir(lockDir)`, both
    // resolved through the lock NAME at the moment of the call. Anything that can write `.qfai/`
    // can move the acquired directory aside and leave a symlink to somewhere else in its place —
    // and the marker's name is readable out of the acquired directory, so an external file can be
    // waiting under exactly that name. The unlink then followed the link and deleted it.
    // `refuseLinkedLockPath` cannot help: it runs once, before acquisition.
    //
    // Driven from INSIDE the section, which is the only place the marker's name is known and the
    // only moment the swap has an effect. The mutator runs under the lock.
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-lockswap-"));
    dirs.push(dir);
    const root = path.join(dir, "repo");
    const outside = path.join(dir, "elsewhere");
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await mkdir(outside, { recursive: true });
    await writeInstallProvenance(root, { workflows: {} });

    const lockDir = path.join(root, ".qfai", ".install-provenance.lock.d");
    let swapped = false;
    let hostage = "";

    await updateInstallProvenance(root, (current) => {
      // Inside the section: the lock is held and its marker names this holder.
      const markers = readdirSync(lockDir);
      if (markers.length === 1) {
        hostage = path.join(outside, markers[0] ?? "");
        writeFileSync(hostage, "not yours to delete", "utf-8");
        const aside = `${lockDir}.moved`;
        try {
          renameSync(lockDir, aside);
          symlinkSync(outside, lockDir, "junction");
          swapped = true;
        } catch {
          // Windows without developer mode, or a platform refusing the link type. The guard is
          // platform-independent; the fixture is not.
          try {
            renameSync(aside, lockDir);
          } catch {
            // already back, or never moved
          }
        }
      }
      return { ...current, workflows: { ...current.workflows, "qfai-tests.yml": entryTyped() } };
    });

    if (!swapped) {
      return; // the fixture could not be built here
    }

    expect(
      existsSync(hostage),
      "the release followed the swapped lock name and deleted a file outside the tree",
    ).toBe(true);
    expect(readFileSync(hostage, "utf-8"), "and it must be exactly as it was").toBe(
      "not yours to delete",
    );
  });

  it("still removes its own lock when nothing interferes", async () => {
    // The other direction, and the one that would fail silently: a release that removes nothing
    // leaves the lock standing, and the next writer waits out its whole patience.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    await updateInstallProvenance(root, (current) => ({
      ...current,
      workflows: { ...current.workflows, "qfai-tests.yml": entryTyped() },
    }));

    expect(
      existsSync(path.join(root, ".qfai", ".install-provenance.lock.d")),
      "the lock must be gone, or the next writer waits out its whole patience",
    ).toBe(false);

    // …and a second writer goes straight through it.
    await updateInstallProvenance(root, (current) => ({
      ...current,
      workflows: { ...current.workflows, "qfai-validate.yml": entryTyped() },
    }));
    expect(Object.keys((await readInstallProvenance(root)).workflows).sort()).toEqual([
      "qfai-tests.yml",
      "qfai-validate.yml",
    ]);
  });
});

describe("a holder that was reclaimed does not disturb the lock that replaced it", () => {
  it("leaves a successor's lock exactly where it is", async () => {
    // Review finding [128]. The release freed the canonical NAME before it could tell whose
    // lock was under it: holder A is judged stale, holder B takes over, A resumes and releases,
    // and A's unconditional `rename` moves B's lock aside. If a third writer then takes the
    // freed name, B's restore fails — and B, still inside its section, is joined by that writer.
    // Two writers in there at once is the lost update this primitive exists to prevent, and it
    // is not self-healing: the entry is simply absent afterwards, its file reads as
    // `adopter-owned`, and it is never recorded again.
    //
    // Driven from inside A's section, which is where the takeover happens in the scenario. The
    // mutator stands in for the reclaim: it removes A's lock and publishes a DIFFERENT directory
    // at the same name, which is exactly what `clearAbandonedLock` plus B's rename produce.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });

    const lockDir = path.join(root, ".qfai", ".install-provenance.lock.d");
    const successorMarker = "successor-marker";
    let replaced = false;

    await updateInstallProvenance(root, (current) => {
      // Inside A's section. Take A's lock away and publish B's in its place.
      try {
        for (const entry of readdirSync(lockDir)) {
          rmSync(path.join(lockDir, entry), { force: true });
        }
        rmSync(lockDir, { recursive: true, force: true });
        const staging = path.join(root, ".qfai", ".successor.staging");
        mkdirSync(staging, { recursive: true });
        writeFileSync(path.join(staging, successorMarker), "", "utf-8");
        renameSync(staging, lockDir);
        replaced = true;
      } catch {
        // the fixture could not be built here; the assertions below skip
      }
      return {
        ...current,
        workflows: { ...current.workflows, "qfai-tests.yml": entryTyped() },
      };
    });

    if (!replaced) return;

    // A has now released. B's lock must be untouched — same directory, same marker inside.
    expect(
      existsSync(lockDir),
      "the resumed holder removed or moved the lock that replaced it",
    ).toBe(true);
    expect(readdirSync(lockDir), "and its marker must still be the successor's").toEqual([
      successorMarker,
    ]);

    // …and nothing was left lying around under a released name, which would mean the rename
    // happened and only the cleanup was skipped.
    expect(
      readdirSync(path.join(root, ".qfai")).filter((name) => name.includes(".released-")),
      "the canonical name must never have been freed at all",
    ).toEqual([]);
  });

  it("never moves the canonical name, so it cannot free another holder's", async () => {
    // The row above pins the OUTCOME. This one pins the mechanism, and the mechanism changed.
    //
    // Release used to check the identity and then rename the lock aside. Those are two
    // syscalls: a holder that verified its own lock, stalled, was reclaimed as stale and
    // replaced, and then resumed would move its SUCCESSOR's directory — and if a third writer
    // took the freed name, the restore declined and two writers were inside the section. That
    // is review finding [137], and narrowing the window does not close it, because the
    // operation acted on a NAME rather than on this holder's object.
    //
    // So it acts on the object. `rmdir` removes a directory only when it is empty, and the only
    // way it becomes empty is this holder unlinking the one marker it created; a successor's
    // lock holds a different marker, so `rmdir` fails and nothing moves. The canonical name is
    // freed by the removal succeeding, never ahead of it.
    const source = await readFile(
      new URL("../../../src/shared/provenance.ts", import.meta.url),
      "utf-8",
    );
    const at = source.indexOf("const release = async (): Promise<void> => {");
    expect(at, "the release must exist to be checked").toBeGreaterThan(-1);
    const body = source.slice(at, source.indexOf("\n  };", at));

    expect(
      body,
      "release must not rename the canonical name anywhere: that is the operation that can free " +
        "it for an object which is not this holder's",
    ).not.toMatch(/rename\(lockDir/);
    expect(
      body,
      "it must compare the standing lock against the object this holder published",
    ).toMatch(/standing\.ino !== held\.ino/);
    expect(
      body,
      "and remove only its own marker, so an emptied directory is one it emptied",
    ).toMatch(/unlink\(path\.join\(lockDir, marker\)\)/);
    expect(
      body,
      "with rmdir as the removal, which refuses a directory holding somebody else's marker",
    ).toMatch(/rmdir\(lockDir\)/);
  });

  it("takes its published identity from the object it staged, not from the name", async () => {
    // Review finding [134]. The identity was read with `lstat(lockDir)` AFTER the rename, which
    // asks what is at that name NOW — not necessarily what was just put there. A `rename` is
    // atomic, so the object that arrived is the object staged, and the staging directory was
    // read under a private name nothing else could reach.
    const source = await provenanceSource();
    const stagedAt = source.indexOf("const staged = await lstat(staging)");
    const renameAt = source.indexOf("await rename(staging, lockDir)");
    expect(
      stagedAt,
      "the staging identity must be read from the staging directory",
    ).toBeGreaterThan(-1);
    expect(renameAt, "and the rename must exist").toBeGreaterThan(-1);
    expect(stagedAt, "read BEFORE the rename, while nothing else can reach that name").toBeLessThan(
      renameAt,
    );

    expect(
      functionBody(source, "async function confirmPublishedLock("),
      "and what arrived must be compared against it, rather than adopted as this holder's",
    ).toMatch(/arrived\.dev === staged\.dev && arrived\.ino === staged\.ino/);

    // The acquisition FAILS on disagreement, and it does so from the caller — where the throw is
    // nobody's retry to swallow. `confirmPublishedLock` answers a boolean rather than throwing
    // for exactly that reason: the decision and the failure are one step apart and visible in one
    // place.
    const acquire = functionBody(source, "async function acquireRecordLock(");
    expect(
      acquire,
      "with acquisition failing when they disagree — continuing would record somebody else's " +
        "directory as this holder's own",
    ).toMatch(/if \(!\(await confirmPublishedLock\([\s\S]{0,200}?throw new Error\(/);
  });

  it("never retries a rename that already happened", async () => {
    // The flake this row was written for, and the defect under it.
    //
    // The stamp and the identity read used to sit INSIDE the wait loop, wrapped in the same
    // `catch` that means "the destination was not publishable, try again". So a failure of
    // either was retried — but the `rename` had already succeeded, and a successful rename
    // CONSUMES the staging directory. Every remaining attempt then renamed a source that no
    // longer existed: a guaranteed `ENOENT`, spun until the whole patience was gone, and
    // reported as `another process is writing the record`, which by then was false. The lock the
    // writer had published stayed published with its heartbeat already stopped, so every other
    // writer in the tree stalled a full `LOCK_STALE_MS` behind a holder that had given up, and
    // the entry was simply absent afterwards — a file on disk with no record, which reads as
    // `adopter-owned` and is never recorded again.
    //
    // Measured on a loaded machine with nothing injected: one `lock was replaced` throw, one
    // reclaimer restoring the lock it had moved, then 178 `ENOENT` renames and a lost entry.
    //
    // Asserted on the SOURCE, and the reason is the same one the heartbeat row gives rather than
    // a convenience. Reaching the path needs another process's reclaim to land between this
    // holder's `rename` and its `lstat` — two adjacent syscalls — and the only in-process seam
    // inside the lock is `mutate`, which runs after acquisition has already returned. What a row
    // can pin is the structure that makes the retry impossible: the loop holds nothing but the
    // rename, and everything after publication happens once.
    const source = await provenanceSource();
    const wait = functionBody(source, "async function publishLock(");
    const acquire = functionBody(source, "async function acquireRecordLock(");

    // CLAIM 1 — the loop retries the rename and nothing else. A stamp or an identity read inside
    // it is, by construction, work that can only run after the rename succeeded.
    expect(wait, "the wait must be the thing that retries the rename").toMatch(
      /await rename\(staging, lockDir\)/,
    );
    for (const [operation, why] of [
      ["utimes\\(", "a stamp inside the wait dates a lock that has already been published"],
      ["lstat\\(", "an identity read inside the wait is post-publication work"],
      ["confirmPublishedLock\\(", "confirmation inside the wait is retried when it fails"],
    ] as const) {
      expect(wait, why).not.toMatch(new RegExp(operation));
    }

    // CLAIM 2 — and it stops the moment the rename lands, rather than falling through to the
    // reclaim and the sleep. `staging` is gone by then; there is nothing left to retry with.
    const returned = wait.indexOf("return published;");
    const reclaimed = wait.indexOf("await clearAbandonedLock(");
    expect(returned, "the wait must answer whether it published").toBeGreaterThan(-1);
    expect(reclaimed, "and must still reclaim between attempts").toBeGreaterThan(-1);
    expect(
      returned,
      "a published lock must leave the loop before the reclaim, not after another pass",
    ).toBeLessThan(reclaimed);

    // CLAIM 3 — the caller does the rest ONCE. No loop of any kind survives in the acquisition
    // path, so there is no construct left for a post-publication failure to be retried by.
    for (const construct of ["for (", "while ("] as const) {
      expect(
        acquire,
        `acquisition must hold no ${construct.trim()} loop: publication happens once, and so must ` +
          "everything after it",
      ).not.toContain(construct);
    }

    // CLAIM 4 — and it swallows nothing. The bare `catch` that made the replacement error
    // invisible is gone; the one `catch` left rethrows what it caught after stopping the
    // heartbeat, which is the opposite of discarding it.
    const bareCatches = [...acquire.matchAll(/(?<!\.)\bcatch\b\s*(?:\([^)]*\))?\s*\{/g)];
    expect(
      bareCatches.length,
      "acquisition must not grow a second catch: the first one is what hid the defect",
    ).toBe(1);
    expect(acquire, "and the one that remains must rethrow, never absorb").toMatch(
      /catch \(error\) \{[\s\S]{0,200}?throw error;/,
    );
  });
  it("still releases its own lock when it was never reclaimed", async () => {
    // The other direction. A release that refuses too readily leaves the lock standing, and the
    // next writer waits out its whole patience before failing.
    const root = await tempRoot();
    await writeInstallProvenance(root, { workflows: {} });
    await updateInstallProvenance(root, (current) => ({
      ...current,
      workflows: { ...current.workflows, "qfai-tests.yml": entryTyped() },
    }));

    expect(
      existsSync(path.join(root, ".qfai", ".install-provenance.lock.d")),
      "the lock must be gone, or the next writer waits out its whole patience",
    ).toBe(false);
    expect(
      readdirSync(path.join(root, ".qfai")).filter((name) => name.includes(".released-")),
      "and its own object removed rather than parked",
    ).toEqual([]);
  });
});
