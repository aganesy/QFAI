/**
 * The allowlist count is measured, and the guard and the tool measure the same
 * thing.
 *
 * `cliMessageLanguage.test.ts` holds the list to a number written beside it.
 * The number is what makes an addition visible: the list is otherwise compared
 * against the sources entry by entry, and an entry naming a message that really
 * is in the tree satisfies every one of those comparisons.
 *
 * Two branches can each move that number correctly against their own base, and
 * the merge then agrees with neither. Git resolves it without a conflict, so
 * the failure arrives on the trunk rather than on either branch, and the answer
 * is a fresh measurement rather than a correction. These cases hold the tool
 * that produces it.
 */
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

type Derivation = {
  ALLOWLIST_REL: string;
  GUARD_REL: string;
  COUNT_PIN: RegExp;
  deriveAllowlistCount: (root: string) => Promise<number>;
  recordedAllowlistCount: (root: string) => Promise<number>;
  rePinRefusal: (input: {
    measured: number;
    recorded: number;
    allowIncrease: boolean;
  }) => string | null;
};

/**
 * A `file:` URL rather than the path: an absolute Windows path starts with a
 * drive letter, which an import specifier reads as a scheme.
 */
async function load(): Promise<Derivation> {
  const url = pathToFileURL(
    path.join(repoRoot, "scripts", "derive-cli-message-allowlist-count.mjs"),
  ).href;
  const mod: unknown = await import(url);
  if (
    typeof mod !== "object" ||
    mod === null ||
    !("deriveAllowlistCount" in mod) ||
    !("recordedAllowlistCount" in mod) ||
    !("rePinRefusal" in mod)
  ) {
    throw new Error("derive-cli-message-allowlist-count.mjs did not export its derivation");
  }
  return mod as unknown as Derivation;
}

const roots: string[] = [];

/** A repository-shaped sandbox holding just the two files the tool reads. */
async function sandbox(allowlist: string, guard: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-allowlist-count-"));
  roots.push(root);
  const { ALLOWLIST_REL, GUARD_REL } = await load();
  for (const [rel, body] of [
    [ALLOWLIST_REL, allowlist],
    [GUARD_REL, guard],
  ] as const) {
    const file = path.join(root, ...rel.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf-8");
  }
  return root;
}

const listOf = (body: string): string =>
  `export const SRC_JAPANESE_ALLOWLIST: Record<string, string[]> = {\n${body}\n};\n`;

const guardPinning = (count: number): string =>
  `const ALLOWLISTED_MESSAGE_COUNT = ${String(count)};\n`;

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root !== undefined) {
      await rm(root, { recursive: true, force: true });
    }
  }
});

describe("deriving the allowlist count", () => {
  it("counts every entry, across files", async () => {
    const { deriveAllowlistCount } = await load();
    const root = await sandbox(
      listOf(`  "core/a.ts": ["line one", "line two"],\n  "core/b.ts": ["line three"],`),
      guardPinning(3),
    );

    expect(await deriveAllowlistCount(root)).toBe(3);
  });

  it("counts a file recorded with no entries as none", async () => {
    // An emptied list is how a file that has been fully translated is left
    // before its key is removed, and it contributes nothing.
    const { deriveAllowlistCount } = await load();
    const root = await sandbox(
      listOf(`  "core/a.ts": [],\n  "core/b.ts": ["line three"],`),
      guardPinning(1),
    );

    expect(await deriveAllowlistCount(root)).toBe(1);
  });

  it("refuses a list whose entries are not lines", async () => {
    // Counted as none, a shape this cannot read reports a lower number than the
    // tree holds — which reads as progress and lets the pin fall with it.
    const { deriveAllowlistCount } = await load();
    const root = await sandbox(listOf(`  "core/a.ts": "line one",`), guardPinning(1));

    await expect(deriveAllowlistCount(root)).rejects.toThrow(/not an array of lines/);
  });

  it("refuses a list that spreads its entries from elsewhere", async () => {
    // A spread stands for however many lines its source holds, and that count
    // is not in this file. Read as one element it writes a pin below what the
    // guard measures at run time, so the command the guard names would leave
    // the suite failing on a number this tool had just written.
    const { deriveAllowlistCount } = await load();
    const root = await sandbox(
      listOf(`  "core/a.ts": [...sharedEntries],\n  "core/b.ts": ["line three"],`),
      guardPinning(2),
    );

    await expect(deriveAllowlistCount(root)).rejects.toThrow(/spreads `sharedEntries`/);
  });

  it("refuses a module that binds no allowlist", async () => {
    // The count is read off the list rather than a copy of it, so a module
    // without one is unreadable rather than empty.
    const { deriveAllowlistCount } = await load();
    const root = await sandbox("export const SOMETHING_ELSE = {};\n", guardPinning(0));

    await expect(deriveAllowlistCount(root)).rejects.toThrow(/no `SRC_JAPANESE_ALLOWLIST`/);
  });

  it("reads the number the guard pins", async () => {
    const { recordedAllowlistCount } = await load();
    const root = await sandbox(listOf(`  "core/a.ts": ["line one"],`), guardPinning(42));

    expect(await recordedAllowlistCount(root)).toBe(42);
  });

  it("refuses a guard that pins nothing", async () => {
    // Read as zero, a guard with no literal holds the list to nothing while
    // still reporting a comparison.
    const { recordedAllowlistCount } = await load();
    const root = await sandbox(
      listOf(`  "core/a.ts": ["line one"],`),
      "const SOMETHING_ELSE = 1;\n",
    );

    await expect(recordedAllowlistCount(root)).rejects.toThrow(/no `ALLOWLISTED_MESSAGE_COUNT`/);
  });

  it("rewrites the number and nothing else", async () => {
    // The pattern the tool substitutes with. Held here because the tool writes
    // into a file whose other content is the guard itself.
    const { COUNT_PIN } = await load();
    const guard = [
      "const OTHER = 775;",
      "  const ALLOWLISTED_MESSAGE_COUNT = 775;",
      "expect(counted).toBe(775);",
      "",
    ].join("\n");

    expect(guard.replace(COUNT_PIN, "$1772$3")).toBe(
      [
        "const OTHER = 775;",
        "  const ALLOWLISTED_MESSAGE_COUNT = 772;",
        "expect(counted).toBe(775);",
        "",
      ].join("\n"),
    );
  });
});

describe("which direction a re-pin may write", () => {
  it("writes a measurement below the pin", async () => {
    // Translating a message deletes its entry, and so the number falls. So does
    // a merge whose parents each counted a smaller list than the two hold
    // together. Neither is a correction anyone owes.
    const { rePinRefusal } = await load();

    expect(rePinRefusal({ measured: 770, recorded: 772, allowIncrease: false })).toBeNull();
    expect(rePinRefusal({ measured: 772, recorded: 772, allowIncrease: false })).toBeNull();
  });

  it("refuses a measurement above the pin", async () => {
    // The direction the number exists to make visible. A branch that adds a
    // Japanese message and its allowlist entry satisfies every other assertion
    // beside the count, so a re-pin that wrote any measurement would carry it
    // past the last one too.
    const { rePinRefusal } = await load();
    const refusal = rePinRefusal({ measured: 774, recorded: 772, allowIncrease: false });

    expect(refusal).toContain("2 more entries");
    expect(refusal).toContain("--allow-increase");
  });

  it("writes a measurement above the pin when the caller asks for it", async () => {
    // A merge taking entries the base added does raise the count legitimately.
    // The flag is what makes that a deliberate step rather than the same
    // command everyone runs without reading.
    const { rePinRefusal } = await load();

    expect(rePinRefusal({ measured: 774, recorded: 772, allowIncrease: true })).toBeNull();
  });
});

describe("the committed pin", () => {
  it("agrees with the list it holds", async () => {
    // The same comparison `cliMessageLanguage.test.ts` makes, from the tool's
    // side. Disagreeing here and agreeing there would mean the tool writes a
    // number the guard rejects.
    const { deriveAllowlistCount, recordedAllowlistCount } = await load();

    expect(await deriveAllowlistCount(repoRoot)).toBe(await recordedAllowlistCount(repoRoot));
  });

  it("is what the guard's failure text points at", async () => {
    // The message is the whole reason the tool exists: a contributor meeting
    // this failure has to be told that a re-measurement is the answer, and
    // which command produces it.
    const guard = await readFile(
      path.join(repoRoot, "packages/qfai/tests/unit/cliMessageLanguage.test.ts"),
      "utf-8",
    );

    expect(guard).toContain("node scripts/pin-cli-message-allowlist-count.mjs");
    expect(guard).toContain("the drift is inherited");
  });
});
