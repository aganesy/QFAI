/**
 * The future compiler lane refuses a tsconfig that silences deprecations, and only that.
 *
 * The lane used to ask whether the file's text contained the word `ignoreDeprecations`. That
 * refused a tsconfig whose comment or `$comment` string merely named the option, stopping the lane
 * before any compiler ran, and it passed a key spelled with a JSON escape that the compiler reads
 * as the option itself. The decision now reads the parsed `compilerOptions`, the way the compiler
 * does.
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

type Guard = {
  tsconfigSilencesDeprecations: (fileName: string, text: string) => boolean;
};

/**
 * A `file:` URL rather than the path: an absolute Windows path starts with a drive letter, which an
 * import specifier reads as a scheme.
 */
async function load(): Promise<Guard> {
  const url = pathToFileURL(path.join(repoRoot, "scripts", "check-types-future.mjs")).href;
  return (await import(url)) as Guard;
}

const FILE = "tsconfig.json";

describe("tsconfigSilencesDeprecations", () => {
  it("refuses the option set in compilerOptions", async () => {
    const { tsconfigSilencesDeprecations } = await load();

    expect(
      tsconfigSilencesDeprecations(FILE, '{ "compilerOptions": { "ignoreDeprecations": "6.0" } }'),
    ).toBe(true);
  });

  // JSONC: the compiler accepts comments and trailing commas, so the guard has to as well.
  it("refuses the option in a tsconfig with comments and trailing commas", async () => {
    const { tsconfigSilencesDeprecations } = await load();
    const text = [
      "{",
      "  // the base config",
      '  "compilerOptions": {',
      '    "strict": true,',
      '    "ignoreDeprecations": "6.0",',
      "  },",
      "}",
    ].join("\n");

    expect(tsconfigSilencesDeprecations(FILE, text)).toBe(true);
  });

  // A key the compiler decodes to the option is the option, however the file spells it.
  it("refuses the option spelled with a JSON escape", async () => {
    const { tsconfigSilencesDeprecations } = await load();

    expect(
      tsconfigSilencesDeprecations(
        FILE,
        '{ "compilerOptions": { "ignore\\u0044eprecations": "6.0" } }',
      ),
    ).toBe(true);
  });

  it("passes a tsconfig that names the option only in a comment", async () => {
    const { tsconfigSilencesDeprecations } = await load();
    const text = [
      "{",
      "  // ignoreDeprecations is not used here: fix the deprecated option instead.",
      '  "compilerOptions": { "strict": true, },',
      "}",
    ].join("\n");

    expect(tsconfigSilencesDeprecations(FILE, text)).toBe(false);
  });

  it("passes a tsconfig that names the option only in another string", async () => {
    const { tsconfigSilencesDeprecations } = await load();
    const text =
      '{ "$comment": "never set ignoreDeprecations", "compilerOptions": { "strict": true } }';

    expect(tsconfigSilencesDeprecations(FILE, text)).toBe(false);
  });

  // The option outside compilerOptions is not an option the compiler reads.
  it("passes the name used as a key outside compilerOptions", async () => {
    const { tsconfigSilencesDeprecations } = await load();

    expect(tsconfigSilencesDeprecations(FILE, '{ "ignoreDeprecations": "6.0" }')).toBe(false);
  });

  // A file the guard cannot read is not one it can vouch for.
  it("throws on a tsconfig it cannot parse, rather than passing it", async () => {
    const { tsconfigSilencesDeprecations } = await load();

    expect(() => tsconfigSilencesDeprecations(FILE, '{ "compilerOptions": ')).toThrow(FILE);
  });
});
