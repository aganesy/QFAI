import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { removeOwnedDirs } from "../helpers/shippedWorkflowFixtures.js";

describe("removeOwnedDirs", () => {
  it("removes every directory recursively when all removals succeed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-removeowned-"));
    try {
      const first = path.join(root, "first");
      const second = path.join(root, "second");
      await mkdir(path.join(first, "nested"), { recursive: true });
      await mkdir(second);

      await removeOwnedDirs([first, second]);

      await expect(stat(first)).rejects.toThrow();
      await expect(stat(second)).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("attempts every removal and reports each rejected path with its cause", async () => {
    const attempted: string[] = [];
    const remove = (dir: string): Promise<void> => {
      attempted.push(dir);
      if (dir === "dir-a" || dir === "dir-c") {
        return Promise.reject(new Error(`denied ${dir}`));
      }
      return Promise.resolve();
    };

    const failure: unknown = await removeOwnedDirs(["dir-a", "dir-b", "dir-c"], remove).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(attempted).toEqual(["dir-a", "dir-b", "dir-c"]);
    expect(failure).toBeInstanceOf(AggregateError);
    const message = failure instanceof Error ? failure.message : "";
    expect(message).toContain("dir-a: denied dir-a");
    expect(message).toContain("dir-c: denied dir-c");
    expect(message).not.toContain("dir-b");
    if (failure instanceof AggregateError) {
      expect(failure.errors).toHaveLength(2);
    }
  });

  it("reports a non-Error rejection by its string form", async () => {
    const failure: unknown = await removeOwnedDirs(["dir-x"], () => Promise.reject("busy")).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(failure instanceof Error ? failure.message : "").toContain("dir-x: busy");
  });
});
