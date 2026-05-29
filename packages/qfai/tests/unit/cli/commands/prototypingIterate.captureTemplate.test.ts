/**
 * Unit: `qfai prototyping iterate --capture` evidence-template
 * skeleton emission.
 *
 * - TC-0012-0478: the emitted skeleton MUST include every required
 *   `taskFidelity` keyword as a placeholder so the keyword set cannot
 *   be silently forgotten by the operator.
 *
 * The emitter lives at
 * `core/prototyping/captureTemplate.ts` (`buildTaskFidelityTemplate` /
 * `writeTaskFidelityTemplate`) and reads the SSOT keyword list from
 * `validators/taskFidelityKeywords.ts`.
 */
// QFAI:SPEC-0012:TC-0012-0478

import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildTaskFidelityTemplate,
  writeTaskFidelityTemplate,
} from "../../../../src/core/prototyping/captureTemplate.js";
import { TASK_FIDELITY_REQUIRED_KEYWORDS } from "../../../../src/core/validators/taskFidelityKeywords.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "qfai-capture-template-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("TC-0012-0478: --capture template skeleton names every required taskFidelity keyword", () => {
  it("buildTaskFidelityTemplate includes a placeholder line per required keyword", () => {
    const text = buildTaskFidelityTemplate();
    expect(text).toContain("## taskFidelity");
    for (const keyword of TASK_FIDELITY_REQUIRED_KEYWORDS) {
      expect(text).toContain(keyword);
      // TODO marker so the operator cannot accidentally treat the
      // stub as a real recording.
      expect(text).toMatch(/TODO/);
    }
  });

  it("writeTaskFidelityTemplate emits the template under the iteration dir", async () => {
    const iterDir = path.join(dir, ".qfai", "evidence", "prototyping", "iter-00");
    await mkdir(iterDir, { recursive: true });
    const written = await writeTaskFidelityTemplate(iterDir);
    expect(written.path).toBe(path.join(iterDir, "task-fidelity-template.md"));
    const text = await readFile(written.path, "utf-8");
    for (const keyword of TASK_FIDELITY_REQUIRED_KEYWORDS) {
      expect(text).toContain(keyword);
    }
  });

  it("writeTaskFidelityTemplate is idempotent and overwrites by default", async () => {
    const iterDir = path.join(dir, ".qfai", "evidence", "prototyping", "iter-00");
    await mkdir(iterDir, { recursive: true });
    const first = await writeTaskFidelityTemplate(iterDir);
    const second = await writeTaskFidelityTemplate(iterDir);
    expect(second.path).toBe(first.path);
    const text = await readFile(second.path, "utf-8");
    expect(text).toContain("## taskFidelity");
  });
});
