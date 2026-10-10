import { execFileSync } from "node:child_process";
import { link, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { run } from "../../src/cli/main.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateStoryTreeDrift } from "../../src/core/validators/upstreamSsotGuard.js";
import { createSymlinkFixture } from "../helpers/symlinkFixture.js";

let root: string;
const specs = ".qfai/spec";
const decisions = `${specs}/decisions.md`;
const glossary = `${specs}/01_policy/glossary.md`;
const table = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";

function git(...args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

async function put(file: string, content: string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

function config() {
  const value = structuredClone(defaultConfig);
  value.paths.specsDir = specs;
  value.paths.contractsDir = `${specs}/03_contract`;
  value.baseBranch = "main";
  return value;
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-story-drift-"));
  git("init", "-b", "main");
  git("config", "user.email", "test@example.test");
  git("config", "user.name", "Test");
});

describe("decision renumber public CLI", () => {
  const references = `${specs}/decision-notes.md`;
  const source = "src/decision.ts";
  const inheritedRow = "| DEC-0001 | Inherited DEC-0002 mention | Keep | DONE |\n";
  const addedRow = "| DEC-0002 | Incoming choice | Branch reason | TODO |\n";
  const inheritedReference = "# Notes\nInherited DEC-0002 stays.\n";
  const addedReference =
    "Added DEC-0002; DEC-00020 DEC-0002-extra prefixDEC-0002 DEC-0002_suffix stay.\n";
  const files = [decisions, references, source];

  function gitText(...args: string[]): string {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  }

  async function prepare(): Promise<void> {
    git("config", "core.autocrlf", "false");
    await put(decisions, table + inheritedRow);
    await put(references, inheritedReference);
    git("add", ".");
    git("commit", "-m", "ancestor");
    git("checkout", "-b", "topic");
    await put(decisions, table + inheritedRow + addedRow);
    await put(references, inheritedReference + addedReference);
    await put(source, 'const choice = "DEC-0002";\n');
    git("add", ".");
    git("commit", "-m", "incoming decision");
    git("checkout", "main");
    await put(
      decisions,
      table +
        inheritedRow +
        "| DEC-0002 | Base choice | Base reason | DONE |\n" +
        "| DEC-0009 | Retired DEC-0012 | Reserve its ID | DONE |\n",
    );
    git("add", ".");
    git("commit", "-m", "base advances independently");
    git("checkout", "topic");
  }

  async function snapshot(candidates = files): Promise<Buffer[]> {
    return Promise.all(candidates.map((file) => readFile(path.join(root, file))));
  }

  async function invoke(extra: string[] = [], from = "DEC-0002", to = "DEC-0013", base = "main") {
    const previous = process.exitCode;
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    process.exitCode = undefined;
    try {
      await run(
        [
          "sdd",
          "renumber-decision",
          "--root",
          root,
          "--from",
          from,
          "--to",
          to,
          "--base",
          base,
          ...extra,
        ],
        root,
      );
      return {
        code: process.exitCode,
        stdout: stdout.mock.calls.map((call) => String(call[0])).join(""),
        stderr: stderr.mock.calls.map((call) => String(call[0])).join(""),
      };
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
      process.exitCode = previous;
    }
  }

  // QFAI:AC-0001-0008-05
  // QFAI:EX-0001-0008-14
  it("previews fixed commits and affected paths without changing any bytes or reserving an ID", async () => {
    await prepare();
    const before = await snapshot();
    const head = gitText("rev-parse", "HEAD");
    const base = gitText("rev-parse", "main");
    const result = await invoke();
    expect(result.code).toBe(0);
    for (const value of [head, base, "DEC-0002", "DEC-0013", ...files])
      expect(result.stdout).toContain(value);
    expect(result.stdout).toMatch(/(?:preview|no files? changed|nothing (?:was )?written)/i);
    expect(result.stdout).not.toContain("Incoming choice");
    expect(result.stdout).not.toContain(addedReference.trim());
    expect(await snapshot()).toEqual(before);
    expect(gitText("status", "--porcelain", "--untracked-files=all")).toBe("");
    expect(gitText("rev-parse", "HEAD")).toBe(head);
  });

  // QFAI:AC-0001-0008-06
  // QFAI:EX-0001-0008-15
  // QFAI:EX-0001-0008-19
  it("applies only the incoming row and provably added exact tokens despite a base-only source collision", async () => {
    await prepare();
    await put("unrelated.txt", "Operator work\n");
    const result = await invoke(["--apply"]);
    expect(result.code).toBe(0);
    expect(await readFile(path.join(root, decisions), "utf8")).toBe(
      table + inheritedRow + addedRow.replace("DEC-0002", "DEC-0013"),
    );
    expect(await readFile(path.join(root, references), "utf8")).toBe(
      inheritedReference + addedReference.replace("Added DEC-0002;", "Added DEC-0013;"),
    );
    expect(await readFile(path.join(root, source), "utf8")).toBe('const choice = "DEC-0013";\n');
    expect(await readFile(path.join(root, "unrelated.txt"), "utf8")).toBe("Operator work\n");
    for (const file of files) expect(result.stdout).toContain(file);
    expect(result.stdout).toMatch(/(?:applied|changed|written)/i);
    expect(result.stdout).not.toContain("Incoming choice");
    expect(gitText("show", `main:${decisions}`)).toContain("Base choice");
    expect(gitText("show", `main:${decisions}`)).not.toContain("DEC-0013");
  });

  // QFAI:EX-0001-0008-20
  it("previews a valid ledger larger than Git's default one MiB output buffer", async () => {
    await prepare();
    const content = "x".repeat(1024 * 1024 + 64);
    await put(decisions, table + inheritedRow + addedRow.replace("Incoming choice", content));
    git("add", decisions);
    git("commit", "-m", "large valid decision ledger");
    const before = await snapshot();
    const result = await invoke();
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(decisions);
    expect(result.stdout).not.toContain(content.slice(0, 100));
    expect(await snapshot()).toEqual(before);
    expect(gitText("status", "--porcelain")).toBe("");
  });

  // QFAI:EX-0001-0008-15
  it("recomputes apply after the branch advances since a preview", async () => {
    await prepare();
    const preview = await invoke();
    expect(preview.code).toBe(0);
    await put(source, 'const choice = "DEC-0002";\nconst next = "DEC-0002";\n');
    git("add", source);
    git("commit", "-m", "another branch reference");
    const head = gitText("rev-parse", "HEAD");
    const result = await invoke(["--apply"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(head);
    expect(await readFile(path.join(root, source), "utf8")).toBe(
      'const choice = "DEC-0013";\nconst next = "DEC-0013";\n',
    );
  });

  // QFAI:EX-0001-0008-19
  it.each(["reworded", "moved"])(
    "refuses %s inherited tokens with ambiguous ownership",
    async (kind) => {
      await prepare();
      const moved = "moved-reference.md";
      await put(
        references,
        kind === "moved"
          ? addedReference
          : inheritedReference.replace("Inherited", "Reworded") + addedReference,
      );
      if (kind === "moved") await put(moved, inheritedReference);
      git("add", ".");
      git("commit", "-m", "change inherited reference location or wording");
      const candidates = kind === "moved" ? [...files, moved] : files;
      const before = await snapshot(candidates);
      const result = await invoke(["--apply"]);
      expect(result.code).toBe(2);
      expect(result.stderr).toMatch(/(?:ownership|ambiguous|inherited)/i);
      expect(await snapshot(candidates)).toEqual(before);
      expect(gitText("status", "--porcelain")).toBe("");
    },
  );

  // QFAI:EX-0001-0008-18
  it("refuses two best common ancestors before writing", async () => {
    await prepare();
    const head = gitText("rev-parse", "HEAD");
    const base = gitText("rev-parse", "main");
    const tree = gitText("rev-parse", "HEAD^{tree}");
    const left = gitText("commit-tree", tree, "-p", head, "-p", base, "-m", "left merge");
    const right = gitText("commit-tree", tree, "-p", base, "-p", head, "-m", "right merge");
    git("update-ref", "refs/heads/main", left);
    git("checkout", "--detach", right);
    expect(gitText("merge-base", "--all", "HEAD", "main").split(/\r?\n/)).toHaveLength(2);
    const before = await snapshot();
    const result = await invoke(["--apply"]);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/(?:ancestor|merge.base)/i);
    expect(await snapshot()).toEqual(before);
    expect(gitText("status", "--porcelain")).toBe("");
  });

  for (const kind of ["candidate", "unrelated"] as const) {
    // QFAI:EX-0001-0008-20
    it(`handles a tracked ${kind} symbolic link without changing its target`, async (ctx) => {
      await prepare();
      git("config", "core.symlinks", "true");
      const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-renumber-link-"));
      const link = "linked.txt";
      const target = path.join(outside, kind === "candidate" ? "DEC-0002.txt" : "target.txt");
      const contents = "External DEC-0002 reference must stay untouched\n";
      try {
        await writeFile(target, contents);
        if (!(await createSymlinkFixture(target, path.join(root, link), "file"))) {
          // Only Windows EPERM while creating this fixture permits a skip.
          ctx.skip();
        }
        git("add", link);
        git("commit", "-m", "tracked symbolic link");
        const before = await snapshot();
        const result = await invoke(["--apply"]);
        expect(result.code).toBe(kind === "candidate" ? 2 : 0);
        if (kind === "candidate") {
          expect(result.stderr).toContain(link);
          expect(await snapshot()).toEqual(before);
          expect(gitText("status", "--porcelain")).toBe("");
        } else {
          expect(await readFile(path.join(root, source), "utf8")).toContain("DEC-0013");
        }
        expect(await readFile(target, "utf8")).toBe(contents);
        expect(await readlink(path.join(root, link))).toBe(target);
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });
  }

  for (const tree of ["HEAD", "base"] as const) {
    // QFAI:EX-0001-0008-17
    it.each([false, true])(
      `refuses a destination cited elsewhere in the fixed ${tree} specs with apply=%s`,
      async (apply) => {
        await prepare();
        const contract = `${specs}/03_contract/cli/cli-0001-choice.md`;
        if (tree === "base") git("checkout", "main");
        await put(
          contract,
          "# CLI-0001: Choice\n\n## Business rules\n\n" +
            "| BR-ID | Statement | Examples |\n| --- | --- | --- |\n" +
            "| BR-0001-0001 | Follow DEC-0013. | EX-0001-0001-01 |\n",
        );
        git("add", contract);
        git("commit", "-m", "destination already cited by a contract");
        if (tree === "base") git("checkout", "topic");
        const candidates = tree === "HEAD" ? [...files, contract] : files;
        const before = await snapshot(candidates);
        const result = await invoke(apply ? ["--apply"] : []);
        expect(result.code).toBe(2);
        expect(result.stderr).toContain("DEC-0013");
        expect(result.stderr).toContain(contract);
        expect(result.stderr).toMatch(/already used/i);
        expect(await snapshot(candidates)).toEqual(before);
        expect(gitText("status", "--porcelain")).toBe("");
      },
    );
  }

  // QFAI:EX-0001-0008-17
  it.each(["BR statement", "decision approach", "retirement successor"])(
    "counts a %s reservation when checking the destination maximum",
    async (reservation) => {
      await prepare();
      if (reservation === "BR statement") {
        await put(
          `${specs}/03_contract/cli/cli-0001-choice.md`,
          "# CLI-0001: Choice\n\n## Business rules\n\n" +
            "| BR-ID | Statement | Examples |\n| --- | --- | --- |\n" +
            "| BR-0001-0001 | Retain DEC-0042. | EX-0001-0001-01 |\n",
        );
      } else {
        await put(
          decisions,
          table +
            inheritedRow +
            addedRow +
            (reservation === "decision approach"
              ? "| DEC-0003 | Retired choice | Reserve DEC-0042 | DONE |\n"
              : "| DEC-0003 | Retired choice | Keep its successor | SUPERSEDED (by DEC-0042) |\n"),
        );
      }
      git("add", ".");
      git("commit", "-m", "reserve a higher decision number");
      const before = await snapshot();
      const refused = await invoke(["--apply"], "DEC-0002", "DEC-0041");
      expect(refused.code).toBe(2);
      expect(refused.stderr).toMatch(/highest.*0042/i);
      expect(await snapshot()).toEqual(before);
      const accepted = await invoke([], "DEC-0002", "DEC-0043");
      expect(accepted.code).toBe(0);
      expect(accepted.stdout).toContain("DEC-0043");
      expect(await snapshot()).toEqual(before);
      expect(gitText("status", "--porcelain")).toBe("");
    },
  );

  // QFAI:EX-0001-0008-17
  it("ignores fictional example input IDs and unrelated binary visual assets for the maximum", async () => {
    await prepare();
    const example = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md`;
    const visual = `${specs}/03_contract/ui/preview.png`;
    await put(
      example,
      "# Examples\n\n## Examples\n\n" +
        "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n" +
        "| EX-0001-0001-01 | AC-0001-0001-01 | A fictional DEC-9999 | Reject the input |\n",
    );
    await mkdir(path.dirname(path.join(root, visual)), { recursive: true });
    await writeFile(path.join(root, visual), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0x00]));
    git("add", ".");
    git("commit", "-m", "example data and unrelated visual asset");
    const before = await snapshot([...files, example, visual]);
    const result = await invoke();
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("DEC-0013");
    expect(result.stdout).not.toContain(visual);
    expect(await snapshot([...files, example, visual])).toEqual(before);
    expect(gitText("status", "--porcelain")).toBe("");
  });

  // QFAI:EX-0001-0008-17
  // QFAI:EX-0001-0008-18
  it.each([
    ["inherited", "DEC-0001", "DEC-0013", "main"],
    ["missing", "DEC-0003", "DEC-0013", "main"],
    ["used in base", "DEC-0002", "DEC-0009", "main"],
    ["retired-inclusive gap", "DEC-0002", "DEC-0010", "main"],
    ["reserved reference", "DEC-0002", "DEC-0012", "main"],
    ["invalid base", "DEC-0002", "DEC-0013", "not-a-local-ref"],
  ])("refuses an ineligible %s request before writing", async (_reason, from, to, base) => {
    await prepare();
    const before = await snapshot();
    const status = gitText("status", "--porcelain", "--untracked-files=all");
    const result = await invoke(["--apply"], from, to, base);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(base === "main" ? (from === "DEC-0002" ? to : from) : base);
    expect(await snapshot()).toEqual(before);
    expect(gitText("status", "--porcelain", "--untracked-files=all")).toBe(status);
  });

  // QFAI:EX-0001-0008-18
  it.each(["duplicate", "invalid status"])(
    "refuses a %s source row before writing",
    async (problem) => {
      await prepare();
      await put(
        decisions,
        table +
          inheritedRow +
          (problem === "duplicate" ? addedRow + addedRow : addedRow.replace("TODO", "INVALID")),
      );
      git("add", ".");
      git("commit", "-m", "ineligible current row");
      const before = await snapshot();
      const result = await invoke(["--apply"]);
      expect(result.code).toBe(2);
      expect(result.stderr).toContain("DEC-0002");
      expect(await snapshot()).toEqual(before);
      expect(gitText("status", "--porcelain")).toBe("");
    },
  );

  // QFAI:EX-0001-0008-20
  it("accepts a tracked text candidate at the sixteen MiB ceiling without dumping it", async () => {
    await prepare();
    const candidate = "ceiling.txt";
    const contents = Buffer.alloc(16 * 1024 * 1024, "x");
    contents.write("DEC-0002 ");
    await writeFile(path.join(root, candidate), contents);
    git("add", candidate);
    git("commit", "-m", "candidate at the read ceiling");
    const before = await snapshot([...files, candidate]);
    const result = await invoke();
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(candidate);
    expect(result.stdout).not.toContain("x".repeat(100));
    expect(await snapshot([...files, candidate])).toEqual(before);
    expect(gitText("status", "--porcelain")).toBe("");
  });

  // QFAI:EX-0001-0008-20
  it("refuses a regular candidate beneath a linked directory", async (ctx) => {
    await prepare();
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-renumber-parent-link-"));
    const original = await readFile(path.join(root, source));
    try {
      await writeFile(path.join(outside, "decision.ts"), original);
      await rm(path.join(root, "src"), { recursive: true, force: true });
      if (
        !(await createSymlinkFixture(
          outside,
          path.join(root, "src"),
          process.platform === "win32" ? "junction" : "dir",
        ))
      ) {
        // Only Windows EPERM while creating this fixture permits a skip.
        ctx.skip();
      }
      const before = await snapshot();
      const status = gitText("status", "--porcelain", "--untracked-files=all");
      const result = await invoke(["--apply"]);
      expect(result.code).toBe(2);
      expect(result.stderr).toMatch(/linked/i);
      expect(result.stderr).toContain(source);
      expect(await snapshot()).toEqual(before);
      expect(await readFile(path.join(outside, "decision.ts"))).toEqual(original);
      expect(gitText("status", "--porcelain", "--untracked-files=all")).toBe(status);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  for (const apply of [false, true]) {
    // QFAI:EX-0001-0008-20
    it(`refuses an external hardlinked candidate with apply=${apply} without changing either path`, async (ctx) => {
      await prepare();
      const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-renumber-hardlink-"));
      const target = path.join(outside, "choice.txt");
      const original = await readFile(path.join(root, source));
      try {
        await writeFile(target, original);
        await rm(path.join(root, source));
        try {
          await link(target, path.join(root, source));
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            ["EPERM", "EACCES"].includes(String(error.code))
          ) {
            // Skip only when the host denies creation of this hardlink fixture.
            ctx.skip();
          }
          throw error;
        }
        expect(gitText("status", "--porcelain")).toBe("");
        const before = await snapshot();
        const result = await invoke(apply ? ["--apply"] : []);
        expect(result.code).toBe(2);
        expect(result.stderr).toMatch(/hardlink/i);
        expect(result.stderr).toContain(source);
        expect(await snapshot()).toEqual(before);
        expect(await readFile(target)).toEqual(original);
        expect(gitText("status", "--porcelain")).toBe("");
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });
  }

  // QFAI:AC-0001-0008-08
  // QFAI:EX-0001-0008-20
  it("checks a later unsafe candidate before writing any earlier valid candidate", async () => {
    await prepare();
    const candidate = "zz-last-candidate.txt";
    await put(candidate, "Added DEC-0002 reference\n");
    git("add", candidate);
    git("commit", "-m", "later candidate");
    await put(candidate, "Operator edited DEC-0002 reference\n");
    const before = await snapshot([...files, candidate]);
    const status = gitText("status", "--porcelain");
    const result = await invoke(["--apply"]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(candidate);
    expect(await snapshot([...files, candidate])).toEqual(before);
    expect(gitText("status", "--porcelain")).toBe(status);
  });

  // QFAI:AC-0001-0008-07
  // QFAI:EX-0001-0008-20
  it.each(["worktree", "index", "unsupported", "untracked", "invalid UTF-8", "oversized"])(
    "refuses an unsafe %s candidate without changing any candidate",
    async (problem) => {
      await prepare();
      const candidate =
        problem === "unsupported"
          ? "unsafe.bin"
          : problem === "untracked" || problem === "invalid UTF-8" || problem === "oversized"
            ? "unsafe.txt"
            : source;
      if (problem === "invalid UTF-8") {
        await writeFile(
          path.join(root, candidate),
          Buffer.from([0xff, ...Buffer.from(" DEC-0002")]),
        );
      } else if (problem === "oversized") {
        const content = Buffer.alloc(16 * 1024 * 1024 + 1, "x");
        content.write("DEC-0002 ");
        await writeFile(path.join(root, candidate), content);
      } else {
        await put(candidate, 'const choice = "DEC-0002";\nOperator edit\n');
      }
      if (problem !== "untracked" && problem !== "worktree") git("add", candidate);
      if (problem === "unsupported" || problem === "invalid UTF-8" || problem === "oversized")
        git("commit", "-m", "unsafe candidate");
      const candidates = [...new Set([...files, candidate])];
      const before = await snapshot(candidates);
      const status = gitText("status", "--porcelain", "--untracked-files=all");
      const result = await invoke(["--apply"]);
      expect(result.code).toBe(2);
      expect(result.stderr).toContain(candidate);
      expect(await snapshot(candidates)).toEqual(before);
      expect(gitText("status", "--porcelain", "--untracked-files=all")).toBe(status);
    },
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("story-tree drift", () => {
  // QFAI:AC-0001-0054-03
  // QFAI:EX-0001-0002-04
  // QFAI:EX-0001-0054-04
  it("reports each protected story-tree edit and excludes evidence", async () => {
    const protectedFiles = [
      `${specs}/02_business-flow/business-flow-0001/business-flow.md`,
      glossary,
      `${specs}/03_contract/cli/command.md`,
      `${specs}/open-questions.md`,
    ];
    await put(decisions, table);
    for (const file of protectedFiles) await put(file, "# Original\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    for (const file of protectedFiles) await put(file, "# Changed\n");
    await put(".qfai/evidence/notes.md", "new evidence\n");
    git("add", ".");
    git("commit", "-m", "edit protected files and evidence");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    for (const file of protectedFiles) {
      expect(
        findings.some((item) => item.file === file),
        file,
      ).toBe(true);
    }
    expect(findings.some((item) => item.file === ".qfai/evidence/notes.md")).toBe(false);
  });

  // QFAI:EX-0001-0054-05
  it("reports an unapproved protected edit but accepts an in-force change request", async () => {
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(glossary, "# Terms\nUpdated\n");
    git("add", ".");
    git("commit", "-m", "edit glossary");
    expect(
      (await validateStoryTreeDrift(root, config(), "tdd")).some((item) => item.file === glossary),
    ).toBe(true);

    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Approved | WIP |\n`);
    expect(
      (await validateStoryTreeDrift(root, config(), "tdd")).some((item) => item.file === glossary),
    ).toBe(false);
  });

  // QFAI:EX-0001-0002-05
  it("keeps a DONE change request in force", async () => {
    await put(decisions, table);
    await put(glossary, "# Original\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(glossary, "# Changed\n");
    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Approved | DONE |\n`);
    git("add", ".");
    git("commit", "-m", "approved edit");
    expect(
      (await validateStoryTreeDrift(root, config(), "tdd")).some((item) => item.file === glossary),
    ).toBe(false);
  });

  // QFAI:EX-0001-0002-14
  it("authorises only a DONE row this branch applied, and never an ID", async () => {
    const flows = `${specs}/02_business-flow/business-flows.md`;
    const story = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001/01_User-story.md`;
    const baseRows = [
      `| DEC-0001 | Change request: ${glossary} | Applied | DONE |`,
      `| DEC-0002 | Change request: ${flows} | Approved | WIP |`,
      "| DEC-0003 | Change request: US-0001-0001 | Approved | WIP |",
    ];
    await put(decisions, `${table}${baseRows.join("\n")}\n`);
    for (const file of [glossary, flows, story]) await put(file, "# Original\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    for (const file of [glossary, flows, story]) await put(file, "# Changed\n");
    await put(
      decisions,
      `${table}${baseRows.join("\n").replace("| Approved | WIP |", "| Approved | DONE |")}\n`,
    );
    git("add", ".");
    git("commit", "-m", "edit without a new change request");
    const reported = (await validateStoryTreeDrift(root, config(), "tdd")).map((item) => item.file);
    expect(reported).toContain(glossary);
    expect(reported).toContain(story);
    expect(reported).not.toContain(flows);
  });

  // QFAI:EX-0001-0002-15
  it("does not let a request the base holds at DONE regain authority by returning to WIP", async () => {
    const flows = `${specs}/02_business-flow/business-flows.md`;
    const done = `| DEC-0001 | Change request: ${glossary} | Applied | DONE |`;
    await put(decisions, `${table}${done}\n`);
    for (const file of [glossary, flows]) await put(file, "# Original\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    for (const file of [glossary, flows]) await put(file, "# Changed\n");
    await put(
      decisions,
      `${table}${done.replace("| DONE |", "| WIP |")}\n| DEC-0002 | Change request: ${flows} | Approved | WIP |\n`,
    );
    git("add", ".");
    git("commit", "-m", "reopen a completed request and add a new one");
    const reported = (await validateStoryTreeDrift(root, config(), "tdd")).map((item) => item.file);
    expect(reported).toContain(glossary);
    expect(reported).not.toContain(flows);
  });

  // QFAI:AC-0001-0054-04
  // QFAI:EX-0001-0054-06
  // QFAI:EX-0001-0002-06
  // QFAI:EX-0001-0054-07
  it("allows only appended change-request rows without another authorisation", async () => {
    await put(decisions, table);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    for (const status of ["TODO", "WIP"]) {
      await put(
        decisions,
        `${table}| DEC-0001 | Change request: ${glossary} | Reason | ${status} |\n`,
      );
      git("add", ".");
      git("commit", "-m", `change request ${status}`);
      expect(
        (await validateStoryTreeDrift(root, config(), "drift")).some(
          (item) => item.file === decisions,
        ),
      ).toBe(false);
    }
    await put(decisions, `${table}| DEC-0001 | Ordinary decision | Reason | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "ordinary decision");
    expect(
      (await validateStoryTreeDrift(root, config(), "drift")).some(
        (item) => item.file === decisions,
      ),
    ).toBe(true);
  });

  // QFAI:EX-0001-0054-08
  it("allows a change-request row to move from TODO to WIP", async () => {
    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Reason | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Reason | WIP |\n`);
    git("add", ".");
    git("commit", "-m", "approve request");
    expect(
      (await validateStoryTreeDrift(root, config(), "drift")).some(
        (item) => item.file === decisions,
      ),
    ).toBe(false);
  });

  // QFAI:EX-0001-0054-08
  it("reports a rewritten change-request row as an upstream edit and a rewritten row", async () => {
    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Reason | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(
      decisions,
      `${table}| DEC-0001 | Change request: ${glossary}, ${specs}/01_policy/objective.md | Reason | TODO |\n`,
    );
    git("add", ".");
    git("commit", "-m", "rewrite request");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(findings.some((item) => item.code === "QFAI-DRIFT-001" && item.file === decisions)).toBe(
      true,
    );
    expect(
      findings.some(
        (item) =>
          item.code === "QFAI-STORY-010" &&
          item.file === decisions &&
          item.message.includes("DEC-0001 content"),
      ),
    ).toBe(true);
  });

  describe("a row the base holds", () => {
    const objective = `${specs}/01_policy/objective.md`;

    async function glossaryEditedUnder(baseRow: string, headRow: string): Promise<void> {
      await put(decisions, `${table}${baseRow}\n`);
      await put(glossary, "# Original\n");
      await put(objective, "# Original\n");
      git("add", ".");
      git("commit", "-m", "base");
      git("checkout", "-b", "topic");
      await put(decisions, `${table}${headRow}\n`);
      await put(glossary, "# Changed\n");
      git("add", ".");
      git("commit", "-m", "edit glossary under the head row");
    }

    async function reportedGlossary(profile: "tdd" | "drift"): Promise<boolean> {
      const findings = await validateStoryTreeDrift(root, config(), profile);
      return findings.some((item) => item.code === "QFAI-DRIFT-001" && item.file === glossary);
    }

    // QFAI:EX-0001-0054-15
    it.each(["tdd", "drift"] as const)(
      "grants nothing for a path its rewritten Content names, in %s",
      async (profile) => {
        await glossaryEditedUnder(
          `| DEC-0001 | Change request: ${objective} | Approved | WIP |`,
          `| DEC-0001 | Change request: ${glossary} | Approved | WIP |`,
        );
        expect(await reportedGlossary(profile)).toBe(true);
      },
    );

    // QFAI:EX-0001-0054-15
    it.each(["tdd", "drift"] as const)(
      "grants nothing when an ordinary decision is rewritten into a change request, in %s",
      async (profile) => {
        await glossaryEditedUnder(
          "| DEC-0001 | Choice A | Reason | DONE |",
          `| DEC-0001 | Change request: ${glossary} | Reason | WIP |`,
        );
        expect(await reportedGlossary(profile)).toBe(true);
      },
    );

    // QFAI:EX-0001-0054-15
    it.each(["tdd", "drift"] as const)(
      "grants nothing for a path its rewritten Approach names, in %s",
      async (profile) => {
        await glossaryEditedUnder(
          `| DEC-0001 | Change request: ${glossary} | Reason | WIP |`,
          `| DEC-0001 | Change request: ${glossary} | Another reason | WIP |`,
        );
        expect(await reportedGlossary(profile)).toBe(true);
      },
    );

    // QFAI:EX-0001-0054-15
    it.each(["tdd", "drift"] as const)(
      "keeps authorising the path of an unchanged row, in %s",
      async (profile) => {
        const row = `| DEC-0001 | Change request: ${glossary} | Approved | WIP |`;
        await glossaryEditedUnder(row, row);
        expect(await reportedGlossary(profile)).toBe(false);
      },
    );

    // QFAI:EX-0001-0054-15
    it.each(["tdd", "drift"] as const)(
      "keeps authorising the path of a row that only advances its Status, in %s",
      async (profile) => {
        await glossaryEditedUnder(
          `| DEC-0001 | Change request: ${glossary} | Reason | TODO |`,
          `| DEC-0001 | Change request: ${glossary} | Reason | WIP |`,
        );
        expect(await reportedGlossary(profile)).toBe(false);
      },
    );
  });

  // QFAI:AC-0001-0007-02
  // QFAI:AC-0001-0054-01
  // QFAI:EX-0001-0007-07
  // QFAI:EX-0001-0054-02
  it("reports a rewritten decision row in drift even when a change request names the file", async () => {
    const questions = `${specs}/open-questions.md`;
    const questionTable = "| ID | Content | Approach | Status |\n| --- | --- | --- | --- |\n";
    await put(
      decisions,
      `${table}| DEC-0001 | Choice A | Reason | DONE |\n| DEC-0002 | Choice X | Reason | DONE |\n`,
    );
    await put(questions, `${questionTable}| OQ-0001 | Which layout | Pending | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(
      decisions,
      `${table}| DEC-0001 | Choice B | Reason | DONE |\n| DEC-0009 | Choice X | Reason | DONE |\n| DEC-0003 | Change request: ${decisions} | Approved | DONE |\n`,
    );
    await put(questions, `${questionTable}| OQ-0001 | Which layout | Pending | DONE |\n`);
    git("add", ".");
    git("commit", "-m", "rewrite row");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    const rewritten = findings.filter((item) => item.code === "QFAI-STORY-010");
    expect(
      rewritten.some(
        (item) => item.file === decisions && item.message.includes("DEC-0001 content"),
      ),
    ).toBe(true);
    expect(
      rewritten.some((item) => item.file === decisions && item.message.includes("DEC-0002 id")),
    ).toBe(true);
    expect(rewritten.some((item) => item.file === questions)).toBe(false);
  });

  // QFAI:AC-0001-0007-02
  // QFAI:EX-0001-0007-06
  it("accepts a status advance with an appended decision", async () => {
    await put(decisions, `${table}| DEC-0001 | Choice A | Reason | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(
      decisions,
      `${table}| DEC-0001 | Choice A | Reason | DONE |\n| DEC-0002 | New choice | Reason | TODO |\n`,
    );
    git("add", ".");
    git("commit", "-m", "advance and append");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(findings.some((item) => item.code === "QFAI-STORY-010")).toBe(false);
  });

  // QFAI:AC-0001-0007-02
  // QFAI:AC-0001-0054-01
  // QFAI:EX-0001-0007-08
  // QFAI:EX-0001-0054-01
  it("reports removal of an existing decision row", async () => {
    await put(decisions, `${table}| DEC-0001 | Choice A | Reason | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(decisions, table);
    git("add", ".");
    git("commit", "-m", "remove row");
    const findings = await validateStoryTreeDrift(root, config(), "drift");
    expect(
      findings.some(
        (item) =>
          item.code === "QFAI-STORY-010" &&
          item.file === decisions &&
          item.message.includes("DEC-0001"),
      ),
    ).toBe(true);
  });

  it("does not accuse the migration branch when the base has no story tree", async () => {
    await put("README.md", "base\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "migration");
    expect(await validateStoryTreeDrift(root, config(), "drift")).toEqual([]);
  });

  // QFAI:AC-0001-0054-05
  // QFAI:EX-0001-0054-09
  it("holds the tree to the base once a commit with a story tree is the base", async () => {
    const contractFile = `${specs}/03_contract/cli/command.md`;
    await put("README.md", "base\n");
    git("add", ".");
    git("commit", "-m", "base without a story tree");
    git("checkout", "-b", "topic");
    await put(decisions, `${table}| DEC-0001 | Choice A | Reason | TODO |\n`);
    await put(glossary, "# Terms\n");
    await put(contractFile, "# Command\n");
    git("add", ".");
    git("commit", "-m", "add the story tree");
    for (const profile of ["tdd", "drift"] as const) {
      expect(await validateStoryTreeDrift(root, config(), profile)).toEqual([]);
    }

    git("checkout", "main");
    git("merge", "--ff-only", "topic");
    git("checkout", "-b", "next");
    await put(glossary, "# Terms\nUpdated\n");
    git("add", ".");
    git("commit", "-m", "edit the glossary");
    for (const profile of ["tdd", "drift"] as const) {
      const findings = await validateStoryTreeDrift(root, config(), profile);
      expect(findings.map((item) => `${item.code} ${item.file}`)).toEqual([
        `QFAI-DRIFT-001 ${glossary}`,
      ]);
    }
  });

  it("does not report drift when the base ref or git repository is unavailable", async () => {
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    const missing = config();
    missing.baseBranch = "missing/base";
    expect(await validateStoryTreeDrift(root, missing, "drift")).toEqual([]);
    const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-story-no-git-"));
    try {
      expect(await validateStoryTreeDrift(outside, config(), "drift")).toEqual([]);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  // QFAI:AC-0001-0054-02
  // QFAI:EX-0001-0054-03
  it.each(["tdd", "drift"] as const)(
    "reports nothing in %s for a removed row and an edited policy file when the base cannot be resolved",
    async (profile) => {
      await put(decisions, `${table}| DEC-0001 | Choice A | Reason | TODO |\n`);
      await put(glossary, "# Terms\n");
      git("add", ".");
      git("commit", "-m", "base");
      git("checkout", "-b", "topic");
      await put(decisions, table);
      await put(glossary, "# Terms\nUpdated\n");
      git("add", ".");
      git("commit", "-m", "remove a row and edit the glossary");

      expect(
        (await validateStoryTreeDrift(root, config(), profile)).filter(
          (item) => item.file === decisions || item.file === glossary,
        ).length,
      ).toBeGreaterThan(0);

      const missing = config();
      missing.baseBranch = "missing/base";
      expect(await validateStoryTreeDrift(root, missing, profile)).toEqual([]);
    },
  );

  // QFAI:EX-0001-0054-04
  // QFAI:EX-0001-0054-05
  it("does not let a TODO change request authorise an edit and ignores unprotected tests", async () => {
    await put(decisions, table);
    await put(glossary, "# Terms\n");
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(glossary, "# Terms\nUpdated\n");
    await put("tests/unit/example.test.ts", "test\n");
    await put(decisions, `${table}| DEC-0001 | Change request: ${glossary} | Pending | TODO |\n`);
    git("add", ".");
    git("commit", "-m", "edit without approval");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(findings.some((item) => item.file === glossary)).toBe(true);
    expect(findings.some((item) => item.file?.includes("example.test.ts"))).toBe(false);
    expect(findings.some((item) => item.file === decisions)).toBe(false);
  });

  // QFAI:EX-0001-0054-13
  it("exempts a 03_Example.md change that only appends EX rows", async () => {
    const story = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001`;
    const appended = `${story}/03_Example.md`;
    const rewritten = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0002/03_Example.md`;
    const head = "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n";
    const first = "| EX-0001-0001-01 | AC-0001-0001-01 | An empty name | 400 |\n";
    await put(decisions, table);
    await put(appended, `# Examples\n\n${head}${first}`);
    await put(rewritten, `# Examples\n\n${head}${first.replaceAll("0001-01", "0002-01")}`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    // The appended row is wider, so the formatter re-pads every row of the table.
    await put(
      appended,
      "# Examples\n\n" +
        "| EX-ID           | AC-Ref          | Input                | Expected |\n" +
        "| --------------- | --------------- | -------------------- | -------- |\n" +
        "| EX-0001-0001-01 | AC-0001-0001-01 | An empty name        | 400      |\n" +
        "| EX-0001-0001-02 | AC-0001-0001-01 | A name of 300 chars  | 400      |\n",
    );
    await put(
      rewritten,
      `# Examples\n\n${head}| EX-0001-0002-01 | AC-0001-0002-01 | An empty name | 422 |\n| EX-0001-0002-02 | AC-0001-0002-01 | A long name | 400 |\n`,
    );
    git("add", ".");
    git("commit", "-m", "append examples");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(
      findings.filter((item) => item.code === "QFAI-DRIFT-001").map((item) => item.file),
    ).toEqual([rewritten]);
  });

  // QFAI:EX-0001-0054-13
  it("still reports a non-EX row, a deleted EX row and a new 03_Example.md", async () => {
    const flow = `${specs}/02_business-flow/business-flow-0001`;
    const noted = `${flow}/user-story-0001-0001/03_Example.md`;
    const pruned = `${flow}/user-story-0001-0002/03_Example.md`;
    const created = `${flow}/user-story-0001-0003/03_Example.md`;
    const head = "# Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n";
    const row = (story: string, n: string) =>
      `| EX-0001-${story}-${n} | AC-0001-${story}-01 | Case ${n} | 400 |\n`;
    await put(decisions, table);
    await put(noted, `${head}${row("0001", "01")}`);
    await put(pruned, `${head}${row("0002", "01")}${row("0002", "02")}`);
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(noted, `${head}${row("0001", "01")}| Note | - | - | - |\n`);
    await put(pruned, `${head}${row("0002", "01")}`);
    await put(created, `${head}${row("0003", "01")}`);
    git("add", ".");
    git("commit", "-m", "edit examples");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(
      findings
        .filter((item) => item.code === "QFAI-DRIFT-001")
        .map((item) => item.file)
        .sort(),
    ).toEqual([noted, pruned, created].sort());
  });

  // QFAI:EX-0001-0054-14
  it("exempts a contract change that only adds EX IDs to Examples cells", async () => {
    const cited = `${specs}/03_contract/cli/cli-0001-a.md`;
    const reworded = `${specs}/03_contract/cli/cli-0002-b.md`;
    const rules = (id: string, examples: string, statement = "An empty name is refused.") =>
      `# CLI-${id}\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-${id}-0001 | ${statement} | ${examples} |\n`;
    await put(decisions, table);
    await put(cited, rules("0001", "EX-0001-0001-01"));
    await put(reworded, rules("0002", "EX-0001-0002-01"));
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(cited, rules("0001", "EX-0001-0001-01, EX-0001-0001-02"));
    await put(
      reworded,
      rules("0002", "EX-0001-0002-01, EX-0001-0002-02", "An empty or blank name is refused."),
    );
    git("add", ".");
    git("commit", "-m", "cite appended examples");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(findings.map((item) => item.file)).toEqual([reworded]);
  });

  // QFAI:EX-0001-0054-13
  // QFAI:EX-0001-0054-14
  it("still reports a whitespace edit inside a cell beside an appended example", async () => {
    const examples = `${specs}/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md`;
    const contract = `${specs}/03_contract/cli/cli-0001-a.md`;
    const head = "# Examples\n\n| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n";
    const rule = (statement: string, cited: string) =>
      `# CLI-0001\n\n## Business rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001-0001 | ${statement} | ${cited} |\n`;
    await put(decisions, table);
    await put(examples, `${head}| EX-0001-0001-01 | AC-0001-0001-01 | An  empty name | 400 |\n`);
    await put(contract, rule("An  empty name is refused.", "EX-0001-0001-01"));
    git("add", ".");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    await put(
      examples,
      `${head}| EX-0001-0001-01 | AC-0001-0001-01 | An empty name | 400 |\n| EX-0001-0001-02 | AC-0001-0001-01 | A long name | 400 |\n`,
    );
    await put(contract, rule("An empty name is refused.", "EX-0001-0001-01, EX-0001-0001-02"));
    git("add", ".");
    git("commit", "-m", "edit inside cells");
    const findings = await validateStoryTreeDrift(root, config(), "tdd");
    expect(
      findings
        .filter((item) => item.code === "QFAI-DRIFT-001")
        .map((item) => item.file)
        .sort(),
    ).toEqual([contract, examples].sort());
  });
});
