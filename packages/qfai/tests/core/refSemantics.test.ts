import { describe, expect, it } from "vitest";

import {
  isCanonicalScreenContractRef,
  isSpecDeclarationRef,
} from "../../src/core/refs/refSemantics.js";

describe("isSpecDeclarationRef (rev11 canonical grammar)", () => {
  it("accepts `.qfai/specs/<specId>/01_Spec.md#L<line>`", () => {
    expect(isSpecDeclarationRef(".qfai/specs/spec-0001/01_Spec.md#L14")).toBe(true);
    expect(isSpecDeclarationRef(".qfai/specs/spec-0001/01_Spec.md#L1")).toBe(true);
    expect(isSpecDeclarationRef(".qfai/specs/spec-0123/01_Spec.md#L1234")).toBe(true);
  });

  it("rejects anchor-fragment form on 01_Spec.md", () => {
    expect(isSpecDeclarationRef(".qfai/specs/spec-0001/01_Spec.md#route-home")).toBe(false);
  });

  it("rejects L0 / negative / non-positive line numbers", () => {
    expect(isSpecDeclarationRef(".qfai/specs/spec-0001/01_Spec.md#L0")).toBe(false);
    expect(isSpecDeclarationRef(".qfai/specs/spec-0001/01_Spec.md#L-1")).toBe(false);
  });

  it("rejects notes.md / appendix.md inside specs/", () => {
    expect(isSpecDeclarationRef(".qfai/specs/spec-0001/notes.md#L10")).toBe(false);
    expect(isSpecDeclarationRef(".qfai/specs/spec-0001/appendix.md#L3")).toBe(false);
  });

  it("rejects discussion refs", () => {
    expect(isSpecDeclarationRef(".qfai/discussion/pack-1/uiux/33_exploration_rubric.md#L12")).toBe(
      false,
    );
  });

  it("rejects canonical screen contract refs", () => {
    expect(
      isSpecDeclarationRef(".qfai/discussion/pack-1/uiux/40_screen_contracts.md#dashboard"),
    ).toBe(false);
  });

  it("rejects absolute paths", () => {
    expect(isSpecDeclarationRef("/abs/specs/spec-0001/01_Spec.md#L14")).toBe(false);
  });

  it("rejects refs outside .qfai/specs", () => {
    expect(isSpecDeclarationRef(".qfai/evidence/prototyping.json#/specCoverage")).toBe(false);
  });

  it("rejects nested sub-directory paths", () => {
    expect(isSpecDeclarationRef(".qfai/specs/spec-0001/sub/01_Spec.md#L14")).toBe(false);
  });
});

describe("isCanonicalScreenContractRef", () => {
  it("accepts canonical slug-form anchor", () => {
    expect(
      isCanonicalScreenContractRef(".qfai/discussion/pack-1/uiux/40_screen_contracts.md#dashboard"),
    ).toBe(true);
  });

  it("accepts canonical refs under a configured discussionDir", () => {
    expect(
      isCanonicalScreenContractRef(
        ".qfai/discussion-alt/pack-1/uiux/40_screen_contracts.md#dashboard",
        ".qfai/discussion-alt",
      ),
    ).toBe(true);
  });

  it("rejects legacy `#screen:<slug>` form", () => {
    expect(
      isCanonicalScreenContractRef(
        ".qfai/discussion/pack-1/uiux/40_screen_contracts.md#screen:dashboard",
      ),
    ).toBe(false);
  });

  it("rejects spec declaration refs", () => {
    expect(isCanonicalScreenContractRef(".qfai/specs/spec-0001/01_Spec.md#L14")).toBe(false);
  });

  it("rejects JSON pointer refs", () => {
    expect(isCanonicalScreenContractRef(".qfai/evidence/render.json#/screens/0")).toBe(false);
  });
});
