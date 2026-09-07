/**
 * What a gate that cannot evaluate yet is holding back.
 *
 * Several checks report nothing until a prerequisite exists, so a repository at
 * `error=0` can do exactly what a warning asks and land on a large error count
 * in one step. The warning that asks for the prerequisite is the only place a
 * reader can learn the size of that step, so it names the rules that start.
 *
 * Every content rule is skipped while the section is missing, so a pack scores
 * `error=0` and one warning. Adding the section — which is what the warning
 * asks for — starts all of them at once, and two of them are per source: a pack
 * with 28 sources meets 56 findings from those two alone. The visible count was
 * never the count the repository owed.
 *
 * `QFAI-RESEARCH-012` therefore names the rules that go from silent to `error`
 * on first contact, and what each one requires. These cases hold that list
 * against the validator rather than against a copy of it: a rule added, moved,
 * renamed or demoted has to move the message with it.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateContracts } from "../../src/core/validators/contracts.js";
import { validateResearchSummary } from "../../src/core/validators/researchSummary.js";

async function withPack<T>(files: Record<string, string>, fn: (root: string) => Promise<T>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-research-first-contact-"));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const file = path.join(root, rel);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const PACK = ".qfai/discussion/discussion-20260101000000000";

/** A pack whose files carry no Research Summary at all. */
const ABSENT = {
  [`${PACK}/04_Sources.md`]: ["# 04 Sources", "", "## Source Registry", "", "- SRC-0001", ""].join(
    "\n",
  ),
};

/**
 * The same pack the moment the section is added the obvious way: the heading
 * and a source, with none of the fields the rules below require. This is the
 * state a reader reaches by doing what the absence warning asks.
 */
const PRESENT = {
  [`${PACK}/04_Sources.md`]: [
    "# 04 Sources",
    "",
    "## Research Summary",
    "sources:",
    "  - id: src-1",
    "    title: A customer screenshot",
    "",
  ].join("\n"),
};

// The severity is narrowed rather than `string`: a value no issue carries
// returns an empty set, which every case here would read as the answer it wants.
const codesAt = async (
  files: Record<string, string>,
  severity: "info" | "warning" | "error",
): Promise<Set<string>> =>
  withPack(files, async (root) => {
    const issues = await validateResearchSummary(root, defaultConfig);
    return new Set(issues.filter((item) => item.severity === severity).map((item) => item.code));
  });

const absenceMessage = async (): Promise<string> =>
  withPack(ABSENT, async (root) => {
    const issues = await validateResearchSummary(root, defaultConfig);
    return issues.find((item) => item.code === "QFAI-RESEARCH-012")?.message ?? "";
  });

describe("the absence warning names what it is holding back", () => {
  it("reports nothing at error while the section is absent", async () => {
    // The premise. If the absent state already produced errors there would be
    // no step to warn about.
    expect(await codesAt(ABSENT, "error")).toEqual(new Set());
  });

  it("names every rule that becomes an error the moment the section exists", async () => {
    // Read off the validator, not typed here: whatever the present-but-empty
    // section produces at `error` is exactly what the message must name.
    const arriving = await codesAt(PRESENT, "error");
    expect(arriving.size, "the fixture produced no first-contact errors").toBeGreaterThan(0);

    const message = await absenceMessage();
    for (const code of [...arriving].sort()) {
      expect(message, `${code} arrives at error but the warning does not name it`).toContain(code);
    }
  });

  it("names no rule that does not arrive", async () => {
    // The other direction. A message listing a rule the section does not
    // actually start is the same defect read backwards — a reader budgets for
    // work that is not there and stops trusting the list.
    const arriving = await codesAt(PRESENT, "error");
    const message = await absenceMessage();

    for (const code of message.match(/QFAI-RESEARCH-\d+/g) ?? []) {
      if (code === "QFAI-RESEARCH-012") continue;
      expect(arriving, `${code} is named but does not arrive at error`).toContain(code);
    }
  });

  it("says what each named rule requires", async () => {
    // The list alone still leaves the reader to find the schema. These are the
    // keys the rules read, so adding the section is one informed edit.
    const message = await absenceMessage();

    for (const requirement of [
      "sources[].url",
      "sources[].published",
      "best_practices",
      "anti_patterns",
      "reflection",
    ]) {
      expect(message).toContain(requirement);
    }
  });

  it("says the source rules are counted per source", async () => {
    // The difference between a list of five rules and 56 findings.
    expect(await absenceMessage()).toContain("per source");
  });

  it("keeps the promotion window in the same message", async () => {
    // The window is what makes the step urgent rather than optional.
    expect(await absenceMessage()).toContain("then an error");
  });
});

describe("the undeclared-dependency warning names what it is holding back", () => {
  // `QFAI-CONTRACT-033` compares an index row's `Depends On` cell with the
  // contract file's declaration. A blank cell it reports on its own, but a cell
  // reading `-` is compared — and while the file declares nothing, the two
  // agree. So a row that says "no dependencies" is unmeasured, not agreed, and
  // says nothing until the file declares something. Both rules promote at the
  // same release, which is what puts them on one deadline.
  const CONTRACT = [
    "openapi: 3.0.0",
    "info:",
    "  title: Orders",
    "# QFAI-CONTRACT-ID: CON-API-0001",
    "",
  ].join("\n");

  const undeclared = async (): Promise<string> =>
    withPack({ ".qfai/contracts/api/orders.yaml": CONTRACT }, async (root) => {
      const issues = await validateContracts(root, defaultConfig);
      return issues.find((item) => item.code === "QFAI-CONTRACT-015")?.message ?? "";
    });

  it("names the rule that has nothing to compare until this one is answered", async () => {
    expect(await undeclared()).toContain("QFAI-CONTRACT-033");
  });

  it("says a `-` row is unmeasured rather than agreed", async () => {
    // The distinction the reader needs: the row looks answered and is not.
    expect(await undeclared()).toContain("unmeasured rather than agreed");
  });

  it("keeps the promotion window in the same message", async () => {
    expect(await undeclared()).toContain("then an error");
  });
});
