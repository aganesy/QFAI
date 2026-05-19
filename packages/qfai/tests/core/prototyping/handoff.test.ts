import { describe, expect, it } from "vitest";
import {
  IMAGE_SOURCE_REQUIRED_FIELDS,
  validateImageSources,
  type ImageSourceField,
} from "../../../src/core/prototyping/handoff.js";

const fullEntry = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  url: "https://images.unsplash.com/photo-1",
  license: "unsplash-license",
  attribution: "Photo by Jane Doe on Unsplash",
  source: "unsplash",
  ...overrides,
});

// QFAI:SPEC-0012:TC-0012-0372
describe("validateImageSources — closed schema (TC-0012-0372)", () => {
  it("accepts an array of fully-populated entries", () => {
    const result = validateImageSources([fullEntry(), fullEntry({ source: "pexels" })]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toEqual({
      url: "https://images.unsplash.com/photo-1",
      license: "unsplash-license",
      attribution: "Photo by Jane Doe on Unsplash",
      source: "unsplash",
    });
    expect(result.entries[1]?.source).toBe("pexels");
  });

  it.each(IMAGE_SOURCE_REQUIRED_FIELDS as readonly ImageSourceField[])(
    "rejects when '%s' is missing with a named-field error",
    (field) => {
      const entry = fullEntry();
      delete entry[field];
      const result = validateImageSources([entry]);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContain(`imageSources[0].${field} is required`);
    },
  );

  it.each(IMAGE_SOURCE_REQUIRED_FIELDS as readonly ImageSourceField[])(
    "rejects when '%s' is present but non-string",
    (field) => {
      const result = validateImageSources([fullEntry({ [field]: 42 })]);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContain(`imageSources[0].${field} must be a string`);
    },
  );

  it("aggregates errors across multiple offending entries (no early return)", () => {
    const entry0 = fullEntry();
    delete entry0.url;
    const entry1 = fullEntry();
    delete entry1.source;
    delete entry1.license;
    const result = validateImageSources([entry0, entry1]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("imageSources[0].url is required");
    expect(result.errors).toContain("imageSources[1].source is required");
    expect(result.errors).toContain("imageSources[1].license is required");
  });

  it("rejects extra fields with a named-field error", () => {
    const result = validateImageSources([fullEntry({ extraneous: "x" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /imageSources\[0\] has unknown field: extraneous/.test(e))).toBe(
      true,
    );
  });

  it("rejects when input is not an array", () => {
    const result = validateImageSources({ url: "x" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("imageSources must be an array");
  });

  it("rejects entries that are not objects", () => {
    const result = validateImageSources(["not-an-object"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("imageSources[0] must be an object");
  });

  it("accepts an empty array (no imageSources to validate)", () => {
    const result = validateImageSources([]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toEqual([]);
  });
});
