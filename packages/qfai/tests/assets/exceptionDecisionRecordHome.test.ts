import { describe, expect, it } from "vitest";

import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";

describe("the decision record home stays local", () => {
  // QFAI:EX-0001-0033-03
  it("re-includes nothing under it in the managed ignore block", () => {
    const block = QFAI_GITIGNORE_BLOCK.split("\n");
    for (const line of ["!.qfai/evidence/decision/", "!.qfai/evidence/decision/**"]) {
      expect(block).not.toContain(line);
    }
    expect(block).toContain(".qfai/evidence/*");
  });
});
