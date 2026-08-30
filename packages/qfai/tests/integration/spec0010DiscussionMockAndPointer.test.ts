/**
 * Integration: spec-0010 CHG-006 — mock anchor-form href validation
 * (QFAI-MOCK-010 anchor/external PASS, same-origin /path/ FAIL,
 * template↔validator asymmetry R-MOCK-HREF-DRIFT) and the discussion
 * active-session pointer (currentId round-trip + ambiguous/absent recovery
 * error). Deterministic: each case builds a temp fixture and exercises the
 * production functions directly (no reliance on repo live state or a
 * rebuilt dist binary).
 */
// QFAI:SPEC-0010:TC-0010-0009
// QFAI:SPEC-0010:TC-0010-0010
// QFAI:SPEC-0010:TC-0010-0011
// QFAI:SPEC-0010:TC-0010-0012
// QFAI:SPEC-0010:TC-0010-0013

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseHtmlMock } from "../../src/core/uiux/htmlMockDom.js";
import { validateProject } from "../../src/core/validate.js";
import {
  MOCK_HREF_TEMPLATE_REL,
  MOCK_HREF_VALIDATOR_REL,
} from "../../src/core/validators/mockHrefPairs.js";
import { runDiscussion } from "../../src/cli/commands/discussion.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0010-int-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("spec-0010 mock anchor-form hrefs CHG-006", () => {
  it("TC-0010-0009 — #anchor and external http(s) hrefs both PASS QFAI-MOCK-010 (normal)", async () => {
    const anchor = await parseHtmlMock('<a href="#orders">Orders</a>');
    const external = await parseHtmlMock('<a href="https://x.test/">External</a>');
    expect(anchor.localRefs).toEqual([]);
    expect(external.localRefs).toEqual([]);
  });

  it("TC-0010-0010 — same-origin absolute /path/ href FAILS QFAI-MOCK-010; validator not broadened (error)", async () => {
    const result = await parseHtmlMock('<a href="/orders/">Orders</a>');
    expect(result.localRefs).toContain("/orders/");
  });

  it("TC-0010-0011 — template edited to /path/ form while validator stays strict fires R-MOCK-HREF-DRIFT at error severity under the prototyping profile (error)", async () => {
    const templateAbs = path.join(root, MOCK_HREF_TEMPLATE_REL);
    const validatorAbs = path.join(root, MOCK_HREF_VALIDATOR_REL);
    await mkdir(path.dirname(templateAbs), { recursive: true });
    await mkdir(path.dirname(validatorAbs), { recursive: true });
    // Template drifted to same-origin absolute form; validator stays strict.
    await writeFile(templateAbs, '<a href="/orders/">Orders</a>\n', "utf-8");
    await writeFile(validatorAbs, "result.localRefs.push(rawUrl);\n", "utf-8");

    // Exercise the user-facing prototyping-profile contract: `qfai validate
    // --profile prototyping` must surface R-MOCK-HREF-DRIFT.
    const result = await validateProject(root, undefined, { profile: "prototyping" });
    const drift = result.issues.find((i) => i.code === "R-MOCK-HREF-DRIFT");
    expect(drift?.severity).toBe("error");
  });
});

describe("spec-0010 discussion active pointer CHG-006", () => {
  async function makePack(id: string): Promise<void> {
    await mkdir(path.join(root, ".qfai", "discussion", id), { recursive: true });
  }

  it("TC-0010-0012 — finalized pack sets state.json#discussion.currentId; discussion list --active reads it (normal)", async () => {
    await makePack("discussion-20260527075558258");
    await runDiscussion({
      root,
      action: "use",
      id: "discussion-20260527075558258",
      write: () => {},
      writeErr: () => {},
    });
    const out: string[] = [];
    const code = await runDiscussion({
      root,
      action: "list",
      active: true,
      format: "json",
      write: (m) => out.push(m),
      writeErr: () => {},
    });
    expect(code).toBe(0);
    const body = JSON.parse(out.join("\n")) as { currentId?: string };
    expect(body.currentId).toBe("discussion-20260527075558258");
  });

  it("TC-0010-0013 — absent currentId with multiple candidate dirs yields a recovery error naming candidates + `qfai discussion use <id>`; no mtime inference (boundary)", async () => {
    await makePack("discussion-20260101000000000");
    await makePack("discussion-20260202000000000");
    await makePack("discussion-20260303000000000");
    const out: string[] = [];
    const err: string[] = [];
    const code = await runDiscussion({
      root,
      action: "list",
      active: true,
      format: "json",
      write: (m) => out.push(m),
      writeErr: (m) => err.push(m),
    });
    expect(code).not.toBe(0);
    const combined = out.join("\n") + err.join("\n");
    expect(combined).toMatch(/discussion-20260202000000000/);
    expect(combined).toMatch(/qfai discussion use <id>/);
  });
});
