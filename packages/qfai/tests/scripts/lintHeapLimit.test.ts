import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function rootScript(name: string): string {
  const parsed: unknown = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  if (typeof parsed !== "object" || parsed === null || !("scripts" in parsed)) {
    throw new Error("root package.json has no scripts");
  }
  const scripts: unknown = parsed.scripts;
  if (typeof scripts !== "object" || scripts === null || !(name in scripts)) {
    throw new Error(`root package.json has no "${name}" script`);
  }
  const body: unknown = Reflect.get(scripts, name);
  if (typeof body !== "string") throw new Error(`"${name}" is not a string`);
  return body;
}

describe("root lint script heap limit", () => {
  // The full-repository ESLint run outgrew V8's default old-space limit on some machines
  // and ended with exit code 134. The limit is passed to node directly, not via NODE_OPTIONS,
  // so the same script line works under cmd.exe, PowerShell and POSIX shells.
  it("runs ESLint under node with an explicit old-space limit", () => {
    const body = rootScript("lint");
    expect(body).toMatch(
      /^node --max-old-space-size=\d+ \.\/node_modules\/eslint\/bin\/eslint\.js /,
    );
    expect(body).toContain("--max-warnings 0");
  });

  it("raises the limit to at least 8192 MB", () => {
    const match = /--max-old-space-size=(\d+)/.exec(rootScript("lint"));
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(8192);
  });
});
