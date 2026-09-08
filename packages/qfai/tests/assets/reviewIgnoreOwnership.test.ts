/**
 * Each review directory's README describes an ignore file, and the file it
 * describes has to be the one that exists.
 *
 * The two directories are ignored by different owners. `.qfai/review/` is
 * covered by the managed block in the repo-root `.gitignore`, and holds no
 * nested file of its own; `.qfai/review_archive/` holds one. Both READMEs
 * spell out which arrangement is theirs, and each statement is the operator's
 * only account of where to look when a pack shows up in `git status`.
 *
 * Nothing tied either statement to the tree. A nested `.qfai/review/.gitignore`
 * was deleted in favour of the root block, and its README went on naming it as
 * the file that decides the policy — while a paragraph further down said the
 * opposite. Both readings were available at once for as long as nobody
 * compared them to the directory.
 *
 * Deleting or adding one of these files is a supported change; leaving the
 * README behind is what this stops.
 */

import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Whether the directory owns the ignore file that covers its packs. */
const OWNS_NESTED_IGNORE: ReadonlyMap<string, boolean> = new Map([
  [".qfai/review", false],
  [".qfai/review_archive", true],
]);

async function exists(relative: string): Promise<boolean> {
  try {
    await access(path.join(repoRoot, relative));
    return true;
  } catch {
    // Any failure to reach the path reads as absent, which is what the READMEs
    // are checked against. A permission error would be a false "absent", and
    // that direction is the safe one: it fails the case that claims presence.
    return false;
  }
}

describe("a review directory's README names the ignore file it actually has", () => {
  it("finds both READMEs, so an unreadable path cannot pass the cases below", async () => {
    for (const directory of OWNS_NESTED_IGNORE.keys()) {
      expect(await exists(`${directory}/README.md`), directory).toBe(true);
    }
  });

  it.each([...OWNS_NESTED_IGNORE])(
    "holds a nested .gitignore: %s -> %s",
    async (directory, owns) => {
      expect(
        await exists(`${directory}/.gitignore`),
        owns
          ? `${directory}/.gitignore is gone. Its README says this directory carries its own ignore ` +
              `file; say instead that the repo-root managed block covers it.`
          : `${directory}/.gitignore was added. Its README says the repo-root managed block is the ` +
              `single source of truth for this directory; both cannot be true.`,
      ).toBe(owns);
    },
  );
});
