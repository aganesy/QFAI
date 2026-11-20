/**
 * The public `validate.json` guide documents `profileValidatorsRan`.
 *
 * Every run `validateProject` assembles carries the key, and `false` means the
 * profile's gates were not evaluated at all. A guide that leaves it out lets a
 * consumer read the absence of errors from a stopped run as a pass, so the
 * guide names the key in its top-level table and says what each of its three
 * states means, including the absent one.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

const GUIDE = path.join("skill", "qfai-verify", "references", "validate-json-schema.md");

const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai", "assistant"),
  path.join(repoRoot, ".qfai", "assistant"),
];

function topLevelKeys(text: string): string[] {
  const start = text.indexOf("## Top level");
  const end = text.indexOf("\n## ", start + 1);
  return text
    .slice(start, end)
    .split("\n")
    .flatMap((line) => {
      const match = /^\|\s*`([A-Za-z]+)`\s*\|/.exec(line);
      return match?.[1] ? [match[1]] : [];
    });
}

describe.each(ASSISTANT_ROOTS)("validate.json guide under %s", (assistantRoot) => {
  it("lists profileValidatorsRan as a top-level key", async () => {
    const text = await readFile(path.join(assistantRoot, GUIDE), "utf8");

    expect(topLevelKeys(text)).toContain("profileValidatorsRan");
  });

  it("says what true, false and an absent value mean", async () => {
    const text = await readFile(path.join(assistantRoot, GUIDE), "utf8");

    expect(text).toMatch(/^- `true`: the profile's own validators ran/m);
    expect(text).toMatch(/^- `false`: they did not run\./m);
    expect(text).toContain("`QFAI-LAYOUT-001`");
    expect(text).toContain("`QFAI-LINK-001`");
    expect(text).toMatch(/^- absent: the file makes no claim either way\./m);
    expect(text).toMatch(/Read\s+absence\s+as\s+"not\s+known",\s+not\s+as\s+`true`\./);
  });
});
