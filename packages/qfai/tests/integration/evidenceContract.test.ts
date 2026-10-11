import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, link, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";
import { readImplementFlowSteps } from "../helpers/implementSteps.js";
import { flat, sectionOf as shippedSectionOf } from "../helpers/shippedAssistant.js";
import { removeTempTree } from "../helpers/tempTree.js";

async function readSkill(): Promise<string> {
  return readImplementFlowSteps(path.join(getInitAssetsDir(), ".qfai", "assistant"));
}

describe("implementation evidence contract", () => {
  it("does not accept an unevidenced status or reasoning as proof of a gate", async () => {
    const skill = await readSkill();
    expect(skill).toMatch(/Evidence without a command and result pair does not prove a\s+gate/);
    expect(skill).toMatch(/A failing or unrun gate cannot be reported as PASS/);
    expect(skill).toMatch(/when its RED, GREEN and Refactor results are\s+observed and recorded/);
  });
});

const DELIVERY_GUIDE = "skill/qfai-run/references/evidence-delivery.md";

async function deliveryGuide(): Promise<string> {
  const file = path.join(getInitAssetsDir(), ".qfai", "assistant", ...DELIVERY_GUIDE.split("/"));
  expect(existsSync(file), "The shipped evidence delivery guide exists").toBe(true);
  return readFile(file, "utf-8");
}

async function deliverySection(heading: string): Promise<string> {
  const section = flat(shippedSectionOf(await deliveryGuide(), `## ${heading}`));
  expect(section, `Evidence delivery has ${heading}`).not.toBe("");
  return section;
}

// QFAI:AC-0001-0224-11
describe("requested evidence delivery instructions", () => {
  // QFAI:EX-0001-0224-21
  it("requires an explicit byte inventory and independent receiving proof before session archive", async () => {
    const required = await deliverySection("When delivery is required");
    expect(required).toMatch(/request.*(?:handover|handoff|delivery).*archive/iu);
    expect(required).toMatch(/ordinary completion.*(?:no|not).*unsolicited upload/iu);
    const index = await deliverySection("Identity and the ignored index");
    for (const information of [/target/iu, /scope/iu, /relative/iu, /byte/iu, /SHA-256/iu]) {
      expect(index).toMatch(information);
    }
    expect(index).toMatch(/ignored.*(?:index|receipt)/iu);
    const receiver = await deliverySection("Independent receiver");
    expect(receiver).toMatch(/independent.*(?:retrieve|download)/iu);
    expect(receiver).toMatch(/(?:every|each).*required item/iu);
    expect(receiver).toMatch(/trusted expected triples/iu);
    expect(await deliverySection("Retained storage and receipt")).toMatch(
      /every required size\/digest result/iu,
    );
    expect(receiver).toMatch(/exact.*member/iu);
  });

  // QFAI:EX-0001-0224-22
  it("keeps unobserved historical execution unknown without fabricating verification", async () => {
    const index = await deliverySection("Identity and the ignored index");
    for (const information of [
      /repository/iu,
      /source/iu,
      /build/iu,
      /command/iu,
      /argv/iu,
      /cwd/iu,
      /runtime/iu,
      /time/iu,
    ]) {
      expect(index).toMatch(information);
    }
    expect(index).toMatch(/(?:historical|execution).*unknown/iu);
    expect(index).toMatch(/unknown.*(?:cannot|does not|not).*verification/iu);
    expect(index).toMatch(/(?:observed|actually executed)/iu);
  });

  // QFAI:EX-0001-0224-23
  it("refuses unknown required identity and does not trust an index to authenticate itself", async () => {
    const index = await deliverySection("Identity and the ignored index");
    expect(index).toMatch(/expected byte length.*SHA-256 digest/iu);
    expect(index).toMatch(/required.*identity.*UNKNOWN.*refuses delivery/iu);
    const receiver = await deliverySection("Independent receiver");
    expect(index).toMatch(/trusted.*outside.*bundle/iu);
    expect(receiver).toMatch(/trusted.*separate authorized channel/iu);
    expect(receiver).toMatch(/(?:source|archive).*identity/iu);
    expect(index).toMatch(/downloaded index cannot establish its own/iu);
    const failure = await deliverySection("Failure and proof limits");
    expect(failure).toMatch(/unknown.*(?:required|identity)/iu);
    expect(failure).toMatch(/(?:stop|incomplete).*resume/iu);
    expect(failure).toMatch(/(?:retain|keep).*original/iu);
  });

  // QFAI:EX-0001-0224-24
  it("checks explicit regular source and staged selections using one published preflight", async () => {
    const selection = await deliverySection("Selection and privacy");
    expect(selection).toMatch(/only the files needed.*canonical relative name/iu);
    expect(selection).toMatch(/explicit selection.*non-regular/iu);
    expect(selection).toMatch(/(?:no|never|do not).*whole.*(?:checkout|directory)/iu);
    const guide = await deliveryGuide();
    const preflight = flat(shippedSectionOf(guide, "## Native preflight"));
    expect(preflight).toMatch(/same block.*trusted expected triples.*source.*staged.*receiver/iu);
    expect([...guide.matchAll(/^```js\r?\n([\s\S]*?)^```/gmu)]).toHaveLength(1);
  });

  // QFAI:EX-0001-0224-25
  it("compares staged identity immediately before archive without promising an atomic snapshot", async () => {
    const archive = await deliverySection("Copy and archive");
    expect(archive).toMatch(
      /(?:check|preflight).*stag(?:ed|ing).*immediately before.*(?:tar|archive)/iu,
    );
    expect(archive).toMatch(/(?:change|mismatch).*stop|stop.*(?:change|mismatch)/iu);
    expect(archive).toMatch(/do not decode.*normalize.*binary.*LF.*CRLF/iu);
    expect(archive).toMatch(/exact expected member set/iu);
    const limits = await deliverySection("Failure and proof limits");
    expect(limits).toMatch(/(?:neither|no|not).*atomic/iu);
    expect(limits).toMatch(/(?:retain|keep).*original/iu);
  });

  // QFAI:EX-0001-0224-26
  it("keeps stale source or missing current evidence blocked with an owner and resume condition", async () => {
    const index = await deliverySection("Identity and the ignored index");
    expect(index).toMatch(/(?:current|required).*inventory/iu);
    const failure = await deliverySection("Failure and proof limits");
    expect(index).toMatch(/stale index.*stops delivery/iu);
    expect(failure).toMatch(/missing/iu);
    expect(failure).toMatch(/owner/iu);
    expect(failure).toMatch(/resume/iu);
    expect(failure).toMatch(/stop.*delivery and archive/iu);
  });

  // QFAI:EX-0001-0224-27
  it("requires storage authority, access and retention instead of treating a pointer as permission", async () => {
    const storage = await deliverySection("Retained storage and receipt");
    for (const condition of [
      /authority/iu,
      /access/iu,
      /retention/iu,
      /(?:recipient|receiving role)/iu,
    ]) {
      expect(storage).toMatch(condition);
    }
    expect(storage).toMatch(/(?:pointer|storage link).*grants none/iu);
    const failure = await deliverySection("Failure and proof limits");
    for (const blocker of [/denied/iu, /expired/iu, /unavailable/iu])
      expect(storage).toMatch(blocker);
    expect(storage).toMatch(/pending.*blocker.*resume/iu);
    expect(failure).toMatch(/(?:retain|keep).*original/iu);
  });

  // QFAI:EX-0001-0224-28
  it("requires the receiving role's actual retrieval rather than producer self-read", async () => {
    const receiver = await deliverySection("Independent receiver");
    expect(receiver).toMatch(/(?:named|receiving).*?(?:recipient|person|role)/iu);
    expect(receiver).toMatch(/producer self-read.*insufficient/iu);
    expect(receiver).toMatch(/(?:every|each|all).*required/iu);
    const storage = await deliverySection("Retained storage and receipt");
    for (const information of [
      /who/iu,
      /(?:when|retrieval time)/iu,
      /destination/iu,
      /artifact/iu,
      /retrieved/iu,
      /missing/iu,
    ]) {
      expect(storage).toMatch(information);
    }
  });

  // QFAI:EX-0001-0224-29
  it("checks trusted archive identity before extracting a known-safe archive into a fresh directory", async () => {
    const receiver = await deliverySection("Independent receiver");
    expect(receiver).toMatch(/(?:digest|SHA-256).*before.*extract/iu);
    expect(receiver).toMatch(/known-safe/iu);
    expect(receiver).toMatch(/fresh.*(?:root|directory)/iu);
    expect(receiver).toMatch(/(?:unexpected|missing).*member|member.*(?:unexpected|missing)/iu);
    expect(receiver).toMatch(/(?:not|no).*arbitrary.*(?:archive|restore)/iu);
    const failure = await deliverySection("Failure and proof limits");
    expect(failure).toMatch(/(?:altered|tampered|mismatch)/iu);
    expect(failure).toMatch(/(?:not|no).*complet|incomplete/iu);
  });

  // QFAI:EX-0001-0224-30
  it("retains original results and exclusions without changing the canonical verification verdict", async () => {
    const index = await deliverySection("Identity and the ignored index");
    expect(index).toMatch(/(?:old|prior).*PASS/iu);
    expect(index).toMatch(/current.*FAIL/iu);
    expect(index).toMatch(/UNRUN/iu);
    expect(index).toMatch(/(?:delegated|DELEGATED).*pending/iu);
    expect(index).toMatch(/excluded.*(?:original|result).*reason/iu);
    expect(index).toMatch(/review.*identity|identity.*review/iu);
    const limits = await deliverySection("Failure and proof limits");
    expect(limits).toMatch(/(?:FAIL|UNRUN).*incomplete/iu);
    expect(index).toMatch(/verify\.json.*fields.*statuses.*unchanged/iu);
  });

  // QFAI:EX-0001-0224-31
  it("reviews sharing authority and distinguishes delivered redactions without claiming automatic privacy", async () => {
    const selection = await deliverySection("Selection and privacy");
    expect(selection).toMatch(/(?:secret|credential)/iu);
    expect(selection).toMatch(/private.*authority|authority.*private/iu);
    expect(selection).toMatch(/(?:redacted|reviewed).*cop.*original/iu);
    expect(selection).toMatch(/hash.*bytes.*delivered/iu);
    expect(selection).toMatch(/exclusion/iu);
    expect(selection).toMatch(/neither hashes.*establish privacy completeness/iu);
    expect(selection).toMatch(/neither.*automatically redact/iu);
  });

  // QFAI:EX-0001-0224-32
  it("requires all four actual hosted directions while limiting that proof to the controlled capability", async () => {
    const limits = await deliverySection("Failure and proof limits");
    expect(limits).toMatch(/Linux.*Windows.*producer/iu);
    expect(limits).toMatch(/separate.*Linux.*Windows.*receiver/iu);
    expect(limits).toMatch(/(?:both|each).*producer.*artifact/iu);
    expect(limits).toMatch(/four.*direction/iu);
    expect(limits).toMatch(/controlled.*capability/iu);
    expect(limits).toMatch(
      /does not establish.*real successor access.*session archive.*general sharing permission/iu,
    );
  });
});

type DeliveryFile = { name: string; bytes: Buffer };

function deliveryDigest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function deliveryTriples(files: readonly DeliveryFile[]): string[] {
  return files.flatMap(({ name, bytes }) => [name, String(bytes.length), deliveryDigest(bytes)]);
}

async function deliveryWriteFiles(root: string, files: readonly DeliveryFile[]): Promise<void> {
  for (const file of files) {
    const absolute = path.join(root, ...file.name.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, file.bytes);
  }
}

async function deliveryRecipe(root: string): Promise<string> {
  const guide = await deliveryGuide();
  const section = shippedSectionOf(guide, "## Native preflight");
  const blocks = [...section.matchAll(/^```js\r?\n([\s\S]*?)^```/gmu)];
  expect(
    blocks,
    "The governing native preflight has one authoritative JavaScript block",
  ).toHaveLength(1);
  const code = blocks[0]?.[1];
  if (!code) throw new Error("The governing native preflight code is absent");
  const file = path.join(root, "published-preflight.mjs");
  await writeFile(file, code);
  const saved = await readFile(file);
  expect(
    saved.equals(Buffer.from(code, "utf-8")),
    "The saved recipe preserves the published code bytes",
  ).toBe(true);
  process.stdout.write(
    `Published evidence preflight ${JSON.stringify({ guide: DELIVERY_GUIDE, file, sha256: deliveryDigest(saved) })}\n`,
  );
  return file;
}

function deliveryNative(executable: string, args: readonly string[], cwd: string) {
  const startedAt = new Date().toISOString();
  const child = spawnSync(executable, [...args], {
    cwd,
    encoding: "utf-8",
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  });
  const observation = {
    executable,
    args,
    cwd,
    platform: process.platform,
    parentRuntime: process.version,
    startedAt,
    stdout: child.stdout,
    stderr: child.stderr,
    exit: child.status,
    signal: child.signal,
    error: child.error?.message ?? null,
  };
  process.stdout.write(`Native evidence delivery ${JSON.stringify(observation)}\n`);
  expect(observation.error, JSON.stringify(observation)).toBeNull();
  expect(observation.signal, JSON.stringify(observation)).toBeNull();
  return observation;
}

function deliveryCheck(script: string, root: string, files: readonly DeliveryFile[]) {
  return deliveryNative(
    process.execPath,
    [script, root, ...deliveryTriples(files)],
    path.dirname(script),
  );
}

async function deliveryOriginals(root: string, files: readonly DeliveryFile[]): Promise<void> {
  for (const file of files) {
    const bytes = await readFile(path.join(root, ...file.name.split("/")));
    expect(bytes.equals(file.bytes), `Original bytes of ${file.name} remain`).toBe(true);
  }
}

// QFAI:AC-0001-0224-11
describe("published native evidence selection", () => {
  // QFAI:EX-0001-0224-21
  it("round-trips only selected binary, empty, newline and nested UTF-8 files with exact bytes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-delivery-"));
    try {
      const script = await deliveryRecipe(root);
      const source = path.join(root, "source");
      const staged = path.join(root, "staged");
      const receiver = path.join(root, "receiver", "fresh");
      const files = [
        { name: "empty.txt", bytes: Buffer.alloc(0) },
        { name: ".selected", bytes: Buffer.from([0, 255, 128, 10]) },
        { name: "lf.txt", bytes: Buffer.from("one\ntwo\n") },
        { name: "crlf.txt", bytes: Buffer.from("one\r\ntwo\r\n") },
        { name: "nested space/caf\u00e9.bin", bytes: Buffer.from("\u03b4\n", "utf-8") },
      ];
      await deliveryWriteFiles(source, files);
      await writeFile(path.join(source, "unselected.txt"), "PRIVATE_SENTINEL");
      const nodeVersion = deliveryNative(process.execPath, ["--version"], root);
      expect(nodeVersion.exit).toBe(0);
      expect(nodeVersion.stdout.trim()).toBe(process.version);
      const tarVersion = deliveryNative("tar", ["--version"], root);
      expect(tarVersion.exit, JSON.stringify(tarVersion)).toBe(0);
      expect(tarVersion.stdout + tarVersion.stderr).toMatch(/tar/iu);
      const beforeCopy = deliveryCheck(script, source, files);
      expect(beforeCopy.exit, JSON.stringify(beforeCopy)).toBe(0);
      expect(beforeCopy.stdout).toBe(`Verified ${files.length} selected files.\n`);
      for (const file of files) {
        const destination = path.join(staged, ...file.name.split("/"));
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(path.join(source, ...file.name.split("/")), destination);
      }
      expect(deliveryCheck(script, staged, files).exit).toBe(0);
      const archive = path.join(root, "selected.tar");
      const packed = deliveryNative(
        "tar",
        ["-cf", archive, "-C", staged, ...files.map((file) => `./${file.name}`)],
        root,
      );
      expect(packed.exit, JSON.stringify(packed)).toBe(0);
      const expectedArchiveDigest = deliveryDigest(await readFile(archive));
      const retrieved = path.join(root, "retrieved.tar");
      await copyFile(archive, retrieved);
      expect(deliveryDigest(await readFile(retrieved))).toBe(expectedArchiveDigest);
      const listing = deliveryNative("tar", ["-tf", retrieved], root);
      expect(listing.exit, JSON.stringify(listing)).toBe(0);
      const members = listing.stdout
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((name) => name.replace(/^\.\//u, ""));
      expect(members.sort()).toEqual(files.map((file) => file.name).sort());
      await mkdir(receiver, { recursive: true });
      await writeFile(path.join(root, "receiver", "unrelated.txt"), "RECEIVER_SENTINEL");
      const extracted = deliveryNative("tar", ["-xf", retrieved, "-C", receiver], root);
      expect(extracted.exit, JSON.stringify(extracted)).toBe(0);
      expect(deliveryCheck(script, receiver, files).exit).toBe(0);
      await deliveryOriginals(receiver, files);
      await deliveryOriginals(source, files);
      expect(existsSync(path.join(receiver, "unselected.txt"))).toBe(false);
      expect(await readFile(path.join(root, "receiver", "unrelated.txt"), "utf-8")).toBe(
        "RECEIVER_SENTINEL",
      );
      expect(await readFile(path.join(source, "unselected.txt"), "utf-8")).toBe("PRIVATE_SENTINEL");
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:EX-0001-0224-24
  it.each([
    "missing",
    "directory",
    "absolute",
    "drive",
    "UNC",
    "traversal",
    "duplicate",
    "case collision",
  ] as const)(
    "refuses %s before archive and preserves the selected and outside bytes",
    async (kind) => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-selection-"));
      try {
        const script = await deliveryRecipe(root);
        const source = path.join(root, "source");
        const files = [{ name: "safe.txt", bytes: Buffer.from("SOURCE_SENTINEL") }];
        await deliveryWriteFiles(source, files);
        const outside = path.join(root, "outside.txt");
        await writeFile(outside, "OUTSIDE_SENTINEL");
        await mkdir(path.join(source, "directory"));
        let selected = files;
        if (kind === "missing") selected = [{ name: "missing.txt", bytes: Buffer.from("missing") }];
        if (kind === "directory") selected = [{ name: "directory", bytes: Buffer.alloc(0) }];
        if (kind === "absolute")
          selected = [{ name: outside, bytes: Buffer.from("OUTSIDE_SENTINEL") }];
        if (kind === "drive")
          selected = [{ name: "C:/outside.txt", bytes: Buffer.from("OUTSIDE_SENTINEL") }];
        if (kind === "UNC")
          selected = [
            { name: "\\\\server\\share\\outside.txt", bytes: Buffer.from("OUTSIDE_SENTINEL") },
          ];
        if (kind === "traversal")
          selected = [{ name: "../outside.txt", bytes: Buffer.from("OUTSIDE_SENTINEL") }];
        if (kind === "duplicate") selected = [...files, ...files];
        if (kind === "case collision")
          selected = [...files, { name: "SAFE.txt", bytes: Buffer.from("SOURCE_SENTINEL") }];
        const observed = deliveryCheck(script, source, selected);
        expect(observed.exit, JSON.stringify(observed)).toBe(1);
        expect(observed.stdout).not.toMatch(/Verified/iu);
        expect(existsSync(path.join(root, "selected.tar"))).toBe(false);
        await deliveryOriginals(source, files);
        expect(await readFile(outside, "utf-8")).toBe("OUTSIDE_SENTINEL");
      } finally {
        await removeTempTree(root);
      }
    },
  );

  // QFAI:EX-0001-0224-24
  it("rejects a native hardlink without changing its other name or producing an archive", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-hardlink-"));
    try {
      const script = await deliveryRecipe(root);
      const source = path.join(root, "source");
      await mkdir(source);
      const bytes = Buffer.from("HARDLINK_SENTINEL");
      const outside = path.join(root, "outside.txt");
      await writeFile(outside, bytes);
      await link(outside, path.join(source, "linked.txt"));
      const observed = deliveryCheck(script, source, [{ name: "linked.txt", bytes }]);
      expect(observed.exit, JSON.stringify(observed)).toBe(1);
      expect((await readFile(outside)).equals(bytes)).toBe(true);
      expect((await readFile(path.join(source, "linked.txt"))).equals(bytes)).toBe(true);
      expect(existsSync(path.join(root, "selected.tar"))).toBe(false);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:EX-0001-0224-24
  it.each(["root", "parent", "leaf"] as const)(
    "rejects a native linked %s without following outside bytes",
    async (kind) => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-linked-selection-"));
      try {
        const script = await deliveryRecipe(root);
        const source = path.join(root, "source");
        const outside = path.join(root, "outside");
        const bytes = Buffer.from("LINKED_SENTINEL");
        await mkdir(source);
        await deliveryWriteFiles(outside, [{ name: "payload.txt", bytes }]);
        let selectedRoot = source;
        let selectedName = "payload.txt";
        if (kind === "root") {
          selectedRoot = path.join(root, "linked-root");
          await symlink(outside, selectedRoot, process.platform === "win32" ? "junction" : "dir");
        } else if (kind === "parent") {
          await symlink(
            outside,
            path.join(source, "linked-parent"),
            process.platform === "win32" ? "junction" : "dir",
          );
          selectedName = "linked-parent/payload.txt";
        } else {
          await symlink(
            path.join(outside, "payload.txt"),
            path.join(source, "payload.txt"),
            "file",
          );
        }
        const observed = deliveryCheck(script, selectedRoot, [{ name: selectedName, bytes }]);
        expect(observed.exit, JSON.stringify(observed)).toBe(1);
        expect((await readFile(path.join(outside, "payload.txt"))).equals(bytes)).toBe(true);
        expect(existsSync(path.join(root, "selected.tar"))).toBe(false);
      } finally {
        await removeTempTree(root);
      }
    },
  );

  // QFAI:EX-0001-0224-23
  it.each(["length", "digest"] as const)(
    "refuses an unknown required %s without accepting selected bytes",
    async (field) => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-unknown-identity-"));
      try {
        const script = await deliveryRecipe(root);
        const source = path.join(root, "source");
        const files = [{ name: "safe.txt", bytes: Buffer.from("SOURCE_SENTINEL") }];
        await deliveryWriteFiles(source, files);
        const triples = deliveryTriples(files);
        triples[field === "length" ? 1 : 2] = "unknown";
        const observed = deliveryNative(process.execPath, [script, source, ...triples], root);
        expect(observed.exit, JSON.stringify(observed)).toBe(1);
        expect(observed.stdout).not.toMatch(/Verified/iu);
        await deliveryOriginals(source, files);
      } finally {
        await removeTempTree(root);
      }
    },
  );

  // QFAI:EX-0001-0224-25
  it.each(["source", "staged"] as const)(
    "refuses changed %s bytes at the check immediately before archive",
    async (changed) => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-changed-selection-"));
      try {
        const script = await deliveryRecipe(root);
        const source = path.join(root, "source");
        const staged = path.join(root, "staged");
        const files = [{ name: "safe.txt", bytes: Buffer.from("initial") }];
        await deliveryWriteFiles(source, files);
        await deliveryWriteFiles(staged, files);
        const changedRoot = changed === "source" ? source : staged;
        await writeFile(path.join(changedRoot, "safe.txt"), "altered");
        const observed = deliveryCheck(script, changedRoot, files);
        expect(observed.exit, JSON.stringify(observed)).toBe(1);
        expect(existsSync(path.join(root, "selected.tar"))).toBe(false);
        expect(await readFile(path.join(changedRoot, "safe.txt"), "utf-8")).toBe("altered");
        await deliveryOriginals(changed === "source" ? staged : source, files);
      } finally {
        await removeTempTree(root);
      }
    },
  );

  // QFAI:EX-0001-0224-26 QFAI:EX-0001-0224-29
  it.each(["missing", "altered", "stale inventory"] as const)(
    "rejects %s required receiver evidence and keeps unrelated bytes",
    async (kind) => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-receiver-identity-"));
      try {
        const script = await deliveryRecipe(root);
        const receiver = path.join(root, "receiver");
        const expected = [{ name: "required.log", bytes: Buffer.from("current evidence") }];
        await mkdir(receiver);
        await writeFile(path.join(receiver, "unrelated.txt"), "RECEIVER_SENTINEL");
        if (kind === "altered")
          await writeFile(path.join(receiver, "required.log"), "changed evidence");
        if (kind === "stale inventory")
          await deliveryWriteFiles(receiver, [
            { name: "old.log", bytes: Buffer.from("old evidence") },
          ]);
        const observed = deliveryCheck(script, receiver, expected);
        expect(observed.exit, JSON.stringify(observed)).toBe(1);
        expect(observed.stdout).not.toMatch(/Verified/iu);
        expect(await readFile(path.join(receiver, "unrelated.txt"), "utf-8")).toBe(
          "RECEIVER_SENTINEL",
        );
        if (kind === "stale inventory")
          expect(await readFile(path.join(receiver, "old.log"), "utf-8")).toBe("old evidence");
      } finally {
        await removeTempTree(root);
      }
    },
  );

  // QFAI:EX-0001-0224-25
  it("refuses an actual selected-file mutation during descriptor reading", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-read-change-"));
    try {
      const script = await deliveryRecipe(root);
      const source = path.join(root, "source");
      const files = [{ name: "safe.txt", bytes: Buffer.from("initial") }];
      await deliveryWriteFiles(source, files);
      const selected = path.join(source, "safe.txt");
      const marker = path.join(root, "mutation.txt");
      const preload = path.join(root, "change-during-read.cjs");
      await writeFile(
        preload,
        [
          'const fs = require("node:fs");',
          `const selected = ${JSON.stringify(selected)};`,
          `const marker = ${JSON.stringify(marker)};`,
          "const identity = fs.statSync(selected);",
          "const read = fs.readSync;",
          "let changed = false;",
          "fs.readSync = function (fd, buffer, offset, length, position) {",
          "  const current = fs.fstatSync(fd);",
          "  const count = read.call(fs, fd, buffer, offset, length, position);",
          "  if (!changed && count > 0 && current.dev === identity.dev && current.ino === identity.ino) {",
          "    changed = true;",
          '    fs.writeFileSync(selected, "altered");',
          '    fs.writeFileSync(marker, "observed mutation");',
          "  }",
          "  return count;",
          "};",
        ].join("\n"),
      );
      const observed = deliveryNative(
        process.execPath,
        ["--require", preload, script, source, ...deliveryTriples(files)],
        root,
      );
      expect(observed.exit, JSON.stringify(observed)).toBe(1);
      expect(observed.stdout).not.toMatch(/Verified/iu);
      expect(await readFile(marker, "utf-8")).toBe("observed mutation");
      expect(await readFile(selected, "utf-8")).toBe("altered");
      expect(existsSync(path.join(root, "selected.tar"))).toBe(false);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:EX-0001-0224-29
  it("rejects changed archive bytes against an independently retained digest before extraction", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-archive-identity-"));
    try {
      const script = await deliveryRecipe(root);
      const source = path.join(root, "source");
      const files = [{ name: "required.log", bytes: Buffer.from("ORIGINAL_EVIDENCE") }];
      await deliveryWriteFiles(source, files);
      expect(deliveryCheck(script, source, files).exit).toBe(0);
      const archive = path.join(root, "selected.tar");
      const packed = deliveryNative("tar", ["-cf", archive, "-C", source, "./required.log"], root);
      expect(packed.exit, JSON.stringify(packed)).toBe(0);
      const trustedArchive = await readFile(archive);
      const receivedRoot = path.join(root, "received");
      await mkdir(receivedRoot);
      const altered = Buffer.from(trustedArchive);
      const first = altered[0];
      if (first === undefined) throw new Error("Native tar produced an empty archive");
      altered[0] = first ^ 1;
      await writeFile(path.join(receivedRoot, "selected.tar"), altered);
      await writeFile(path.join(receivedRoot, "unrelated.txt"), "RECEIVER_SENTINEL");
      const observed = deliveryCheck(script, receivedRoot, [
        { name: "selected.tar", bytes: trustedArchive },
      ]);
      expect(observed.exit, JSON.stringify(observed)).toBe(1);
      expect(observed.stdout).not.toMatch(/Verified/iu);
      expect(existsSync(path.join(receivedRoot, "extracted"))).toBe(false);
      expect((await readFile(archive)).equals(trustedArchive)).toBe(true);
      expect((await readFile(path.join(receivedRoot, "selected.tar"))).equals(altered)).toBe(true);
      expect(await readFile(path.join(receivedRoot, "unrelated.txt"), "utf-8")).toBe(
        "RECEIVER_SENTINEL",
      );
      await deliveryOriginals(source, files);
    } finally {
      await removeTempTree(root);
    }
  });

  // QFAI:EX-0001-0224-29
  it.each(["missing", "duplicated", "unexpected"] as const)(
    "observes an invalid %s archive member set without extracting it",
    async (kind) => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-archive-members-"));
      try {
        const script = await deliveryRecipe(root);
        const source = path.join(root, "source");
        const files = [
          { name: "required.log", bytes: Buffer.from("REQUIRED_EVIDENCE") },
          { name: "second.log", bytes: Buffer.from("SECOND_EVIDENCE") },
        ];
        await deliveryWriteFiles(source, files);
        await writeFile(path.join(source, "unexpected.txt"), "UNSELECTED_SENTINEL");
        expect(deliveryCheck(script, source, files).exit).toBe(0);
        const selection =
          kind === "missing"
            ? ["./required.log"]
            : [
                "./required.log",
                "./second.log",
                kind === "duplicated" ? "./required.log" : "./unexpected.txt",
              ];
        const archive = path.join(root, "selected.tar");
        const packed = deliveryNative("tar", ["-cf", archive, "-C", source, ...selection], root);
        expect(packed.exit, JSON.stringify(packed)).toBe(0);
        const listing = deliveryNative("tar", ["-tf", archive], root);
        expect(listing.exit, JSON.stringify(listing)).toBe(0);
        const members = listing.stdout
          .split(/\r?\n/u)
          .filter(Boolean)
          .map((name) => name.replace(/^\.\//u, ""));
        expect(members.sort()).not.toEqual(files.map((file) => file.name).sort());
        if (kind === "missing") expect(members).not.toContain("second.log");
        if (kind === "duplicated")
          expect(members.filter((name) => name === "required.log")).toHaveLength(2);
        if (kind === "unexpected") expect(members).toContain("unexpected.txt");
        expect(existsSync(path.join(root, "receiver"))).toBe(false);
        await deliveryOriginals(source, files);
        expect(await readFile(path.join(source, "unexpected.txt"), "utf-8")).toBe(
          "UNSELECTED_SENTINEL",
        );
      } finally {
        await removeTempTree(root);
      }
    },
  );

  // QFAI:EX-0001-0224-30
  it("keeps actual old-byte PASS and changed-byte FAIL observations without executing the declared UNRUN command", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-delivered-results-"));
    try {
      const script = await deliveryRecipe(root);
      const payload = path.join(root, "payload");
      const executable = path.join(root, "actual-assertion.mjs");
      await mkdir(payload);
      const oldSource = Buffer.from(
        'import assert from "node:assert/strict"; assert.equal(1, 1, "CONTROLLED_ASSERTION");\n',
      );
      const currentSource = Buffer.from(
        'import assert from "node:assert/strict"; assert.equal(1, 2, "CONTROLLED_ASSERTION");\n',
      );
      await writeFile(executable, oldSource);
      const prior = deliveryNative(process.execPath, [executable], root);
      expect(prior.exit, JSON.stringify(prior)).toBe(0);
      await writeFile(executable, currentSource);
      const current = deliveryNative(process.execPath, [executable], root);
      expect(current.exit, JSON.stringify(current)).toBe(1);
      expect(current.stderr).toContain("CONTROLLED_ASSERTION");
      expect(deliveryDigest(currentSource)).not.toBe(deliveryDigest(oldSource));
      const index = [
        `Prior selected source SHA-256 ${deliveryDigest(oldSource)}: PASS, observed exit ${prior.exit}.`,
        `Current selected source SHA-256 ${deliveryDigest(currentSource)}: FAIL, observed exit ${current.exit}.`,
        "Excluded failed attempt: current assertion, original result FAIL; exclusion reason: diagnostic illustration, not completion evidence.",
        "UNRUN: declared command to create never-executed.txt was not invoked.",
        "Delegated pending: illustrative required check, no hosted result observed.",
        "Repository revision, build and historical execution metadata: UNKNOWN in this controlled fixture.",
      ].join("\n");
      const files = [
        { name: "old-source.mjs", bytes: oldSource },
        { name: "current-source.mjs", bytes: currentSource },
        { name: "prior-receipt.txt", bytes: Buffer.from(JSON.stringify(prior)) },
        { name: "current-receipt.txt", bytes: Buffer.from(JSON.stringify(current)) },
      ];
      await deliveryWriteFiles(payload, files);
      await writeFile(path.join(root, "human-index.md"), index);
      expect(deliveryCheck(script, payload, files).exit).toBe(0);
      await deliveryOriginals(payload, files);
      expect(existsSync(path.join(root, "never-executed.txt"))).toBe(false);
      expect(await readFile(path.join(root, "human-index.md"), "utf-8")).toBe(index);
    } finally {
      await removeTempTree(root);
    }
  });
});
