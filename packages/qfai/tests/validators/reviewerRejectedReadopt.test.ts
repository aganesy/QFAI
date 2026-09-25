// QFAI:SPEC-0004:TC-0004-0018
// QFAI:SPEC-0004:TC-0004-0088
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { validateReviewerJustification } from "../../src/core/validators/reviewerJustification.js";

/** The `{ code, severity }` pairs the gate raises for one `R-REJECTED-READOPT` finding. */
async function findingsForJustification(
  justification: string,
): Promise<{ code: string; severity: string }[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-rejected-readopt-"));
  try {
    const reportDir = path.join(root, ".qfai", "review", "review-2026-05-23");
    await mkdir(reportDir, { recursive: true });
    await writeFile(
      path.join(reportDir, "reviewer-completion.json"),
      JSON.stringify({ findings: [{ code: "R-REJECTED-READOPT", justification }] }),
      "utf-8",
    );
    const { config } = await loadConfig(root);
    const issues = await validateReviewerJustification(root, config);
    return issues.map(({ code, severity }) => ({ code, severity }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

it("TC-0004-0018: rejects an empty R-REJECTED-READOPT justification", async () => {
  expect(await findingsForJustification("")).toEqual([
    { code: "R-REJECTED-READOPT", severity: "error" },
  ]);
});

it("TC-0004-0088: accepts a non-empty R-REJECTED-READOPT justification", async () => {
  expect(
    await findingsForJustification(
      "Re-adopted under DR-0001: the constraint that rejected it was lifted",
    ),
  ).toEqual([]);
});
