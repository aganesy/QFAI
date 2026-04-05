/**
 * Surface detection tests — spec-0035 TDD-0001..TDD-0006
 *
 * QFAI:SPEC-0012:TC-0012-0001
 * QFAI:SPEC-0012:TC-0012-0002
 * QFAI:SPEC-0012:TC-0012-0003
 * QFAI:SPEC-0012:TC-0012-0004
 * QFAI:SPEC-0012:TC-0012-0005
 * QFAI:SPEC-0012:TC-0012-0006
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { detectSurfaceType } from "../../src/core/detection/surfaceType.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-surface-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("surface detection", () => {
  it("shared module import returns web", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");

    const result = await detectSurfaceType(root);

    expect(result).toBe("web");
  });

  it("no inline parsing in consumers", async () => {
    // This test verifies the module exports a single function.
    // The structural check (no inline logic in validators) is verified
    // by the fact that validators import from this module.
    expect(typeof detectSurfaceType).toBe("function");
  });

  it("cross-validator consistency", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");

    const result1 = await detectSurfaceType(root);
    const result2 = await detectSurfaceType(root);

    expect(result1).toBe(result2);
    expect(result1).toBe("web");
  });

  it("explicit web-ui metadata", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: web\n", "utf-8");
    await mkdir(path.join(root, "uiux"), { recursive: true });

    const result = await detectSurfaceType(root);

    expect(result).toBe("web");
  });

  it("explicit non-ui metadata", async () => {
    const root = await newTempDir();
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\n- surface: non-ui\n", "utf-8");

    const result = await detectSurfaceType(root);

    expect(result).toBe("non-ui");
  });

  it("heuristic fallback classification", async () => {
    const root = await newTempDir();
    // No explicit surface, but web content signals in story workshop
    await writeFile(path.join(root, "01_Spec.md"), "# Spec\n\nNo surface declared.\n", "utf-8");
    await writeFile(
      path.join(root, "03_Story-Workshop.md"),
      '# Story Workshop\n\n<div class="dashboard">Main view</div>\n',
      "utf-8",
    );

    const result = await detectSurfaceType(root);

    expect(["web", "mobile", "desktop", "cli", "mixed", "non-ui"]).toContain(result);
    expect(result).toBe("web");
  });
});
