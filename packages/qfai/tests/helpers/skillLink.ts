import { lstat, realpath } from "node:fs/promises";

import { expect } from "vitest";

/**
 * Asserts that a host skill wrapper is a symbolic link whose resolved target is
 * the canonical skill directory. A dangling link, or a link to a copy outside
 * the project that shares the suffix of the canonical path, fails.
 */
export async function expectLinkToCanonicalSkill(link: string, canonical: string): Promise<void> {
  expect((await lstat(link)).isSymbolicLink(), `${link} is a symbolic link`).toBe(true);
  expect(await realpath(link), `${link} resolves to the canonical directory`).toBe(
    await realpath(canonical),
  );
}
