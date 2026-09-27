// QFAI:SPEC-0004:TC-0004-0018
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { validateReviewerJustification } from "../../src/core/validators/reviewerJustification.js";

it("TC-0004-0018: rejects an empty R-REJECTED-READOPT justification", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-rejected-readopt-"));
  try {
    const reportDir = path.join(root, ".qfai", "review", "review-2026-05-23");
    await mkdir(reportDir, { recursive: true });
    await writeFile(
      path.join(reportDir, "reviewer-completion.json"),
      JSON.stringify({ findings: [{ code: "R-REJECTED-READOPT", justification: "" }] }),
      "utf-8",
    );
    const { config } = await loadConfig(root);
    const issues = await validateReviewerJustification(root, config);
    expect(issues.map(({ code, severity }) => ({ code, severity }))).toEqual([
      { code: "R-REJECTED-READOPT", severity: "error" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
