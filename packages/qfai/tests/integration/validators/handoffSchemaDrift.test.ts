/**
 * Integration: R-HANDOFF-SCHEMA-DRIFT emission (Pair IV).
 *
 * - TC-0015-0024 (error): a non-conforming handoff write OR an
 *   asymmetric SSOT-sync Pair IV edit (schema-side adds the canonical
 *   field set but writer-side does NOT reference it) makes the
 *   detector emit R-HANDOFF-SCHEMA-DRIFT at severity error with a
 *   non-empty 3-part justification.
 *
 * Detection: a static substring-token scan between
 * `core/schemas/handoff.ts#HANDOFF_MINIMUM_FIELDS` and each registered
 * writer file's expected `writerToken`. Symmetric (both present or
 * both absent) → no finding. Asymmetric → fire.
 */
// QFAI:SPEC-0015:TC-0015-0024

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detectHandoffSchemaDrift } from "../../../src/core/validators/handoffSchemaDrift.js";
import {
  HANDOFF_SCHEMA_REL,
  HANDOFF_WRITER_PAIRS,
} from "../../../src/core/validators/handoffSchemaPairs.js";

const SCHEMA_WITH_FIELDS = `export const HANDOFF_MINIMUM_FIELDS = ["companyName", "primarySpecId"] as const;\n`;

const SCHEMA_WITHOUT_FIELDS = `// schema scaffold; no fields exported yet\nexport const PLACEHOLDER = 1;\n`;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-handoff-schema-drift-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeAt(rel: string, body: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
}

describe("TC-0015-0024: detectHandoffSchemaDrift fires on asymmetric Pair IV edits", () => {
  it("does NOT fire when neither source file exists (consumer install)", async () => {
    const issues = await detectHandoffSchemaDrift(root);
    expect(issues.filter((i) => i.code === "R-HANDOFF-SCHEMA-DRIFT")).toEqual([]);
  });

  it("does NOT fire when schema has fields and every writer references its token", async () => {
    await writeAt(HANDOFF_SCHEMA_REL, SCHEMA_WITH_FIELDS);
    for (const pair of HANDOFF_WRITER_PAIRS) {
      await writeAt(
        pair.writerRel,
        `// writer file\nexport function writeHandoff(a: ${pair.writerToken}) { return a; }\n`,
      );
    }
    const issues = await detectHandoffSchemaDrift(root);
    expect(issues.filter((i) => i.code === "R-HANDOFF-SCHEMA-DRIFT")).toEqual([]);
  });

  it("fires (error) when schema has fields but a registered writer omits its token", async () => {
    await writeAt(HANDOFF_SCHEMA_REL, SCHEMA_WITH_FIELDS);
    for (const pair of HANDOFF_WRITER_PAIRS) {
      // Write a writer file that does NOT contain the expected token.
      await writeAt(
        pair.writerRel,
        `// drift: writer ignores canonical schema fields\nexport const X = 1;\n`,
      );
    }
    const issues = await detectHandoffSchemaDrift(root);
    const findings = issues.filter((i) => i.code === "R-HANDOFF-SCHEMA-DRIFT");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const f = findings[0];
    expect(f?.severity).toBe("error");
    // 3-part justification: schema path, writer path, clause.
    expect(f?.message).toMatch(/schemas\/handoff\.ts/);
    expect(f?.message).toMatch(/writer=/);
    expect(f?.message).toMatch(/clause=/);
    expect(f?.message).toMatch(/justification/i);
  });

  it("does NOT fire when schema does not yet export the canonical field set (symmetric absent)", async () => {
    await writeAt(HANDOFF_SCHEMA_REL, SCHEMA_WITHOUT_FIELDS);
    for (const pair of HANDOFF_WRITER_PAIRS) {
      await writeAt(pair.writerRel, `// writer file, no token yet\nexport const X = 1;\n`);
    }
    const issues = await detectHandoffSchemaDrift(root);
    expect(issues.filter((i) => i.code === "R-HANDOFF-SCHEMA-DRIFT")).toEqual([]);
  });
});
