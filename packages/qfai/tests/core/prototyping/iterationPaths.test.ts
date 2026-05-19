/**
 * Tests for multi-spec iteration path helpers.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  findIterationReviewFiles,
  findStaleIterDirs,
  iterationDir,
  iterationReviewPath,
  parseIterationReviewPath,
  purgeStaleIterDirs,
} from "../../../src/core/prototyping/iterationPaths.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-iter-paths-"));
  tempDirs.push(dir);
  return dir;
}

async function seedFile(root: string, relPath: string, body = "{}"): Promise<string> {
  const full = path.join(root, relPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body, "utf-8");
  return full;
}

async function seedDir(root: string, relPath: string): Promise<string> {
  const full = path.join(root, relPath);
  await mkdir(full, { recursive: true });
  return full;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("iterationDir / iterationReviewPath path composition", () => {
  // QFAI:SPEC-0012:TC-0012-0378
  it("composes zero-padded iter dir + screen review path for a (idx, spec, screen) triple", () => {
    expect(iterationDir(2, "spec-0007")).toBe(
      ".qfai/evidence/prototyping/iter-02/spec-0007",
    );
    expect(iterationReviewPath(2, "spec-0007", "orders-dashboard")).toBe(
      ".qfai/evidence/prototyping/iter-02/spec-0007/orders-dashboard.review.json",
    );
  });

  // QFAI:SPEC-0012:TC-0012-0378
  it("zero-pads single-digit indices and respects two-digit indices", () => {
    expect(iterationDir(0, "spec-0001")).toBe(
      ".qfai/evidence/prototyping/iter-00/spec-0001",
    );
    expect(iterationDir(9, "spec-0009")).toBe(
      ".qfai/evidence/prototyping/iter-09/spec-0009",
    );
    expect(iterationDir(14, "spec-0014")).toBe(
      ".qfai/evidence/prototyping/iter-14/spec-0014",
    );
  });
});

describe("findIterationReviewFiles", () => {
  // QFAI:SPEC-0012:TC-0012-0379
  it("globs across iter-NN/spec-*/<screen>.review.json and returns sorted absolute paths, ignoring .png/.html siblings", async () => {
    const root = await newTempDir();

    // Real review files spanning multiple specs.
    const a = await seedFile(
      root,
      ".qfai/evidence/prototyping/iter-02/spec-0007/dashboard.review.json",
      '{"a":1}',
    );
    const b = await seedFile(
      root,
      ".qfai/evidence/prototyping/iter-02/spec-0007/detail.review.json",
      '{"b":1}',
    );
    const c = await seedFile(
      root,
      ".qfai/evidence/prototyping/iter-02/spec-0011/list.review.json",
      '{"c":1}',
    );

    // Distractor files in the same dirs — must be ignored.
    await seedFile(
      root,
      ".qfai/evidence/prototyping/iter-02/spec-0007/dashboard.png",
      "PNGDATA",
    );
    await seedFile(
      root,
      ".qfai/evidence/prototyping/iter-02/spec-0007/dashboard.html",
      "<html/>",
    );
    await seedFile(
      root,
      ".qfai/evidence/prototyping/iter-02/spec-0011/notes.json",
      '{"not":"a review"}',
    );

    // Other iteration — must not appear in iter-02 query.
    await seedFile(
      root,
      ".qfai/evidence/prototyping/iter-03/spec-0007/dashboard.review.json",
      '{"d":1}',
    );

    const result = await findIterationReviewFiles(root, 2);

    const expected = [a, b, c].map((p) => p.replace(/\\/g, "/")).sort();
    expect(result).toEqual(expected);
    for (const p of result) {
      expect(p.endsWith(".review.json")).toBe(true);
    }
  });

  // QFAI:SPEC-0012:TC-0012-0379
  it("returns [] when the iteration directory does not exist", async () => {
    const root = await newTempDir();
    const result = await findIterationReviewFiles(root, 5);
    expect(result).toEqual([]);
  });
});

describe("findStaleIterDirs / purgeStaleIterDirs", () => {
  // QFAI:SPEC-0012:TC-0012-0380
  it("matches only /^iter-\\d{2,}$/ directories and leaves unrelated siblings intact", async () => {
    const root = await newTempDir();

    // Matching iter dirs.
    const good00 = await seedDir(root, ".qfai/evidence/prototyping/iter-00");
    const good07 = await seedDir(root, ".qfai/evidence/prototyping/iter-07");
    const good123 = await seedDir(root, ".qfai/evidence/prototyping/iter-123");

    // Non-matching: wrong name shapes.
    const badName = await seedDir(root, ".qfai/evidence/prototyping/iter-bad");
    const badSingleDigit = await seedDir(root, ".qfai/evidence/prototyping/iter-1");
    const unrelated = await seedDir(root, ".qfai/evidence/prototyping/sandbox");
    const certificateFile = await seedFile(
      root,
      ".qfai/evidence/prototyping/prototyping.json",
      "{}",
    );

    const matched = await findStaleIterDirs(root);
    const expected = [good00, good07, good123].sort();
    expect(matched).toEqual(expected);
    expect(matched).not.toContain(badName);
    expect(matched).not.toContain(badSingleDigit);
    expect(matched).not.toContain(unrelated);
    expect(matched).not.toContain(certificateFile);

    const { deleted } = await purgeStaleIterDirs(root);
    expect(deleted.sort()).toEqual(expected);

    // Unrelated siblings preserved.
    const remaining = await import("node:fs/promises").then((fs) =>
      fs.readdir(path.join(root, ".qfai/evidence/prototyping")),
    );
    expect(remaining.sort()).toEqual(
      ["iter-1", "iter-bad", "prototyping.json", "sandbox"].sort(),
    );
  });

  // QFAI:SPEC-0012:TC-0012-0380
  it("returns [] when the prototyping evidence root does not exist", async () => {
    const root = await newTempDir();
    const matched = await findStaleIterDirs(root);
    expect(matched).toEqual([]);
    const { deleted } = await purgeStaleIterDirs(root);
    expect(deleted).toEqual([]);
  });
});

describe("parseIterationReviewPath round-trip", () => {
  // QFAI:SPEC-0012:TC-0012-0392
  it("is a left-inverse of iterationReviewPath across representative (idx, spec, screen) triples", () => {
    const indices = [0, 1, 9, 10, 99];
    const specs = ["spec-0007", "spec-0012"];
    const screens = ["dashboard", "list", "settings"];

    for (const idx of indices) {
      for (const spec of specs) {
        for (const screen of screens) {
          const built = iterationReviewPath(idx, spec, screen);
          const parsed = parseIterationReviewPath(built);
          expect(parsed).toEqual({ idx, spec, screen });
        }
      }
    }
  });

  // QFAI:SPEC-0012:TC-0012-0392
  it("returns null on malformed inputs", () => {
    expect(parseIterationReviewPath("")).toBeNull();
    expect(parseIterationReviewPath("not/a/path.json")).toBeNull();
    expect(
      parseIterationReviewPath(".qfai/evidence/prototyping/iter-2/spec-0007/x.review.json"),
    ).toBeNull();
    expect(
      parseIterationReviewPath(".qfai/evidence/prototyping/iter-02/spec-7/x.review.json"),
    ).toBeNull();
    expect(
      parseIterationReviewPath(".qfai/evidence/prototyping/iter-02/spec-0007/x.png"),
    ).toBeNull();
  });
});
