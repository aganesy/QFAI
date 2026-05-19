/**
 * Tests for prototype image-license verification.
 */
import { describe, expect, it } from "vitest";

import {
  licenseVerify,
  type ImageSource,
  type LicenseCatalog,
} from "../../../src/core/prototyping/licenseVerify.js";

const catalog: LicenseCatalog = {
  allowedSources: ["unsplash", "pexels"],
  licenseTiers: {
    unsplash: ["unsplash-license", "free"],
    pexels: ["pexels-free"],
  },
};

describe("licenseVerify — allow-listed sources + tier match", () => {
  // QFAI:SPEC-0012:TC-0012-0370
  it("returns ok when every entry has an allow-listed source and a known license tier", () => {
    const sources: ImageSource[] = [
      {
        url: "https://unsplash.com/photo/abc",
        source: "unsplash",
        license: "unsplash-license",
      },
      {
        url: "https://unsplash.com/photo/def",
        source: "unsplash",
        license: "free",
      },
      {
        url: "https://pexels.com/photo/ghi",
        source: "pexels",
        license: "pexels-free",
      },
    ];

    expect(licenseVerify(sources, catalog)).toEqual({ ok: true });
  });

  // QFAI:SPEC-0012:TC-0012-0370
  it("returns ok on empty input (no entries to validate)", () => {
    expect(licenseVerify([], catalog)).toEqual({ ok: true });
  });
});

describe("licenseVerify — rejects non-allow-listed sources and unknown tiers", () => {
  // QFAI:SPEC-0012:TC-0012-0395
  it("emits license-not-allowlisted for sources outside the frozen allowlist", () => {
    const sources: ImageSource[] = [
      {
        url: "https://pinterest.com/pin/123",
        source: "pinterest",
        license: "pinterest-public",
      },
    ];

    const result = licenseVerify(sources, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected non-ok result");
    }
    expect(result.errors).toEqual([
      {
        code: "license-not-allowlisted",
        source: "pinterest",
        url: "https://pinterest.com/pin/123",
      },
    ]);
  });

  // QFAI:SPEC-0012:TC-0012-0395
  it("emits license-tier-unknown when source is allowed but license is not registered for it", () => {
    const sources: ImageSource[] = [
      {
        url: "https://unsplash.com/photo/xyz",
        source: "unsplash",
        license: "cc0-mystery",
      },
    ];

    const result = licenseVerify(sources, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected non-ok result");
    }
    expect(result.errors).toEqual([
      {
        code: "license-tier-unknown",
        source: "unsplash",
        license: "cc0-mystery",
        url: "https://unsplash.com/photo/xyz",
      },
    ]);
  });

  // QFAI:SPEC-0012:TC-0012-0395
  it("aggregates every offending entry without short-circuiting", () => {
    const sources: ImageSource[] = [
      {
        url: "https://unsplash.com/photo/ok",
        source: "unsplash",
        license: "free",
      },
      {
        url: "https://pinterest.com/pin/1",
        source: "pinterest",
        license: "whatever",
      },
      {
        url: "https://unsplash.com/photo/bad-tier",
        source: "unsplash",
        license: "weird-tier",
      },
      {
        url: "https://flickr.com/photo/2",
        source: "flickr",
        license: "cc-by",
      },
    ];

    const result = licenseVerify(sources, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected non-ok result");
    }
    expect(result.errors).toEqual([
      {
        code: "license-not-allowlisted",
        source: "pinterest",
        url: "https://pinterest.com/pin/1",
      },
      {
        code: "license-tier-unknown",
        source: "unsplash",
        license: "weird-tier",
        url: "https://unsplash.com/photo/bad-tier",
      },
      {
        code: "license-not-allowlisted",
        source: "flickr",
        url: "https://flickr.com/photo/2",
      },
    ]);
  });
});

describe("licenseVerify — non-https URL guard", () => {
  // Contract: hard-stop class (3) license-verify failure includes
  // non-HTTPS URLs. Plain `http://` URLs must be rejected even when
  // the host is on the allowlist and the license is registered.
  it("emits license-non-https-url for plain http URLs even on allowlisted sources", () => {
    const sources: ImageSource[] = [
      {
        url: "http://unsplash.com/photo/insecure",
        source: "unsplash",
        license: "free",
      },
    ];

    const result = licenseVerify(sources, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected non-ok result");
    }
    expect(result.errors).toEqual([
      {
        code: "license-non-https-url",
        source: "unsplash",
        url: "http://unsplash.com/photo/insecure",
      },
    ]);
  });

  it("emits license-non-https-url for malformed URL strings", () => {
    const sources: ImageSource[] = [
      {
        url: "not-a-url",
        source: "unsplash",
        license: "free",
      },
    ];

    const result = licenseVerify(sources, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected non-ok result");
    }
    expect(result.errors).toEqual([
      {
        code: "license-non-https-url",
        source: "unsplash",
        url: "not-a-url",
      },
    ]);
  });

  it("non-https guard runs BEFORE source allowlist (most actionable diagnostic first)", () => {
    const sources: ImageSource[] = [
      {
        url: "http://pinterest.com/pin/insecure",
        source: "pinterest",
        license: "whatever",
      },
    ];

    const result = licenseVerify(sources, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected non-ok result");
    }
    // Single non-https error — not a non-allowlisted error too.
    expect(result.errors).toEqual([
      {
        code: "license-non-https-url",
        source: "pinterest",
        url: "http://pinterest.com/pin/insecure",
      },
    ]);
  });
});
