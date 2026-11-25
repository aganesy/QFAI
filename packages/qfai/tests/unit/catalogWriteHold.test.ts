import { expect, it } from "vitest";

import { waitForCatalogueWriteHold } from "../helpers/catalogWriteHold.js";

const held = new Promise<void>(() => {
  // The writer never reaches the rename in these cases.
});

it("reports the exit code and diagnostic when a catalogue writer exits before the held rename", async () => {
  await expect(
    waitForCatalogueWriteHold(held, Promise.resolve(1), ["Could not write the catalogue.\n"]),
  ).rejects.toThrow(
    "Catalogue writer exited with code 1 before reaching the held rename.\nCould not write the catalogue.",
  );
}, 5_000);

it("preserves an unexpected catalogue writer rejection before the held rename", async () => {
  const error = new Error("Catalogue writer rejected.");
  await expect(waitForCatalogueWriteHold(held, Promise.reject(error), [])).rejects.toBe(error);
}, 5_000);
