/**
 * `replaceFile` writes a temporary file beside its target and renames it into
 * place. It removes that temporary path when a step fails, and it must do so
 * only once it has created the file: when the exclusive create fails because
 * the name is already taken, the file there belongs to someone else.
 */

import type * as Crypto from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { replaceFile } from "../../src/core/runLog.js";

// The temporary name is random. Fixing the random bytes is what lets the test
// put a file at that name before `replaceFile` tries to create it.
const fixedRandom: { bytes: Buffer | undefined } = { bytes: undefined };

vi.mock("node:crypto", async () => {
  const actual = await vi.importActual<typeof Crypto>("node:crypto");
  return {
    ...actual,
    randomBytes: (size: number) => fixedRandom.bytes ?? actual.randomBytes(size),
  };
});

describe("replaceFile and its temporary file", () => {
  let base = "";

  beforeEach(async () => {
    base = await mkdtemp(path.join(os.tmpdir(), "qfai-replace-temp-"));
  });

  afterEach(async () => {
    fixedRandom.bytes = undefined;
    await rm(base, { recursive: true, force: true });
  });

  it("leaves a file already at the temporary name in place when the exclusive create fails", async () => {
    fixedRandom.bytes = Buffer.from("00112233aabb", "hex");
    const target = path.join(base, "report.json");
    const taken = path.join(base, ".qfai-replace-00112233aabb.tmp");
    await writeFile(target, "old\n");
    await writeFile(taken, "another process\n");

    await expect(replaceFile(target, "new\n")).rejects.toMatchObject({ code: "EEXIST" });

    expect(await readFile(taken, "utf8")).toBe("another process\n");
    expect(await readFile(target, "utf8")).toBe("old\n");
  });

  it("replaces the target and leaves no temporary file behind", async () => {
    const target = path.join(base, "report.json");
    await writeFile(target, "old\n");

    await replaceFile(target, "new\n");

    expect(await readFile(target, "utf8")).toBe("new\n");
    expect(await readdir(base)).toEqual(["report.json"]);
  });
});
