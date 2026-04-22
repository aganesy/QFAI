import { describe, expect, it } from "vitest";

import { isConcreteArtifactRef } from "../../../src/core/artifacts/pathUtils.js";

describe("artifact path utils", () => {
  it("accepts canonical evidence refs", () => {
    expect(isConcreteArtifactRef(".qfai/evidence/render/orders.desktop.html")).toBe(true);
  });

  it("rejects empty refs", () => {
    expect(isConcreteArtifactRef("")).toBe(false);
  });
});
