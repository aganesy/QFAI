/**
 * Every path an agent card requires is a path, and every one of them is on disk.
 *
 * `doctor` reads each `## Inputs you must read` bullet and reports the ones it
 * cannot find. It joins a bullet with its continuation lines, so a bullet that
 * names a file and then says what it is for used to be read as one path — and
 * a card whose file is present was reported as missing an input, naming a
 * sentence.
 *
 * Nothing was red, because the check runs over five roles and those five
 * happened to write bare paths. That is what makes the case worth holding for
 * every card rather than for the five: adding a role to the check, or writing
 * one explanatory bullet in a card already in it, turns a correct card into a
 * finding that names a file the tree has.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractLiteralRequiredInputs } from "../../src/core/doctor.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** The shipped cards and the root mirror `qfai init` writes from them. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

async function cardsIn(tree: string): Promise<[string, string][]> {
  const dir = path.join(repoRoot, tree, "assistant/agents");
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md"));
  return Promise.all(
    names.map(
      async (name): Promise<[string, string]> => [
        name,
        await readFile(path.join(dir, name), "utf-8"),
      ],
    ),
  );
}

async function isOnDisk(tree: string, relative: string): Promise<boolean> {
  // The bullets are written relative to the consuming project's root, which for
  // the shipped tree is the directory the mirror sits under.
  const root = tree === ".qfai" ? repoRoot : path.join(repoRoot, "packages/qfai/assets/init");
  try {
    await readFile(path.join(root, relative), "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether a required input is written by a run rather than shipped.
 *
 * The check asks whether a card names a path that is not there. Under these
 * two directories nothing ever is: the package ships no evidence document and
 * no report, and each file appears when a phase writes it. A reviewer that
 * reads one is reading an earlier phase's output, which is a legitimate input
 * and not a wrong path.
 *
 * By directory, not by name, and only these two: a card naming a missing
 * `catalog/` or `skills/` file is still the defect this check exists for.
 */
function isProducedByARun(relative: string): boolean {
  return relative.startsWith(".qfai/evidence/") || relative.startsWith(".qfai/report/");
}

describe.each(TREES)("%s: an agent card's required inputs are paths that exist", (tree) => {
  it("finds cards to read, so an empty directory cannot pass the case below", async () => {
    expect((await cardsIn(tree)).length).toBeGreaterThan(0);
  });

  it("finds every literal input every card requires", async () => {
    const missing: string[] = [];
    for (const [name, content] of await cardsIn(tree)) {
      for (const required of extractLiteralRequiredInputs(content)) {
        if (isProducedByARun(required)) {
          continue;
        }
        if (!(await isOnDisk(tree, required))) {
          missing.push(`${name}: ${required}`);
        }
      }
    }

    expect(
      missing,
      "a card requires an input that is not on disk. Either the path is wrong, or the bullet is " +
        "being read past the path it names",
    ).toEqual([]);
  });
});

describe("a required-input bullet may explain itself", () => {
  const section = (bullets: string[]): string =>
    ["## Inputs you must read", "", ...bullets, "", "## Next"].join("\n");

  it("reads the path off the front and leaves the prose behind", () => {
    expect(
      extractLiteralRequiredInputs(
        section([
          "- .qfai/assistant/catalog/test-layers.md (SSOT for hard coverage obligations)",
          "- .qfai/assistant/manifest/agent-catalog.yml — the role contract",
          "- `.qfai/assistant/catalog/product.md` (what the project is)",
        ]),
      ),
    ).toEqual([
      ".qfai/assistant/catalog/test-layers.md",
      ".qfai/assistant/manifest/agent-catalog.yml",
      ".qfai/assistant/catalog/product.md",
    ]);
  });

  it("still drops a glob, an optional input and a bullet that names no path", () => {
    expect(
      extractLiteralRequiredInputs(
        section([
          "- .qfai/assistant/catalog/** (everything the catalog holds)",
          "- .qfai/assistant/catalog/tech.md (optional)",
          "- Whatever the caller hands you",
        ]),
      ),
    ).toEqual([]);
  });

  it("keeps a produced artifact out of the on-disk requirement", () => {
    // The extractor still reads it — it is a literal path and the bullet names
    // it — and the on-disk check is what skips it. Asserting the extraction
    // here keeps the two rules separable: a change that stopped reading the
    // path at all would pass a weaker test.
    expect(
      extractLiteralRequiredInputs(
        section(["- .qfai/evidence/skeleton.md (the section under review)"]),
      ),
    ).toEqual([".qfai/evidence/skeleton.md"]);
    expect(isProducedByARun(".qfai/evidence/skeleton.md")).toBe(true);
    expect(isProducedByARun(".qfai/report/validate.json")).toBe(true);
    // A shipped asset is not excused by living one directory over.
    expect(isProducedByARun(".qfai/assistant/catalog/tech.md")).toBe(false);
  });

  it("drops a path written with a placeholder", () => {
    // `.qfai/specs/<spec-id>/tdd/test-list.md` is one path per spec and none of
    // them is at that name, so it names a shape in the same way a glob does.
    expect(
      extractLiteralRequiredInputs(
        section(["- .qfai/specs/<spec-id>/tdd/test-list.md (the row being reviewed)"]),
      ),
    ).toEqual([]);
  });

  it("reads a glob written in the prose as prose", () => {
    // The glob test is what drops a bullet naming a set rather than a file.
    // Applied to the whole bullet it also dropped a real input whose
    // explanation happened to mention one.
    expect(
      extractLiteralRequiredInputs(
        section(["- .qfai/assistant/catalog/manifest.md (the index over catalog/**)"]),
      ),
    ).toEqual([".qfai/assistant/catalog/manifest.md"]);
  });

  it("keeps reading a continuation line as part of the same bullet", () => {
    // The join is what lets a card scope a glob on the line below, and what
    // carries an `optional` written there.
    expect(
      extractLiteralRequiredInputs(
        section([
          "- .qfai/assistant/catalog/tech.md",
          "  (optional, when the stack is in question)",
        ]),
      ),
    ).toEqual([]);
  });

  it("drops a trailing period so a sentence-final path still resolves", () => {
    expect(
      extractLiteralRequiredInputs(section(["- .qfai/assistant/catalog/product.md."])),
    ).toEqual([".qfai/assistant/catalog/product.md"]);
  });
});
