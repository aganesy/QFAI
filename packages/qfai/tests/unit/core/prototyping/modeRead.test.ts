/**
 * Unit: `readPrototypingModeForRelax` returns the recorded per-loop
 * mode from prototyping.json (or null on every defective class).
 *
 * Pure I/O surface, unit-tested in isolation so the validate-side
 * post-filter has a deterministic helper input.
 */
// QFAI:SPEC-0012:TC-0012-0475

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PROTOTYPING_JSON_REL } from "../../../../src/core/prototyping/paths.js";
import { readPrototypingModeForRelax } from "../../../../src/core/prototyping/modeRead.js";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-mode-read-"));
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

async function writeProtoJson(body: unknown): Promise<void> {
  const abs = path.join(root, PROTOTYPING_JSON_REL);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(body, null, 2)}\n`, "utf-8");
}

describe("readPrototypingModeForRelax", () => {
  it("returns null when prototyping.json is missing", async () => {
    expect(await readPrototypingModeForRelax(root)).toBeNull();
  });

  it("returns null when prototyping.json is unparseable", async () => {
    const abs = path.join(root, PROTOTYPING_JSON_REL);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, "{ not json", "utf-8");
    expect(await readPrototypingModeForRelax(root)).toBeNull();
  });

  it("returns null when iterations[] is absent", async () => {
    await writeProtoJson({ runId: "loop-x" });
    expect(await readPrototypingModeForRelax(root)).toBeNull();
  });

  it("returns null when iterations[] is empty", async () => {
    await writeProtoJson({ iterations: [] });
    expect(await readPrototypingModeForRelax(root)).toBeNull();
  });

  it("returns null when the last iteration's mode is an unknown value", async () => {
    await writeProtoJson({ iterations: [{ index: 0, mode: "feral" }] });
    expect(await readPrototypingModeForRelax(root)).toBeNull();
  });

  it("returns 'convergence' from the highest-indexed iteration", async () => {
    await writeProtoJson({
      iterations: [
        { index: 0, mode: "exploration" },
        { index: 1, mode: "convergence" },
      ],
    });
    expect(await readPrototypingModeForRelax(root)).toBe("convergence");
  });

  it("returns 'exploration' from the highest-indexed iteration", async () => {
    await writeProtoJson({
      iterations: [
        { index: 0, mode: "convergence" },
        { index: 1, mode: "exploration" },
      ],
    });
    expect(await readPrototypingModeForRelax(root)).toBe("exploration");
  });

  it("returns null when the last iteration has no mode slot (legacy)", async () => {
    await writeProtoJson({ iterations: [{ index: 0 }] });
    expect(await readPrototypingModeForRelax(root)).toBeNull();
  });

  it("returns null when the top-level JSON is not an object (array)", async () => {
    const abs = path.join(root, PROTOTYPING_JSON_REL);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, "[]", "utf-8");
    expect(await readPrototypingModeForRelax(root)).toBeNull();
  });

  // Pin the sticky-mode behavior: a later iteration that does NOT
  // carry a `mode` slot must inherit the most-recent explicit mode
  // (walk backward). Without this, an `iterate --cycle 0 --mode
  // exploration` loop would silently revert to convergence as soon
  // as a reviewer iteration is appended without copying `mode`, and
  // validate would flip the intended warning-only soft gates back
  // to error.
  it("returns 'exploration' when the seed sets it and a later iteration omits mode (sticky)", async () => {
    await writeProtoJson({
      iterations: [{ index: 0, mode: "exploration" }, { index: 1 }],
    });
    expect(await readPrototypingModeForRelax(root)).toBe("exploration");
  });

  it("returns 'exploration' when an intermediate iteration omits mode but the seed set it", async () => {
    await writeProtoJson({
      iterations: [{ index: 0, mode: "exploration" }, { index: 1 }, { index: 2 }],
    });
    expect(await readPrototypingModeForRelax(root)).toBe("exploration");
  });

  it("returns the explicit later mode when it OVERRIDES the seed", async () => {
    await writeProtoJson({
      iterations: [
        { index: 0, mode: "exploration" },
        { index: 1 },
        { index: 2, mode: "convergence" },
      ],
    });
    expect(await readPrototypingModeForRelax(root)).toBe("convergence");
  });

  it("skips an unknown-value mode entry and inherits the prior explicit mode", async () => {
    await writeProtoJson({
      iterations: [
        { index: 0, mode: "exploration" },
        { index: 1, mode: "feral" },
      ],
    });
    expect(await readPrototypingModeForRelax(root)).toBe("exploration");
  });
});
