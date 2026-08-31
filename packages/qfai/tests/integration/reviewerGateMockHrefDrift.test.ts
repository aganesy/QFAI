/**
 * Integration: R-MOCK-HREF-DRIFT emission (Pair V).
 *
 * SSOT-sync pair: the discussion mock template (anchor-form default)
 * ↔ the QFAI-MOCK-010 validator (strict; `/path/` rejected). When one
 * side is edited without the matching update to the other — e.g. the
 * template is switched to same-origin absolute `/path/` form while the
 * validator stays strict — the finding R-MOCK-HREF-DRIFT (severity
 * error) fires naming the asymmetric edit with a 3-part justification
 * (modified file, un-paired counterpart, clause).
 *
 * The drift check is detectMockHrefDrift, invoked from the prototyping
 * profile (runPrototypingValidators), because the surface it guards (the
 * mock template + QFAI-MOCK-010) runs under prototyping/full — not sdd.
 * The pair-sync check applies only when both source files exist
 * (consumer repos installing the npm package lack the validator
 * source, so the contract cannot drift there).
 */
// QFAI:SPEC-0010:TC-0010-0011

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detectMockHrefDrift } from "../../src/core/validators/reviewerGate.js";
import { validateProject } from "../../src/core/validate.js";
import {
  MOCK_HREF_TEMPLATE_REL,
  MOCK_HREF_VALIDATOR_REL,
} from "../../src/core/validators/mockHrefPairs.js";

// Anchor-form template (the canonical, symmetric default).
const TEMPLATE_ANCHOR = `## Appendix: Screen Mock

\`\`\`html
<section class="screen-mock">
  <a href="#orders">View Orders</a>
</section>
\`\`\`
`;

// Drift form: same-origin absolute path. Validator stays strict.
const TEMPLATE_PATH_FORM = `## Appendix: Screen Mock

\`\`\`html
<section class="screen-mock">
  <a href="/orders/">View Orders</a>
</section>
\`\`\`
`;

// Strict validator (no `/path/`-accept clause). Mirrors the real
// htmlMockDom classification: bare same-origin paths fall through to
// result.localRefs.push(rawUrl) → QFAI-MOCK-010.
const VALIDATOR_STRICT = `// strict classifier
result.localRefs.push(rawUrl);
`;

// Broadened validator: explicitly accepts a leading-slash same-origin path.
const VALIDATOR_ACCEPTS_PATH = `// broadened classifier
if (/^\\//.test(rawUrl)) { continue; } // accept same-origin /path/
result.localRefs.push(rawUrl);
`;

async function newRoot(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "qfai-mock-href-drift-"));
}

async function seedPair(
  root: string,
  options: { template?: string; validator?: string } = {},
): Promise<void> {
  const templateAbs = path.join(root, MOCK_HREF_TEMPLATE_REL);
  const validatorAbs = path.join(root, MOCK_HREF_VALIDATOR_REL);
  await mkdir(path.dirname(templateAbs), { recursive: true });
  await mkdir(path.dirname(validatorAbs), { recursive: true });
  await writeFile(templateAbs, options.template ?? TEMPLATE_ANCHOR, "utf-8");
  await writeFile(validatorAbs, options.validator ?? VALIDATOR_STRICT, "utf-8");
}

let root: string;

beforeEach(async () => {
  root = await newRoot();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("TC-0010-0011: detectMockHrefDrift emits R-MOCK-HREF-DRIFT on template↔validator asymmetry", () => {
  it("does NOT fire when template is anchor-form and validator is strict (symmetric)", async () => {
    await seedPair(root, { template: TEMPLATE_ANCHOR, validator: VALIDATOR_STRICT });
    const issues = await detectMockHrefDrift(root);
    expect(issues.filter((i) => i.code === "R-MOCK-HREF-DRIFT")).toEqual([]);
  });

  it("does NOT fire when template uses /path/ and validator accepts /path/ (symmetric)", async () => {
    await seedPair(root, { template: TEMPLATE_PATH_FORM, validator: VALIDATOR_ACCEPTS_PATH });
    const issues = await detectMockHrefDrift(root);
    expect(issues.filter((i) => i.code === "R-MOCK-HREF-DRIFT")).toEqual([]);
  });

  it("fires at severity error when template switches to /path/ while validator stays strict (asymmetric)", async () => {
    await seedPair(root, { template: TEMPLATE_PATH_FORM, validator: VALIDATOR_STRICT });
    const issues = await detectMockHrefDrift(root);
    const findings = issues.filter((i) => i.code === "R-MOCK-HREF-DRIFT");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const f = findings[0];
    expect(f?.severity).toBe("error");
    // 3-part justification names modified file, un-paired counterpart, clause.
    expect(f?.message).toMatch(/03_Story-Workshop\.md/);
    expect(f?.message).toMatch(/htmlMockDom\.ts/);
    expect(f?.message).toMatch(/clause=/);
  });

  it("does not fire when either source file is absent (consumer repo without validator source)", async () => {
    // Only the template exists; validator source missing → no drift here.
    const templateAbs = path.join(root, MOCK_HREF_TEMPLATE_REL);
    await mkdir(path.dirname(templateAbs), { recursive: true });
    await writeFile(templateAbs, TEMPLATE_PATH_FORM, "utf-8");
    const issues = await detectMockHrefDrift(root);
    expect(issues.filter((i) => i.code === "R-MOCK-HREF-DRIFT")).toEqual([]);
  });
});

describe("TC-0010-0011: the prototyping profile surfaces R-MOCK-HREF-DRIFT exactly once (full does not double-fire)", () => {
  it("prototyping profile emits the asymmetric drift finding (user-facing contract)", async () => {
    await seedPair(root, { template: TEMPLATE_PATH_FORM, validator: VALIDATOR_STRICT });
    const result = await validateProject(root, undefined, { profile: "prototyping" });
    const findings = result.issues.filter((i) => i.code === "R-MOCK-HREF-DRIFT");
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe("error");
  });

  it("full profile emits the drift finding exactly once (no sdd+prototyping double-fire)", async () => {
    await seedPair(root, { template: TEMPLATE_PATH_FORM, validator: VALIDATOR_STRICT });
    const result = await validateProject(root, undefined, { profile: "full" });
    const findings = result.issues.filter((i) => i.code === "R-MOCK-HREF-DRIFT");
    expect(findings.length).toBe(1);
  });

  it("sdd profile no longer emits the drift finding (moved to prototyping surface)", async () => {
    await seedPair(root, { template: TEMPLATE_PATH_FORM, validator: VALIDATOR_STRICT });
    const result = await validateProject(root, undefined, { profile: "sdd" });
    expect(result.issues.filter((i) => i.code === "R-MOCK-HREF-DRIFT")).toEqual([]);
  });
});
