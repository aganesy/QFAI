/**
 * The accessibility phase existed and nothing read the prototype captures
 * with it, so every screen the loop produced went unchecked for the four
 * things it checks. These pin the wiring: the captures are the input, and a
 * finding names the screen it came from.
 */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanFinalIterAccessibility } from "../../../../src/cli/commands/prototypingIterate.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

async function seedCaptures(files: Record<string, string>, iter = 0): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-a11y-scan-"));
  dirs.push(root);
  const dir = path.join(
    root,
    ".qfai",
    "evidence",
    "prototyping",
    `iter-${String(iter).padStart(2, "0")}`,
  );
  await mkdir(dir, { recursive: true });
  for (const [name, html] of Object.entries(files)) {
    await writeFile(path.join(dir, name), html, "utf-8");
  }
  return root;
}

const SOUND =
  '<html lang="en"><body><h1>Ledger</h1><img src="a.png" alt="a chart" /></body></html>';

describe("scanFinalIterAccessibility", () => {
  it("reports a capture that fails a criterion, naming its screen", async () => {
    const root = await seedCaptures({ dashboard: SOUND }, 0);
    expect(await scanFinalIterAccessibility(root, 0)).toEqual([]);

    const bad = await seedCaptures({
      "dashboard.html": '<html lang="en"><body><h1>x</h1><img src="a.png" /></body></html>',
    });
    const findings = await scanFinalIterAccessibility(bad, 0);
    expect(findings.map((f) => f.screen)).toEqual(["dashboard"]);
    expect(findings[0]?.summary).toContain("alt");
  });

  it("says nothing about a capture that passes", async () => {
    const root = await seedCaptures({ "dashboard.html": SOUND });
    expect(await scanFinalIterAccessibility(root, 0)).toEqual([]);
  });

  it("reads every capture, not only the first", async () => {
    const root = await seedCaptures({
      "a.html": SOUND,
      "b.html": "<html><body><h1>x</h1></body></html>",
    });
    expect((await scanFinalIterAccessibility(root, 0)).map((f) => f.screen)).toEqual(["b"]);
  });

  // A partial capture must not stop the cycle, and an index before the first
  // iteration is how a cycle-0 stop reaches this.
  it("says nothing when the iteration directory is absent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-a11y-scan-"));
    dirs.push(root);
    expect(await scanFinalIterAccessibility(root, 0)).toEqual([]);
    expect(await scanFinalIterAccessibility(root, -1)).toEqual([]);
  });
});
