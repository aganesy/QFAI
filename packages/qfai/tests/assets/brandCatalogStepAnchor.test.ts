import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readDiscussionSkill } from "../helpers/discussionSteps.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const skills = path.join(root, "packages/qfai/assets/init/.qfai/assistant/skill");
const read = (rel: string): Promise<string> => readFile(path.join(skills, rel), "utf-8");
const readStep = async (name: string): Promise<string> =>
  (await readFile(path.join(skills, "..", "step", name, "STEP.md"), "utf-8")).replace(/\s+/g, " ");

describe("brand catalog ownership", () => {
  it("gives root DESIGN.md authoring to SDD for a visual surface", async () => {
    const discussion = (await readDiscussionSkill(path.dirname(skills))).replace(/\s+/g, " ");
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    const sdd = await readStep("sdd-contract");
    expect(discussion).toContain("root `DESIGN.md` — is authored");
    expect(discussion).toContain("/qfai-sdd");
    expect(authoring).toContain("How `/qfai-sdd` writes the root `DESIGN.md`");
    expect(sdd).toContain("root `DESIGN.md` and its lock, which `common-design-md`");
  });

  it("uses the adopted discussion direction as the brand input", async () => {
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    const discussion = await read("qfai-discussion/references/discussion-completion-matrix.md");
    expect(authoring).toContain("01_Context.md#Design Direction");
    expect(authoring).toContain("04_Sources.md");
    expect(discussion).toContain("common-design-md` step authors root `DESIGN.md`");
  });

  it("does not invent a visual brand for a CLI-only target", async () => {
    const authoring = await read("qfai-sdd/references/design-md-authoring.md");
    const sdd = await readStep("sdd-contract");
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
