import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const assets = path.join(root, "packages/qfai/assets");

const flat = async (rel: string): Promise<string> =>
  (await readFile(path.join(assets, rel), "utf-8")).replace(/\s+/g, " ");

describe("UI open-questions review", () => {
  it("reads the register's ID, Content and Approach columns, not a status or severity", async () => {
    const review = await flat("uix-rev/oq-review.md");
    const schema = await readFile(
      path.join(assets, "mdschema/story/open-questions.mdschema.yml"),
      "utf-8",
    );
    expect(schema).toContain("required_headers: [ID, Content, Approach]");

    expect(review).not.toMatch(/Status:|Severity:|downgrad/i);
    expect(review).toContain("A row is open while it exists");
    expect(review).toContain("A row whose Content opens `Unadjudicated:`");
  });

  it("blocks only on a question the reviewed UI needs answered now", async () => {
    const review = await flat("uix-rev/oq-review.md");
    expect(review).toContain(
      "A row blocks the review when the reviewed UI needs its answer now: its Content or Approach names a screen, flow, story, AC, EX or contract the review covers, or the reviewed UI cannot be built without its answer.",
    );
    expect(review).toContain(
      "A row whose Approach names a decision point after the reviewed UI does not block it, even when it names what the review covers. A deferred question's replacing row is such a row.",
    );
    expect(review).toContain("Any other row does not block this review and stays as it is.");
  });

  it("resolves or defers a blocking question without editing its row", async () => {
    const review = await flat("uix-rev/oq-review.md");
    const template = await flat(
      "init/.qfai/assistant/skill/qfai-sdd/templates/spec/open-questions.md",
    );
    expect(template).toContain("A row is never edited.");
    expect(template).toContain("Replaces OQ-…");

    expect(review).toContain("Neither edits the row.");
    expect(review).toContain(
      "append a decision row to `<paths.specsDir>/decisions.md` that names the question's ID, and delete the question row",
    );
    expect(review).toContain(
      "delete the row and append a new one whose Approach names the next decision point and says `Replaces OQ-…` with the deleted ID",
    );
  });
});
