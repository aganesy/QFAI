import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { reviewPayload } from "../../../helpers/reviewPayload.js";

export const CERTIFY_UI_CONTRACT = "CON-UI-0012";

/** Seed the UI surface and its accepted per-screen review together. */
export async function seedCertifyUiEvidence(root: string, iterationDir: string): Promise<void> {
  const uiDir = path.join(root, ".qfai/contracts/ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(
    path.join(uiDir, "index.yaml"),
    `# QFAI-CONTRACT-ID: ${CERTIFY_UI_CONTRACT}\nscreens: [{id: index, route: /}]\n`,
    "utf-8",
  );
  const reviewDir = path.join(iterationDir, CERTIFY_UI_CONTRACT);
  await mkdir(reviewDir, { recursive: true });
  await writeFile(
    path.join(reviewDir, "index.review.json"),
    reviewPayload(CERTIFY_UI_CONTRACT, "index", { cycle: 0 }),
    "utf-8",
  );
}
