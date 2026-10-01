import { describe, expect, it } from "vitest";

import {
  readLegacyRoutingDigests,
  routingEntryDigest,
} from "../../../../src/migration/specToStory/legacyRoutingDigests.js";
import {
  earlierLegacyRoutingEntries,
  legacyRoutingEntries,
} from "../../../helpers/legacyRouting.js";

describe("legacy routing digests", () => {
  it("gives one digest to entries that differ only in key order", () => {
    const first = { skill: "a", phases: [{ id: "x", rerun_policy: "y" }], review_profile: "p" };
    const second = { review_profile: "p", phases: [{ rerun_policy: "y", id: "x" }], skill: "a" };
    expect(routingEntryDigest(first)).toBe(routingEntryDigest(second));
  });

  it("gives another digest when a list changes its order or the name changes", () => {
    const entry = { skill: "a", agents: ["one", "two"] };
    expect(routingEntryDigest({ ...entry, agents: ["two", "one"] })).not.toBe(
      routingEntryDigest(entry),
    );
    expect(routingEntryDigest({ ...entry, skill: "b" })).not.toBe(routingEntryDigest(entry));
  });

  it("holds sha256 digests that recognise every entry of the last 1.x manifest", async () => {
    const digests = await readLegacyRoutingDigests();
    for (const digest of digests) expect(digest).toMatch(/^[0-9a-f]{64}$/);
    for (const entry of await legacyRoutingEntries())
      expect(digests.has(routingEntryDigest(entry))).toBe(true);
  });

  it("holds exactly the digests of every entry the 1.x releases shipped", async () => {
    const shipped = [...(await legacyRoutingEntries()), ...(await earlierLegacyRoutingEntries())];
    const recomputed = new Set(shipped.map(routingEntryDigest));
    expect([...(await readLegacyRoutingDigests())].sort()).toEqual([...recomputed].sort());
  });
});
