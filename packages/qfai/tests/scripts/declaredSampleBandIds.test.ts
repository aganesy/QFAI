/**
 * The sample-band IDs this repository declares, which the distributed-surface
 * guards reject in a shipped file.
 */
import { describe, expect, it } from "vitest";

import {
  declaredSampleBandIds,
  declaredSampleBandPattern,
  repoRootFromHere,
} from "../../scripts/lib/declared-sample-band-ids.mjs";

describe("declaredSampleBandIds", () => {
  const root = repoRootFromHere();

  it("lists the business rules and contract names the spec tree declares inside the band", () => {
    const { businessRules, contractNames } = declaredSampleBandIds(root);
    expect(businessRules).toContain("BR-0001-0001");
    expect(businessRules).not.toContain("BR-0006-0001");
    expect(businessRules).not.toContain("BR-0010-0001");
    expect(contractNames).toContain("cli-0009-qfai-init");
    expect(contractNames).not.toContain("cli-0010-qfai-migration-v1-to-v2");
  });

  // QFAI:EX-0002-0009-04
  // QFAI:EX-0002-0009-05
  it("matches a declared ID and leaves an undeclared one", () => {
    const pattern = declaredSampleBandPattern(root);
    expect(pattern).not.toBeNull();
    const re = new RegExp(pattern ?? "");
    expect(re.test("see BR-0001-0001 for the rule")).toBe(true);
    expect(re.test("see BR-0006-0001 for the rule")).toBe(false);
    expect(re.test("contracts/cli/cli-0009-qfai-init.md")).toBe(true);
    expect(re.test("contracts/cli/cli-0009-checkout.md")).toBe(false);
    expect(re.test("sub-cli-0009-qfai-init")).toBe(false);
    expect(re.test("cli-0009-qfai-init-extra")).toBe(false);
  });

  it("finds nothing when there is no spec tree", () => {
    expect(declaredSampleBandIds(root + "-missing")).toEqual({
      businessRules: [],
      contractNames: [],
    });
    expect(declaredSampleBandPattern(root + "-missing")).toBeNull();
  });
});
