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
        attribution: "Photo by Alice on Unsplash",
      },
      {
        url: "https://unsplash.com/photo/def",
        source: "unsplash",
        license: "free",
        attribution: "Photo by Bob on Unsplash",
      },
      {
        url: "https://pexels.com/photo/ghi",
        source: "pexels",
        license: "pexels-free",
        attribution: "Photo by Carol on Pexels",
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
        // Attribution provided so this entry is OK and aggregation
        // only surfaces the three intentionally bad entries below.
        attribution: "Photo by Alice on Unsplash",
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

// 10th-wave Fix G (codex r3265260657, P1): when the catalog declares
// `sourceHosts`, the URL host must match the per-source allowlist.
// QFAI:SPEC-0012:TC-0012-0411
describe("licenseVerify — per-source URL host binding (TC-0012-0411)", () => {
  const hostBoundCatalog: LicenseCatalog = {
    allowedSources: ["unsplash", "pexels"],
    licenseTiers: {
      unsplash: ["unsplash-license", "free"],
      pexels: ["pexels-free"],
    },
    sourceHosts: {
      unsplash: ["images.unsplash.com"],
      pexels: ["images.pexels.com"],
    },
  };

  it("rejects an unapproved host even when source label is allowlisted", () => {
    const sources: ImageSource[] = [
      {
        url: "https://unapproved.example/img.jpg",
        source: "unsplash",
        license: "free",
      },
    ];

    const result = licenseVerify(sources, hostBoundCatalog);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected non-ok result");
    }
    expect(result.errors).toEqual([
      {
        code: "license-host-mismatch",
        source: "unsplash",
        expectedHosts: ["images.unsplash.com"],
        url: "https://unapproved.example/img.jpg",
      },
    ]);
  });

  it("accepts a URL whose host is in the per-source allowlist", () => {
    const sources: ImageSource[] = [
      {
        url: "https://images.unsplash.com/photo/abc",
        source: "unsplash",
        license: "free",
        attribution: "Photo by Alice on Unsplash",
      },
    ];

    expect(licenseVerify(sources, hostBoundCatalog)).toEqual({ ok: true });
  });

  it("host comparison is case-insensitive", () => {
    const sources: ImageSource[] = [
      {
        url: "https://IMAGES.UNSPLASH.COM/photo/abc",
        source: "unsplash",
        license: "free",
        attribution: "Photo by Alice on Unsplash",
      },
    ];

    expect(licenseVerify(sources, hostBoundCatalog)).toEqual({ ok: true });
  });

  // 11th-wave Fix (codex r3265474144, P2): the catalog side is also
  // compared case-insensitively so a user catalog with a capitalized
  // host (e.g. `"Images.Unsplash.com"`) does not false-positive reject
  // a valid URL. RFC 3986 §3.2.2: host is case-insensitive.
  it("host comparison case-insensitive on the catalog side too", () => {
    const mixedCaseHostCatalog: LicenseCatalog = {
      allowedSources: ["unsplash"],
      licenseTiers: { unsplash: ["free"] },
      sourceHosts: {
        unsplash: ["Images.Unsplash.com"],
      },
    };
    const sources: ImageSource[] = [
      {
        url: "https://images.unsplash.com/photo/abc",
        source: "unsplash",
        license: "free",
        attribution: "Photo by Alice on Unsplash",
      },
    ];

    expect(licenseVerify(sources, mixedCaseHostCatalog)).toEqual({ ok: true });
  });
});

// 10th-wave Fix G backward-compat: catalogs that pre-date the
// `sourceHosts` field continue to work — the host check is skipped.
// QFAI:SPEC-0012:TC-0012-0412
describe("licenseVerify — backward compat: catalog without sourceHosts (TC-0012-0412)", () => {
  it("does not run the host check when sourceHosts is undefined", () => {
    // No `sourceHosts` key — every URL on an allowlisted source +
    // known tier should pass, regardless of host.
    const sources: ImageSource[] = [
      {
        url: "https://arbitrary.example/img.jpg",
        source: "unsplash",
        license: "free",
        attribution: "Photo by Alice on Unsplash",
      },
    ];

    expect(licenseVerify(sources, catalog)).toEqual({ ok: true });
  });
});

// 11th-wave Fix (codex r3265482144, P2): attribution is required at the
// runtime license gate. Undefined and empty-string both surface as the
// new `license-missing-attribution` error → exit 66 per the CLI
// contract's exit-code class table.
// QFAI:SPEC-0012:TC-0012-0414
describe("licenseVerify — attribution is required (TC-0012-0414)", () => {
  it("emits license-missing-attribution when attribution is undefined", () => {
    const sources: ImageSource[] = [
      {
        url: "https://unsplash.com/photo/abc",
        source: "unsplash",
        license: "free",
        // attribution intentionally omitted
      },
    ];

    const result = licenseVerify(sources, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected non-ok result");
    }
    expect(result.errors).toEqual([
      {
        code: "license-missing-attribution",
        source: "unsplash",
        url: "https://unsplash.com/photo/abc",
      },
    ]);
  });

  it("emits license-missing-attribution when attribution is empty string", () => {
    const sources: ImageSource[] = [
      {
        url: "https://unsplash.com/photo/abc",
        source: "unsplash",
        license: "free",
        attribution: "",
      },
    ];

    const result = licenseVerify(sources, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected non-ok result");
    }
    expect(result.errors).toEqual([
      {
        code: "license-missing-attribution",
        source: "unsplash",
        url: "https://unsplash.com/photo/abc",
      },
    ]);
  });

  // 14th-wave Fix (codex r3269193005, MINOR): whitespace-only attribution
  // (spaces / tabs / newlines / ideographic-space) is semantically the
  // same class as "missing"; pre-fix the gate only rejected `undefined`
  // / empty-string and let `"   "` slip through.
  it.each([
    ["spaces", "   "],
    ["tab + newline", "\t\n"],
    ["mixed whitespace", " \t \n "],
    ["ideographic space (U+3000)", "　"],
  ])(
    "emits license-missing-attribution when attribution is whitespace-only (%s)",
    (_label, attribution) => {
      const sources: ImageSource[] = [
        {
          url: "https://unsplash.com/photo/abc",
          source: "unsplash",
          license: "free",
          attribution,
        },
      ];

      const result = licenseVerify(sources, catalog);
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("expected non-ok result");
      }
      expect(result.errors).toEqual([
        {
          code: "license-missing-attribution",
          source: "unsplash",
          url: "https://unsplash.com/photo/abc",
        },
      ]);
    },
  );
});
