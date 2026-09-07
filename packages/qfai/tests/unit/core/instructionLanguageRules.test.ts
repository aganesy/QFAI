/**
 * The language slot in the shipped review instructions is filled or removed — never shipped.
 *
 * `qfai init` used to write `<!-- qfai:language-rules -->` into
 * `.github/instructions/code-review.instructions.md`, and nothing filled it: the marker appeared
 * in the two shipped assets and nowhere else in the package. The release before it shipped
 * concrete TypeScript review rules in that spot, so every project created since got an HTML
 * comment where there had been guidance — half a feature, and worse than either whole (#1167).
 *
 * ## The invariant these rows are built around
 *
 * **A reader of the output never meets the marker.** Not "it is filled for TypeScript" — that is
 * one case of it. The failure being closed is a slot that survives into a project, and it
 * survives just as visibly in a Python project as in a TypeScript one. So the marker's absence
 * is asserted for every combination below, and the content is asserted on top of it.
 *
 * The end-to-end row runs the real command, because the defect was never in the substitution: it
 * was that nothing called one.
 */
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../../src/cli/commands/init.js";
import {
  LANGUAGE_RULES_MARKER,
  detectProjectLanguages,
  fillLanguageRules,
  languageRulesFor,
} from "../../../src/core/instructionLanguageRules.js";

const CODE_REVIEW = "code-review.instructions.md";
const PRINCIPLES = "principles.instructions.md";

/** A shipped template's shape: prose, a blank line, then the slot. */
const template = (): string => `Constraints:\n\n- something\n\n${LANGUAGE_RULES_MARKER}\n`;

async function withDir(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-lang-rules-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the slot is filled with what the pair has, or removed", () => {
  it("puts the TypeScript review rules in the review file", () => {
    const filled = fillLanguageRules(template(), CODE_REVIEW, ["typescript"]);
    expect(filled).not.toContain(LANGUAGE_RULES_MARKER);
    expect(filled).toContain("TypeScript specific checks:");
    expect(filled, "the rules that went missing, not a placeholder standing in for them").toContain(
      "prefer type narrowing",
    );
    expect(filled, "and the prose above the slot is untouched").toContain("Constraints:");
  });

  it("removes the slot from a file the language has no rules for", () => {
    const filled = fillLanguageRules(template(), PRINCIPLES, ["typescript"]);
    expect(
      filled,
      "the principles file has no per-language content and had none before the slot existed — " +
        "so it must read as it did then, not as a file with an empty section at the end",
    ).not.toContain(LANGUAGE_RULES_MARKER);
    expect(filled).not.toContain("TypeScript specific checks:");
    expect(filled.trimEnd().endsWith("- something")).toBe(true);
  });

  it("removes the slot for a project whose language is not recognised", () => {
    const filled = fillLanguageRules(template(), CODE_REVIEW, []);
    expect(filled).not.toContain(LANGUAGE_RULES_MARKER);
    expect(filled.trimEnd().endsWith("- something")).toBe(true);
  });

  it("leaves a template that never carried a slot alone", () => {
    const plain = "Constraints:\n\n- something\n";
    expect(fillLanguageRules(plain, CODE_REVIEW, ["typescript"])).toBe(plain);
  });

  it("takes the blank line with the slot, so nothing trails the prose", () => {
    const filled = fillLanguageRules(template(), PRINCIPLES, []);
    expect(
      filled,
      "removing only the marker leaves the blank line that separated it, which reads as an " +
        "unfinished section",
    ).toBe("Constraints:\n\n- something\n");
  });

  it("answers for the pair, not the language alone", () => {
    expect(languageRulesFor(CODE_REVIEW, "typescript")).toContain("TypeScript specific checks:");
    expect(
      languageRulesFor(PRINCIPLES, "typescript"),
      "a pair with nothing to say answers null, which is what the caller removes the slot on",
    ).toBeNull();
  });
});

describe("a project is classified from its manifests", () => {
  it("reads a tsconfig.json as TypeScript", async () => {
    await withDir(async (root) => {
      await writeFile(path.join(root, "tsconfig.json"), "{}\n", "utf-8");
      expect(await detectProjectLanguages(root)).toEqual(["typescript"]);
    });
  });

  it("reads a declared compiler dependency as TypeScript", async () => {
    await withDir(async (root) => {
      // No tsconfig: a package can keep its configuration elsewhere, and the manifest is the
      // other declaration.
      await writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ devDependencies: { typescript: "^5.6.3" } }),
        "utf-8",
      );
      expect(await detectProjectLanguages(root)).toEqual(["typescript"]);
    });
  });

  it("classifies nothing when neither says so", async () => {
    await withDir(async (root) => {
      await writeFile(path.join(root, "main.py"), "print(1)\n", "utf-8");
      expect(await detectProjectLanguages(root)).toEqual([]);
    });
  });

  it("answers no on a manifest it cannot read, rather than guessing yes", async () => {
    await withDir(async (root) => {
      // A malformed manifest is a project this cannot classify. Guessing yes would put
      // TypeScript rules in front of a reviewer of some other language, which is the direction
      // that costs something.
      await writeFile(path.join(root, "package.json"), "{ not json", "utf-8");
      expect(await detectProjectLanguages(root)).toEqual([]);
    });
  });

  it("is not fooled by a directory standing where the manifest goes", async () => {
    await withDir(async (root) => {
      await mkdir(path.join(root, "package.json"), { recursive: true });
      expect(await detectProjectLanguages(root)).toEqual([]);
    });
  });
});

describe("qfai init writes no slot into a project", () => {
  const slotIn = async (root: string, file: string): Promise<string> =>
    readFile(path.join(root, ".github", "instructions", file), "utf-8");

  it("fills the review file for a TypeScript project and leaves no marker anywhere", async () => {
    await withDir(async (root) => {
      await writeFile(path.join(root, "tsconfig.json"), "{}\n", "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const review = await slotIn(root, CODE_REVIEW);
      expect(review).toContain("TypeScript specific checks:");
      expect(review).not.toContain(LANGUAGE_RULES_MARKER);
      expect(await slotIn(root, PRINCIPLES)).not.toContain(LANGUAGE_RULES_MARKER);
    });
  });

  it("leaves no marker in a project it cannot classify either", async () => {
    await withDir(async (root) => {
      await writeFile(path.join(root, "main.py"), "print(1)\n", "utf-8");
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const review = await slotIn(root, CODE_REVIEW);
      expect(
        review,
        "an unrecognised project is exactly where the old behaviour was hardest to notice: " +
          "nothing was expected in the slot, so the marker looked like it belonged",
      ).not.toContain(LANGUAGE_RULES_MARKER);
      expect(review, "and it must not be given another language's rules").not.toContain(
        "TypeScript specific checks:",
      );
      expect(await slotIn(root, PRINCIPLES)).not.toContain(LANGUAGE_RULES_MARKER);
    });
  });
});
