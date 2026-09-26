import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const skills = path.join(root, "packages/qfai/assets/init/.qfai/assistant/skill");
const read = (rel: string): Promise<string> => readFile(path.join(skills, rel), "utf-8");

describe("brand catalog ownership", () => {
  it("gives root DESIGN.md authoring to SDD for a visual surface", async () => {
    const discussion = await read("qfai-discussion/SKILL.md");
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    const sdd = await read("qfai-sdd/SKILL.md");
    expect(discussion).toContain("root `DESIGN.md` — is authored");
    expect(discussion).toContain("/qfai-sdd");
    expect(authoring).toContain("How `/qfai-sdd` writes the root `DESIGN.md`");
    expect(sdd).toContain("complete the root `DESIGN.md` and design-lock checks");
  });

  it("uses the adopted discussion direction as the brand input", async () => {
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    const discussion = await read("qfai-discussion/references/discussion-completion-matrix.md");
    expect(authoring).toContain("01_Context.md#Design Direction");
    expect(authoring).toContain("04_Sources.md");
    expect(discussion).toContain("03_contract` step authors root `DESIGN.md`");
  });

  it("does not invent a visual brand for a CLI-only target", async () => {
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    const sdd = await read("qfai-sdd/SKILL.md");
    expect(authoring).toContain("A cli-only target has no root");
    expect(sdd).toContain("A CLI-only surface does not require a visual brand lock");
  });

  it("routes brand archetype and interaction into supported fields", async () => {
    const catalog = await read("qfai-sdd/references/design-md-brand-catalog.md");
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    expect(catalog).toContain("brand.archetype");
    expect(catalog).toContain("accessibility.motion");
    expect(authoring).toContain("Brand archetype → `brand.archetype`");
    expect(authoring).toContain("`visual.interaction` key fails DESIGN.md validation");
  });

  it("uses a deterministic tie-break from recorded input", async () => {
    const catalog = await read("qfai-sdd/references/design-md-brand-catalog.md");
    expect(catalog).toContain("brand.voice");
    expect(catalog).toContain("audience.emotion");
    expect(catalog).toContain("audience.do_not_look_like");
    expect(catalog).toContain("alphabetical archetype name");
    expect(catalog).not.toContain("visual-theme weight wins");
  });
});
