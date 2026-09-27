/**
 * Integration: a diagnosed missing test raises no Change Request from `/qfai-implement`.
 *
 * Reads the two scope-gap lines of the shipped skill — one in `SKILL.md`, one in
 * `references/change-request-reset.md` — and holds each to the carve-out: the row is appended by
 * `/qfai-sdd`, and every other scope gap still goes through a Change Request.
 */
// QFAI:SPEC-0011:TC-0011-0021
import { describe, expect, it } from "vitest";

import { flat, readShipped } from "../../../helpers/shippedAssistant.js";

/** The paragraph of `text` that states the carve-out, flattened to one line. */
function carveOutParagraph(text: string): string {
  const paragraphs = text.split(/\r?\n\s*\r?\n/).map(flat);
  return paragraphs.find((paragraph) => /diagnosed missing test/i.test(paragraph)) ?? "";
}

const SCOPE_GAP_LINES = [
  "skills/qfai-implement/SKILL.md",
  "skills/qfai-implement/references/change-request-reset.md",
];

describe("qfai-implement scope gaps", () => {
  it("TC-0011-0021 (TDD-0029): A Diagnosed Missing Test Raises No Change Request", async () => {
    for (const file of SCOPE_GAP_LINES) {
      const line = carveOutParagraph(await readShipped(file));
      expect(line, `${file} states the carve-out on a scope-gap line`).toMatch(/scope gap/i);
      expect(line, file).toMatch(/behaviour the spec already states/i);
      expect(line, file).toMatch(/raises no Change Request/i);
      expect(line, file).toMatch(/adds no ledger row/i);
      expect(line, file).toMatch(/`\/qfai-sdd`[^.]*appends the row/i);
      expect(line, file).toMatch(/every other scope gap[^.]*Change Request/i);
      expect(line, `${file} cites no decision of this repository`).not.toMatch(/\bDR-\d{4}\b/);
    }
  });
});
