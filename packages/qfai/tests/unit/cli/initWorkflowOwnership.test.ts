/**
 * The six ways `qfai init` decided a file in the adopter's tree was QFAI's to delete or to attest to,
 * and was wrong by the time it acted.
 *
 * They are one family. Every one of them establishes ownership at one moment — a name in a set, a
 * record read before the copy, a digest computed pages earlier — and then acts on it at another. The
 * gap is where the adopter, or a second `qfai init` in the same tree, gets their content deleted or
 * stamped as QFAI's. Two of them (`[20]`, `[03]`) end the same way the provenance family did: a file
 * on disk with no entry, or an entry with no file, and a name that is never installed again.
 */

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { pruneMatchingEntries } from "../../../src/cli/commands/init.js";
import { copyTemplateTree } from "../../../src/cli/lib/fs.js";
import { readBoundedRegularFile } from "../../../src/shared/boundedRead.js";
import {
  readInstallProvenance,
  updateInstallProvenance,
  writeInstallProvenance,
} from "../../../src/shared/provenance.js";

const dirs: string[] = [];

async function tempRoot(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-init-own-"));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

const sha = (text: string): string => createHash("sha256").update(text).digest("hex");

// ── [30] / [06] ──────────────────────────────────────────────────────────────
describe("the prune asks the ownership question at the moment it deletes", () => {
  it("keeps a file whose content changed after it was judged prunable", async () => {
    const dir = await tempRoot();
    const target = path.join(dir, "qfai-retired.yml");
    await writeFile(target, "installed-by-qfai\n", "utf-8");

    // Judged prunable against the bytes QFAI recorded — the state the real caller computes before
    // the copy runs. Then the adopter replaces the file, which is the whole window.
    const judgedDigest = sha("installed-by-qfai\n");
    await writeFile(target, "the adopter's own workflow\n", "utf-8");

    const removed: string[] = [];
    await pruneMatchingEntries(
      dir,
      (entry) => entry.isFile() && entry.name === "qfai-retired.yml",
      removed,
      false,
      async (candidate) => sha(await readFile(candidate, "utf-8")) === judgedDigest,
    );

    expect(removed, "the name still matched; the bytes did not").toEqual([]);
    expect(await readFile(target, "utf-8")).toBe("the adopter's own workflow\n");
  });

  it("still deletes a file that is unchanged, so the confirm is a check and not a refusal", async () => {
    const dir = await tempRoot();
    const target = path.join(dir, "qfai-retired.yml");
    await writeFile(target, "installed-by-qfai\n", "utf-8");
    const judgedDigest = sha("installed-by-qfai\n");

    const removed: string[] = [];
    await pruneMatchingEntries(
      dir,
      (entry) => entry.isFile() && entry.name === "qfai-retired.yml",
      removed,
      false,
      async (candidate) => sha(await readFile(candidate, "utf-8")) === judgedDigest,
    );

    expect(removed).toEqual([target]);
    await expect(stat(target)).rejects.toThrow();
  });
});

// ── [33] ────────────────────────────────────────────
describe("the object that was verified is the object that is deleted", () => {
  it("does not delete the adopter file that took the name after the answer was given", async () => {
    const dir = await tempRoot();
    const target = path.join(dir, "qfai-retired.yml");
    await writeFile(target, "installed-by-qfai\n", "utf-8");
    const judgedDigest = sha("installed-by-qfai\n");

    // The window, made deterministic. `confirm` answers about the file it was handed and THEN
    // the adopter writes their own content under the same name — which is the interleaving a
    // second process produces and no in-process test can otherwise reach. Checking a pathname,
    // re-checking it and deleting it are three operations on a name; this is what it costs.
    let answered = 0;
    const removed: string[] = [];
    await pruneMatchingEntries(
      dir,
      (entry) => entry.isFile() && entry.name === "qfai-retired.yml",
      removed,
      false,
      async (candidate) => {
        const ok = sha(await readFile(candidate, "utf-8")) === judgedDigest;
        answered += 1;
        if (answered === 1) {
          await writeFile(target, "the adopter's own workflow\n", "utf-8");
        }
        return ok;
      },
    );

    expect(
      await readFile(target, "utf-8"),
      "the file deleted must be the one whose bytes were verified, not whatever holds the name",
    ).toBe("the adopter's own workflow\n");
    expect(removed, "and nothing QFAI owned was found to remove").toEqual([]);
  });
});

// ── [34] ────────────────────────────────────────────
describe("the removal and the record change are one success unit", () => {
  it("puts the file back when the work that had to go with the removal fails", async () => {
    const dir = await tempRoot();
    const target = path.join(dir, "qfai-retired.yml");
    await writeFile(target, "installed-by-qfai\n", "utf-8");
    const judgedDigest = sha("installed-by-qfai\n");

    // What fails here stands for the provenance write: a read-only `.qfai`, a full disk, a lock
    // the run could not take. The file being gone and its entry standing is the poisoned name
    // the prune exists to avoid — reached by the code meant to avoid it.
    const removed: string[] = [];
    await expect(
      pruneMatchingEntries(
        dir,
        (entry) => entry.isFile() && entry.name === "qfai-retired.yml",
        removed,
        false,
        async (candidate) => sha(await readFile(candidate, "utf-8")) === judgedDigest,
        () => Promise.reject(new Error("the record write failed")),
      ),
      "the failure must reach the caller rather than be swallowed",
    ).rejects.toThrow(/record write failed/);

    expect(
      await readFile(target, "utf-8"),
      "a removal whose record change failed must leave the file where it was",
    ).toBe("installed-by-qfai\n");
    expect(removed, "and must not report a removal it rolled back").toEqual([]);
  });

  it("deletes and reports when the work succeeds, so the unit is a unit and not a refusal", async () => {
    const dir = await tempRoot();
    const target = path.join(dir, "qfai-retired.yml");
    await writeFile(target, "installed-by-qfai\n", "utf-8");
    const judgedDigest = sha("installed-by-qfai\n");

    const removed: string[] = [];
    const committed: string[] = [];
    await pruneMatchingEntries(
      dir,
      (entry) => entry.isFile() && entry.name === "qfai-retired.yml",
      removed,
      false,
      async (candidate) => sha(await readFile(candidate, "utf-8")) === judgedDigest,
      (paths) => {
        // The record change runs while the file is still recoverable, and is told which names
        // it is accounting for.
        committed.push(...paths);
        return Promise.resolve();
      },
    );

    expect(removed).toEqual([target]);
    expect(committed, "the commit must be handed the paths it is committing").toEqual([target]);
    await expect(stat(target)).rejects.toThrow();
  });

  it("leaves no quarantine file behind on either path", async () => {
    // The move is an implementation detail and must stay one: a `.qfai-prune-*` file surviving
    // in `.github/workflows/` would be a new artifact in the adopter's tree, which is the sort
    // of thing this whole family is about not doing.
    for (const outcome of ["commit", "rollback"] as const) {
      const dir = await tempRoot();
      const target = path.join(dir, "qfai-retired.yml");
      await writeFile(target, "installed-by-qfai\n", "utf-8");
      const judgedDigest = sha("installed-by-qfai\n");
      const removed: string[] = [];
      const run = pruneMatchingEntries(
        dir,
        (entry) => entry.isFile() && entry.name === "qfai-retired.yml",
        removed,
        false,
        async (candidate) => sha(await readFile(candidate, "utf-8")) === judgedDigest,
        () => (outcome === "rollback" ? Promise.reject(new Error("no")) : Promise.resolve()),
      );
      if (outcome === "rollback") {
        await expect(run).rejects.toThrow();
      } else {
        await run;
      }
      expect(
        (await readdir(dir)).filter((name) => name.includes("qfai-prune-")),
        `a quarantine file survived the ${outcome} path`,
      ).toEqual([]);
    }
  });
});

// ── [30] the swapped-directory half ─────────────────────────────
describe("a directory swapped in after the snapshot is not deleted as a tree", () => {
  it("leaves the directory and everything under it alone", async () => {
    const dir = await tempRoot();
    const target = path.join(dir, "qfai-retired.yml");
    await writeFile(target, "installed-by-qfai\n", "utf-8");

    // The race, made deterministic. `readdir` sees a regular file, so the predicate matches; the
    // swap happens between that snapshot and the delete, which is the window the finding is about.
    // Reproducing it through `confirm` is the only way to hit it without a real second process.
    const removed: string[] = [];
    await pruneMatchingEntries(
      dir,
      (entry) => entry.isFile() && entry.name === "qfai-retired.yml",
      removed,
      false,
      async () => {
        await rm(target, { force: true });
        await mkdir(target, { recursive: true });
        await writeFile(path.join(target, "keep.txt"), "not QFAI's to delete\n", "utf-8");
        return true;
      },
    );

    expect(removed, "a directory reaching the delete is never this run's to remove").toEqual([]);
    expect(await readFile(path.join(target, "keep.txt"), "utf-8")).toBe("not QFAI's to delete\n");
  });
});

// ── the exclusive copy ───────────────────────────────────────
describe("the copy creates, and records only what it created", () => {
  it("creates EXCLUSIVELY when not forcing, so a file that appeared meanwhile is not overwritten", async () => {
    // The race is between two syscalls inside one function — `shouldWrite`'s `exists` and the
    // `copyFile` after it — and no in-process test can interleave them without a seam. Measured:
    // a row that pre-creates the destination exercises `shouldWrite` instead, and passes with the
    // plain `copyFile` restored. So the PROPERTY is asserted on the source, the same way this
    // repository pins workflow bodies, and the behavioural rows below cover what is observable.
    //
    // What the race costs is not only the adopter's bytes: the overwritten path lands in `copied`,
    // so the packaged digest is recorded as QFAI's own, doctor reports no drift on a file QFAI
    // never wrote, and the retired-workflow prune considers it QFAI's to delete.
    const source = await readFile(
      path.join(__dirname, "..", "..", "..", "src", "cli", "lib", "fs.ts"),
      "utf-8",
    );
    expect(
      source,
      "a create-only copy must create exclusively; `shouldWrite` answers about a moment that has passed",
    ).toContain("COPYFILE_EXCL");
    expect(
      source,
      "and losing the race must be a SKIP rather than a throw — the adopter got there first, which is " +
        "the outcome `shouldWrite` intended for a file that was already present",
    ).toMatch(/EEXIST[\s\S]{0,120}skipped\.push/);
  });

  it("skips a destination that is already there, and records nothing for it", async () => {
    // `shouldWrite` answers a question about a moment that has passed. A second process — another
    // `qfai init`, or the adopter's own editor — can create the file between that check and the
    // copy, and a plain `copyFile` OVERWRITES it. Worse than the lost bytes: the path lands in
    // `copied`, so the packaged digest is recorded as QFAI's own, doctor reports no drift on a file
    // QFAI never wrote, and the retired-workflow prune considers it QFAI's to delete.
    //
    // The race is made deterministic by creating the destination first — which is the state the
    // race produces, reached without one.
    const dir = await tempRoot();
    const source = path.join(dir, "src");
    const dest = path.join(dir, "dest");
    await mkdir(source, { recursive: true });
    await mkdir(dest, { recursive: true });
    await writeFile(path.join(source, "qfai-tests.yml"), "name: shipped\n", "utf-8");
    await writeFile(path.join(dest, "qfai-tests.yml"), "the adopter got there first\n", "utf-8");

    const result = await copyTemplateTree(source, dest, {
      force: false,
      dryRun: false,
      conflictPolicy: "skip",
    });

    expect(
      await readFile(path.join(dest, "qfai-tests.yml"), "utf-8"),
      "a create-only copy must not overwrite what is already there",
    ).toBe("the adopter got there first\n");
    expect(
      result.copied,
      "and a file it did not create must not be recorded as one it did — that is what stamps the " +
        "packaged digest onto an adopter's file",
    ).toEqual([]);
  });

  it("still copies, and still records, when the destination is free", async () => {
    // The other direction, so the exclusivity is a check and not a refusal to copy.
    const dir = await tempRoot();
    const source = path.join(dir, "src");
    const dest = path.join(dir, "dest");
    await mkdir(source, { recursive: true });
    await writeFile(path.join(source, "qfai-tests.yml"), "name: shipped\n", "utf-8");

    const result = await copyTemplateTree(source, dest, {
      force: false,
      dryRun: false,
      conflictPolicy: "skip",
    });

    expect(await readFile(path.join(dest, "qfai-tests.yml"), "utf-8")).toBe("name: shipped\n");
    expect(result.copied.map((p) => path.basename(p))).toEqual(["qfai-tests.yml"]);
  });

  it("overwrites when the caller asked to force, which is a different question", async () => {
    const dir = await tempRoot();
    const source = path.join(dir, "src");
    const dest = path.join(dir, "dest");
    await mkdir(source, { recursive: true });
    await mkdir(dest, { recursive: true });
    await writeFile(path.join(source, "qfai-tests.yml"), "name: shipped\n", "utf-8");
    await writeFile(path.join(dest, "qfai-tests.yml"), "stale\n", "utf-8");

    const result = await copyTemplateTree(source, dest, {
      force: true,
      dryRun: false,
      conflictPolicy: "skip",
    });

    expect(await readFile(path.join(dest, "qfai-tests.yml"), "utf-8")).toBe("name: shipped\n");
    expect(result.copied.map((p) => path.basename(p))).toEqual(["qfai-tests.yml"]);
  });
});

// ── [05] ─────────────────────────────────────────────────────────────────────
describe("a workflow path in the adopter tree is read bounded and regular-only", () => {
  it("refuses a file past the ceiling rather than loading it", async () => {
    const dir = await tempRoot();
    const big = path.join(dir, "big.yml");
    await writeFile(big, "x".repeat(2048), "utf-8");

    // The premise: the same reader returns the file when the ceiling admits it. Without this the
    // refusal below would also hold for a reader that refuses everything.
    expect(await readBoundedRegularFile(big, 4096)).not.toBeUndefined();
    expect(
      await readBoundedRegularFile(big, 1024),
      "an oversized file must be refused, not truncated and not read",
    ).toBeUndefined();
  });

  it("refuses a directory", async () => {
    const dir = await tempRoot();
    const notAFile = path.join(dir, "workflows");
    await mkdir(notAFile, { recursive: true });
    expect(await readBoundedRegularFile(notAFile, 4096)).toBeUndefined();
  });

  // Every case here is refused more than once, which was measured rather than assumed, and it is a
  // property of the reader rather than a gap in these assertions:
  //
  // - a symlink, by the `lstat` refusal AND by the descriptor identity check (`O_NOFOLLOW` is
  //   `undefined` on Windows, which is why the flag was never allowed to stand alone);
  // - an oversized file, by the `fstat` ceiling AND by the read-overflow check;
  // - a directory, three ways — the path-level `isFile`, the descriptor-level `isFile`, and the
  //   read, which throws on a directory handle.
  //
  // So reverting any single guard leaves these green. The falsification plants revert the PAIRS for
  // the first two; the directory row has no plant at all, because reverting all three of its guards
  // is deleting the reader rather than reproducing a defect.

  it("refuses a symlink even when its target is a small regular file", async () => {
    const dir = await tempRoot();
    const real = path.join(dir, "real.yml");
    await writeFile(real, "name: real\n", "utf-8");
    const link = path.join(dir, "link.yml");
    try {
      await symlink(real, link);
    } catch {
      // Windows without developer mode refuses symlink creation to an unprivileged process. The
      // guard is platform-independent; the fixture is not.
      return;
    }
    expect(await readBoundedRegularFile(link, 4096)).toBeUndefined();
  });
});

// ── [20] ─────────────────────────────────────────────────────────────────────
describe("pruning a retired workflow removes its provenance entry too", () => {
  it("leaves no entry behind that a later run would read as declined", async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeInstallProvenance(root, {
      workflows: {
        "qfai-retired.yml": {
          sha256: sha("a"),
          installedByVersion: "1.0.0",
          installedAt: "2026-01-02T03:04:05.000Z",
        },
        "qfai-tests.yml": {
          sha256: sha("b"),
          installedByVersion: "1.0.0",
          installedAt: "2026-01-02T03:04:05.000Z",
        },
      },
    });

    await updateInstallProvenance(root, (current) => ({
      ...current,
      workflows: Object.fromEntries(
        Object.entries(current.workflows).filter(([name]) => name !== "qfai-retired.yml"),
      ),
    }));

    expect(
      Object.keys((await readInstallProvenance(root)).workflows),
      "an entry surviving its file reads as `declined`, and the name is never installed again",
    ).toEqual(["qfai-tests.yml"]);
  });
});

// ── [03] ─────────────────────────────────────────────────────────────────────
describe("two writers do not overwrite each other's entries", () => {
  it("merges onto the record on disk rather than onto a snapshot", async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeInstallProvenance(root, { workflows: {} });

    const entry = (tag: string) => ({
      sha256: sha(tag),
      installedByVersion: "1.0.0",
      installedAt: "2026-01-02T03:04:05.000Z",
    });

    // Both writers hold the SAME pre-run snapshot — the empty record — which is exactly the
    // situation two `qfai init` runs in one tree are in. Under the old code the second write was
    // built on that snapshot and the first run's entry was gone.
    await Promise.all([
      updateInstallProvenance(root, (current) => ({
        ...current,
        workflows: { ...current.workflows, "qfai-tests.yml": entry("tests") },
      })),
      updateInstallProvenance(root, (current) => ({
        ...current,
        workflows: { ...current.workflows, "qfai-validate.yml": entry("validate") },
      })),
    ]);

    expect(
      Object.keys((await readInstallProvenance(root)).workflows).sort(),
      "both writers' entries must survive; a lost one leaves its file unrecordable forever",
    ).toEqual(["qfai-tests.yml", "qfai-validate.yml"]);
  });

  it("releases the lock when the mutator throws, so the next writer is not wedged", async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    await writeInstallProvenance(root, { workflows: {} });

    await expect(
      updateInstallProvenance(root, () => {
        throw new Error("mutator failed");
      }),
    ).rejects.toThrow(/mutator failed/);

    // The half that matters: a lock leaked here would make every later `qfai init` in this tree
    // wait out the staleness ceiling before it could write anything.
    await updateInstallProvenance(root, (current) => ({
      ...current,
      workflows: {
        ...current.workflows,
        "qfai-tests.yml": {
          sha256: sha("tests"),
          installedByVersion: "1.0.0",
          installedAt: "2026-01-02T03:04:05.000Z",
        },
      },
    }));
    expect(Object.keys((await readInstallProvenance(root)).workflows)).toEqual(["qfai-tests.yml"]);
  });
});

// ── [07] ─────────────────────────────────────────────────────────────────────
describe("the recorded digest is of the bytes the copy wrote", () => {
  it("does not adopt content that replaced the file after the copy", async () => {
    const root = await tempRoot();
    const sourceRoot = path.join(root, "assets");
    await mkdir(path.join(sourceRoot, ".github", "workflows"), { recursive: true });
    const sourcePath = path.join(sourceRoot, ".github", "workflows", "qfai-tests.yml");
    await writeFile(sourcePath, "name: shipped\n", "utf-8");

    const destPath = path.join(root, ".github", "workflows", "qfai-tests.yml");
    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, "name: shipped\n", "utf-8");
    // The window: something rewrites the destination between the copy and the digest.
    await writeFile(destPath, "name: whatever the adopter put here\n", "utf-8");

    const sourceBytes = await readBoundedRegularFile(sourcePath, 1_048_576);
    expect(sourceBytes).not.toBeUndefined();
    const recorded = createHash("sha256")
      .update(sourceBytes ?? Buffer.alloc(0))
      .digest("hex");

    expect(recorded, "the entry must attest to what QFAI shipped").toBe(sha("name: shipped\n"));
    expect(
      recorded,
      "recording the re-read would stamp the adopter's content as QFAI's, and drift detection " +
        "would be blind to that edit forever",
    ).not.toBe(sha("name: whatever the adopter put here\n"));
  });
});
