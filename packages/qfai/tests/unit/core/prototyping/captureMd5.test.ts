/**
 * captureMd5 determinism (NFR-0113).
 *
 * Pure-function unit: `md5Buffer` over a fixed PNG byte buffer MUST
 * produce identical output across 100 invocations. Independent of
 * the integration `lap-009` test (TC-0012-0453).
 */

import { describe, expect, it } from "vitest";

import { md5Buffer } from "../../../../src/core/prototyping/captureMd5.js";

describe("md5Buffer determinism", () => {
  it("returns identical hex digest across 100 invocations on the same input", () => {
    // Synthetic PNG-shaped buffer: PNG signature + IHDR start.
    const fixture = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0xde, 0xad, 0xbe, 0xef, 0xca, 0xfe, 0xba, 0xbe, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    ]);

    const digests = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      digests.add(md5Buffer(fixture));
    }
    expect(digests.size).toBe(1);
    const [only] = [...digests];
    // 32-character lowercase hex digest.
    expect(only).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns different digests for different inputs", () => {
    const a = Buffer.from([0x00, 0x01]);
    const b = Buffer.from([0x00, 0x02]);
    expect(md5Buffer(a)).not.toBe(md5Buffer(b));
  });
});
