/**
 * How `qfai init` copies a workflow into the adopter's tree: creating exclusively, recording only
 * what it wrote, and reading bounded and regular-only.
 */

import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { copyTemplateTree } from "../../../src/core/fs/templateCopy.js";
import { readBoundedRegularFile } from "../../../src/shared/boundedRead.js";

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
    // never wrote.
    const source = await readFile(
      path.join(__dirname, "..", "..", "..", "src", "core", "fs", "templateCopy.ts"),
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
    // QFAI never wrote.
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
