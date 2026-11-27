import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { expect, it } from "vitest";

const packageRoot = path.resolve(import.meta.dirname, "../../..");
const registryPath = path.join("assets", "validators", "layoutAntiPatterns.json");
const ids = ["lap-007-state-not-represented", "lap-008-no-back-affordance", "lap-009", "lap-010"];

it("ships the sourced layout review vocabulary", async () => {
  const registry: unknown = JSON.parse(
    await readFile(path.join(packageRoot, registryPath), "utf8"),
  );
  expect(registry).toHaveLength(ids.length);
  expect(registry).toEqual(
    expect.arrayContaining(
      ids.map((id) =>
        expect.objectContaining({
          id,
          regex: "(?!).*",
          scope: "semantic",
          source: expect.stringMatching(/\S/),
        }),
      ),
    ),
  );
});

async function registryCopies(directory: string, relative = ""): Promise<string[]> {
  const copies: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const entryPath = path.join(relative, entry.name);
    if (entry.isDirectory())
      copies.push(...(await registryCopies(path.join(directory, entry.name), entryPath)));
    else if (entry.name === path.basename(registryPath)) copies.push(entryPath);
  }
  return copies;
}

it("keeps one canonical registry in the shipped assets", async () => {
  expect(await registryCopies(packageRoot)).toEqual([registryPath]);
});
