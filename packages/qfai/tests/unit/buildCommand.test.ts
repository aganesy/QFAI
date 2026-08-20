/**
 * `tests/helpers/buildCommand.ts` — the predicate `US-0017-0004` rests on.
 *
 * Eight review rounds measured ten versions of it and each version was reported as clean by the party
 * that wrote it. Every corpus this stage chose flattered its own predicate; every corpus a reviewer
 * chose broke it. So the corpora below are, deliberately, **not** this stage's:
 *
 * - the twenty forms round 4's `qa-gatekeeper` measured as v4 regressions against v3;
 * - the forms v4 already handled, kept so a fix for the above cannot silently undo them;
 * - the non-builds rounds 2, 3 and 4 each added after a false positive;
 * - and the two cases from **this repository** where a script's name and a script's behaviour
 *   disagree, which is what v4 was actually measuring.
 *
 * The last group is the reason `classifyBuildCommand` takes a script map. `pnpm ci:build-verify`
 * *names* a build and reaches none — its body is `node ./scripts/check-build-warnings.mjs && …`, and
 * the build is spawned inside that helper, invisible to any command-line scan. `pnpm pack` names no
 * build and reaches `tsup` through the `prepack` hook. v4 got the first one right by coincidence and
 * the second one wrong.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  type BuildVerdict,
  classifyBuildCommand,
  GRAMMAR,
  reachesBuild,
  type ScriptSources,
} from "../helpers/buildCommand.js";

const ROOT = path.resolve(__dirname, "../../../..");

async function scriptsOf(relative: string): Promise<Record<string, string>> {
  const text = await readFile(path.join(ROOT, relative), "utf8");
  const parsed: unknown = JSON.parse(text);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("scripts" in parsed) ||
    typeof parsed.scripts !== "object" ||
    parsed.scripts === null
  ) {
    return {};
  }
  const scripts: Record<string, string> = {};
  for (const [name, body] of Object.entries(parsed.scripts)) {
    if (typeof body === "string") scripts[name] = body;
  }
  return scripts;
}

/**
 * The two manifests, keyed by directory rather than merged.
 *
 * Merging them was the first attempt and it cannot work: the root `build` is
 * `pnpm -C packages/qfai build` and the package's `build` is `tsup`, so one map makes the name
 * self-referential and resolves to nothing at all. The `-C` argument is what selects the manifest.
 */
async function repositorySources(): Promise<ScriptSources> {
  return {
    manifests: {
      "": await scriptsOf("package.json"),
      "packages/qfai": await scriptsOf("packages/qfai/package.json"),
    },
  };
}

const TOOL_LISTS = [
  "dirs",
  "values",
  "optional",
  "buildFlags",
  "builds",
  "buildPrefixes",
  "stops",
] as const;
const INTERPRETER_LISTS = ["values", "inline"] as const;

/**
 * Synthetic manifests for the member cases. Deliberately minimal: `hello` is a build in `sub` and not
 * at the root, so a directory flag either moved the lookup or it did not.
 */
const SYNTHETIC: ScriptSources = {
  manifests: {
    "": {
      hello: "echo hi",
      build: "tsup",
      run: "echo running",
      exec: "echo exec",
      dlx: "echo dlx",
      workspaces: "echo ws",
    },
    sub: { hello: "tsup" },
    onlypre: { publish: "echo p", prepublishOnly: "tsup" },
    onlyprepack: { publish: "echo p", prepack: "tsup" },
  },
};

/**
 * Every member of `GRAMMAR`, as the dotted paths `MEMBER_CASES` labels its cases with.
 *
 * Rules are members too. Round 9 measured `isSetting` reducible to a constant `false` with the whole
 * corpus green, and six script extensions and two name separators deletable the same way — all because
 * the sweep's reach is exactly what `GRAMMAR` exports and none of them were in it.
 */
function grammarMembers(): string[] {
  const out: string[] = [];
  const sets: ReadonlyArray<readonly [string, Iterable<string>]> = [
    ["MANAGERS", GRAMMAR.managers],
    ["BUNDLERS", GRAMMAR.bundlers],
    ["MANAGER_PASS", GRAMMAR.managerPass],
    ["MANAGER_CONSUMING", GRAMMAR.managerConsuming],
    ["MANAGER_DIRS", GRAMMAR.managerDirs],
    ["TARGET_FLAGS", GRAMMAR.targetFlags],
    ["NO_SCRIPTS", GRAMMAR.noScripts],
    ["NEVER_FLAGS", GRAMMAR.neverFlags],
    ["WRAPPERS", GRAMMAR.wrappers],
    ["EXISTENCE_PROBE", GRAMMAR.existenceProbe],
    ["SCRIPT_EXTENSIONS", GRAMMAR.scriptExtensions],
    ["NAME_SEPARATORS", GRAMMAR.nameSeparators],
  ];
  for (const [name, set] of sets) {
    for (const member of set) out.push(`${name}.${member}`);
  }
  for (const [hook, members] of Object.entries(GRAMMAR.lifecycle)) {
    for (const member of members) out.push(`LIFECYCLE.${hook}.${member}`);
  }
  for (const rule of Object.keys(GRAMMAR.rules)) out.push(`RULES.${rule}`);
  for (const [tool, grammar] of Object.entries(GRAMMAR.tools)) {
    out.push(`TOOLS.${tool}`);
    for (const field of TOOL_LISTS) {
      for (const member of grammar[field] ?? []) out.push(`TOOLS.${tool}.${field}.${member}`);
    }
    if (grammar.bareIsBuild === true) out.push(`TOOLS.${tool}.bareIsBuild`);
  }
  for (const [name, grammar] of Object.entries(GRAMMAR.interpreters)) {
    out.push(`INTERPRETERS.${name}`);
    for (const field of INTERPRETER_LISTS) {
      for (const member of grammar[field]) out.push(`INTERPRETERS.${name}.${field}.${member}`);
    }
  }
  // `gradle`/`gradlew` and `docker`/`podman` and `pwsh`/`powershell` share one object each, so the
  // same member appears under two names. That is the point of sharing — a flag cannot be added to one
  // spelling and forgotten in the other — and it means the member list has duplicates by design.
  return [...new Set(out)];
}

/**
 * One case per grammar member: `[member, verdict, command]`, against `SYNTHETIC`.
 *
 * Hardcoded on purpose. Each command was checked to change verdict when its member is deleted — a
 * probe generated from the set cannot have that property, because it disappears with the member.
 *
 * Three of them are worth reading for the shape of the argument:
 *
 * - `TARGET_FLAGS.-m` is `python -m build.cli`, not `python -m build`. The plain form pins nothing:
 *   without the flag rule, the bare `build` is a candidate subcommand anyway. A path-like value is only
 *   ever read as a target by the flag rule.
 * - a tool's value flag is pinned by `<tool> <flag> build clean` expecting `none` — the flag has to
 *   swallow the word `build`. Terse, and the only shape where the membership is what decides.
 * - `MANAGERS.node` is `pnpm exec node --run build`, because `node --run` is matched by a literal head
 *   check and never consults the set.
 */
const MEMBER_CASES: ReadonlyArray<readonly [string, BuildVerdict, string]> = [
  ["MANAGERS.pnpm", "build", "pnpm build"],
  ["MANAGERS.npm", "build", "npm build"],
  ["MANAGERS.yarn", "build", "yarn build"],
  ["MANAGERS.npx", "build", "npx build"],
  ["MANAGERS.pnpx", "build", "pnpx build"],
  ["MANAGERS.bunx", "build", "bunx build"],
  ["MANAGERS.bun", "build", "bun build"],
  ["MANAGERS.node", "build", "pnpm exec node --run build"],
  ["BUNDLERS.tsup", "build", "npx tsup"],
  ["BUNDLERS.rollup", "build", "npx rollup"],
  ["BUNDLERS.esbuild", "build", "npx esbuild"],
  ["BUNDLERS.webpack", "build", "npx webpack"],
  ["BUNDLERS.swc", "build", "npx swc"],
  ["BUNDLERS.parcel", "build", "npx parcel"],
  ["BUNDLERS.vite", "build", "npx vite"],
  ["BUNDLERS.rspack", "build", "npx rspack"],
  ["BUNDLERS.rolldown", "build", "npx rolldown"],
  ["BUNDLERS.msbuild", "build", "npx msbuild"],
  ["BUNDLERS.xcodebuild", "build", "npx xcodebuild"],
  ["MANAGER_PASS.run", "build", "pnpm run build"],
  ["MANAGER_PASS.exec", "build", "pnpm exec build"],
  ["MANAGER_PASS.dlx", "build", "pnpm dlx build"],
  ["MANAGER_PASS.workspaces", "build", "pnpm workspaces build"],
  ["MANAGER_CONSUMING.workspace", "build", "yarn workspace qfai build"],
  ["MANAGER_DIRS.-C", "build", "pnpm -C sub hello"],
  ["MANAGER_DIRS.--dir", "build", "pnpm --dir sub hello"],
  ["MANAGER_DIRS.--cwd", "build", "pnpm --cwd sub hello"],
  ["MANAGER_DIRS.--prefix", "build", "pnpm --prefix sub hello"],
  ["TARGET_FLAGS.-m", "build", "python -m build.cli"],
  ["TARGET_FLAGS.--target", "build", "nx --target=build web"],
  ["NO_SCRIPTS.--ignore-scripts", "none", "pnpm -C onlyprepack pack --ignore-scripts"],
  ["NO_SCRIPTS.--no-scripts", "none", "pnpm -C onlyprepack pack --no-scripts"],
  ["WRAPPERS.time", "build", "time pnpm build"],
  ["WRAPPERS.sudo", "build", "sudo pnpm build"],
  ["WRAPPERS.nice", "build", "nice pnpm build"],
  ["WRAPPERS.ionice", "build", "ionice pnpm build"],
  ["WRAPPERS.xvfb-run", "build", "xvfb-run pnpm build"],
  ["WRAPPERS.command", "build", "command pnpm build"],
  ["WRAPPERS.stdbuf", "build", "stdbuf pnpm build"],
  ["WRAPPERS.nohup", "build", "nohup pnpm build"],
  ["WRAPPERS.env", "build", "env pnpm build"],
  ["INTERPRETERS.bash", "heuristic", "bash scripts/build.sh"],
  ["INTERPRETERS.sh", "heuristic", "sh scripts/build.sh"],
  ["INTERPRETERS.zsh", "heuristic", "zsh scripts/build.sh"],
  ["INTERPRETERS.pwsh", "heuristic", "pwsh scripts/build.sh"],
  ["INTERPRETERS.powershell", "heuristic", "powershell scripts/build.sh"],
  ["LIFECYCLE.pack.prepack", "build", "pnpm -C onlyprepack pack"],
  ["LIFECYCLE.publish.prepublishOnly", "build", "pnpm -C onlypre publish"],
  ["LIFECYCLE.publish.prepack", "build", "pnpm -C onlyprepack publish"],
  ["TOOLS.turbo", "build", "turbo build"],
  ["TOOLS.turbo.dirs.--cwd", "none", "turbo --cwd build clean"],
  ["TOOLS.turbo.values.--concurrency", "none", "turbo --concurrency build clean"],
  ["TOOLS.turbo.values.--filter", "none", "turbo --filter build clean"],
  ["TOOLS.nx", "build", "nx build"],
  ["TOOLS.nx.values.--projects", "none", "nx --projects build clean"],
  ["TOOLS.nx.values.--configuration", "none", "nx --configuration build clean"],
  ["TOOLS.lerna", "build", "lerna build"],
  ["TOOLS.lerna.values.--concurrency", "none", "lerna --concurrency build clean"],
  ["TOOLS.rush", "build", "rush build"],
  ["TOOLS.rush.values.--to", "none", "rush --to build clean"],
  ["TOOLS.rush.values.--from", "none", "rush --from build clean"],
  ["TOOLS.make", "build", "make build"],
  ["TOOLS.make.dirs.-C", "none", "make -C build clean"],
  ["TOOLS.make.dirs.--directory", "none", "make --directory build clean"],
  ["TOOLS.make.values.-f", "none", "make -f build clean"],
  ["TOOLS.make.values.--file", "none", "make --file build clean"],
  ["TOOLS.cmake", "build", "cmake build"],
  ["TOOLS.cmake.dirs.--install", "none", "cmake --install build clean"],
  ["TOOLS.cmake.dirs.-B", "none", "cmake -B build clean"],
  ["TOOLS.cmake.dirs.-S", "none", "cmake -S build clean"],
  ["TOOLS.cmake.dirs.--prefix", "none", "cmake --prefix build clean"],
  ["TOOLS.cmake.values.--config", "none", "cmake --config build clean"],
  ["TOOLS.cmake.values.-G", "none", "cmake -G build clean"],
  ["TOOLS.cmake.values.-D", "none", "cmake -D build clean"],
  ["TOOLS.cmake.buildFlags.--build", "build", "cmake --build ."],
  ["TOOLS.ninja", "build", "ninja build"],
  ["TOOLS.ninja.dirs.-C", "none", "ninja -C build clean"],
  ["TOOLS.ninja.values.-j", "none", "ninja -j build clean"],
  ["TOOLS.ninja.values.-k", "none", "ninja -k build clean"],
  ["TOOLS.ninja.values.-f", "none", "ninja -f build clean"],
  ["TOOLS.bazel", "build", "bazel build"],
  ["TOOLS.bazel.dirs.--output_base", "none", "bazel --output_base build clean"],
  ["TOOLS.bazel.dirs.--output_user_root", "none", "bazel --output_user_root build clean"],
  ["TOOLS.bazel.values.--config", "none", "bazel --config build clean"],
  ["TOOLS.buck", "build", "buck build"],
  ["TOOLS.buck.values.--config", "none", "buck --config build clean"],
  ["TOOLS.just", "build", "just build"],
  ["TOOLS.just.dirs.-d", "none", "just -d build clean"],
  ["TOOLS.just.dirs.--working-directory", "none", "just --working-directory build clean"],
  ["TOOLS.just.values.--set", "none", "just --set build clean"],
  ["TOOLS.task", "build", "task build"],
  ["TOOLS.task.dirs.-d", "none", "task -d build clean"],
  ["TOOLS.task.dirs.--dir", "none", "task --dir build clean"],
  ["TOOLS.task.values.-p", "none", "task -p build clean"],
  ["TOOLS.task.values.--parallel", "none", "task --parallel build clean"],
  ["TOOLS.waf", "build", "waf build"],
  ["TOOLS.waf.values.-j", "none", "waf -j build clean"],
  ["TOOLS.waf.values.--jobs", "none", "waf --jobs build clean"],
  ["TOOLS.dune", "build", "dune build"],
  ["TOOLS.dune.dirs.--root", "none", "dune --root build clean"],
  ["TOOLS.dune.values.-j", "none", "dune -j build clean"],
  ["TOOLS.dune.values.--profile", "none", "dune --profile build clean"],
  ["TOOLS.stack", "build", "stack build"],
  ["TOOLS.stack.dirs.--work-dir", "none", "stack --work-dir build clean"],
  ["TOOLS.stack.values.--resolver", "none", "stack --resolver build clean"],
  ["TOOLS.cargo", "build", "cargo build"],
  ["TOOLS.cargo.dirs.--target-dir", "none", "cargo --target-dir build clean"],
  ["TOOLS.cargo.dirs.--manifest-path", "none", "cargo --manifest-path build clean"],
  ["TOOLS.cargo.values.--color", "none", "cargo --color build clean"],
  ["TOOLS.cargo.values.--config", "none", "cargo --config build clean"],
  ["TOOLS.cargo.values.-j", "none", "cargo -j build clean"],
  ["TOOLS.cargo.values.--jobs", "none", "cargo --jobs build clean"],
  ["TOOLS.cargo.values.--features", "none", "cargo --features build clean"],
  ["TOOLS.go", "build", "go build"],
  ["TOOLS.go.dirs.-C", "none", "go -C build clean"],
  ["TOOLS.go.values.-o", "none", "go -o build clean"],
  ["TOOLS.go.values.-tags", "none", "go -tags build clean"],
  ["TOOLS.gradle", "build", "gradle build"],
  ["TOOLS.gradle.dirs.-p", "none", "gradle -p build clean"],
  ["TOOLS.gradle.dirs.--project-dir", "none", "gradle --project-dir build clean"],
  ["TOOLS.gradle.values.--console", "none", "gradle --console build clean"],
  ["TOOLS.gradle.values.--max-workers", "none", "gradle --max-workers build clean"],
  ["TOOLS.gradle.values.--build-file", "none", "gradle --build-file build clean"],
  ["TOOLS.gradle.values.-b", "none", "gradle -b build clean"],
  ["TOOLS.gradle.values.--init-script", "none", "gradle --init-script build clean"],
  ["TOOLS.gradlew", "build", "gradlew build"],
  ["TOOLS.gradlew.dirs.-p", "none", "gradlew -p build clean"],
  ["TOOLS.gradlew.dirs.--project-dir", "none", "gradlew --project-dir build clean"],
  ["TOOLS.gradlew.values.--console", "none", "gradlew --console build clean"],
  ["TOOLS.gradlew.values.--max-workers", "none", "gradlew --max-workers build clean"],
  ["TOOLS.gradlew.values.--build-file", "none", "gradlew --build-file build clean"],
  ["TOOLS.gradlew.values.-b", "none", "gradlew -b build clean"],
  ["TOOLS.mvn", "build", "mvn build"],
  ["TOOLS.mvn.dirs.-f", "none", "mvn -f build clean"],
  ["TOOLS.mvn.dirs.--file", "none", "mvn --file build clean"],
  ["TOOLS.mvn.values.-P", "none", "mvn -P build clean"],
  ["TOOLS.mvn.values.-D", "none", "mvn -D build clean"],
  ["TOOLS.mvn.values.-T", "none", "mvn -T build clean"],
  ["TOOLS.dotnet", "build", "dotnet build"],
  ["TOOLS.dotnet.dirs.-o", "none", "dotnet -o build clean"],
  ["TOOLS.dotnet.dirs.--output", "none", "dotnet --output build clean"],
  ["TOOLS.dotnet.values.--arch", "none", "dotnet --arch build clean"],
  ["TOOLS.dotnet.values.--os", "none", "dotnet --os build clean"],
  ["TOOLS.dotnet.values.--framework", "none", "dotnet --framework build clean"],
  ["TOOLS.dotnet.values.-c", "none", "dotnet -c build clean"],
  ["TOOLS.dotnet.values.--configuration", "none", "dotnet --configuration build clean"],
  ["TOOLS.dotnet.values.-r", "none", "dotnet -r build clean"],
  ["TOOLS.dotnet.values.--runtime", "none", "dotnet --runtime build clean"],
  ["TOOLS.dotnet.values.-v", "none", "dotnet -v build clean"],
  ["TOOLS.dotnet.values.--verbosity", "none", "dotnet --verbosity build clean"],
  ["TOOLS.swift", "build", "swift build"],
  ["TOOLS.swift.dirs.--package-path", "none", "swift --package-path build clean"],
  ["TOOLS.swift.values.-c", "none", "swift -c build clean"],
  ["TOOLS.swift.values.--configuration", "none", "swift --configuration build clean"],
  ["TOOLS.zig", "build", "zig build"],
  ["TOOLS.zig.values.-target", "none", "zig -target build clean"],
  ["TOOLS.docker", "build", "docker build"],
  ["TOOLS.docker.dirs.-f", "none", "docker -f build clean"],
  ["TOOLS.docker.dirs.--file", "none", "docker --file build clean"],
  ["TOOLS.docker.values.-t", "none", "docker -t build clean"],
  ["TOOLS.docker.values.--tag", "none", "docker --tag build clean"],
  ["TOOLS.docker.values.--build-arg", "none", "docker --build-arg build clean"],
  ["TOOLS.docker.values.-H", "none", "docker -H build clean"],
  ["TOOLS.docker.values.--platform", "none", "docker --platform build clean"],
  ["TOOLS.docker.values.--name", "none", "docker --name build clean"],
  ["TOOLS.podman", "build", "podman build"],
  ["TOOLS.podman.dirs.-f", "none", "podman -f build clean"],
  ["TOOLS.podman.dirs.--file", "none", "podman --file build clean"],
  ["TOOLS.podman.values.-t", "none", "podman -t build clean"],
  ["TOOLS.podman.values.--tag", "none", "podman --tag build clean"],
  ["TOOLS.podman.values.--build-arg", "none", "podman --build-arg build clean"],
  ["TOOLS.poetry", "build", "poetry build"],
  ["TOOLS.poetry.dirs.-C", "none", "poetry -C build clean"],
  ["TOOLS.poetry.dirs.--directory", "none", "poetry --directory build clean"],
  ["TOOLS.poetry.values.--format", "none", "poetry --format build clean"],
  ["TOOLS.flutter", "build", "flutter build"],
  ["TOOLS.flutter.values.--flavor", "none", "flutter --flavor build clean"],
  ["TOOLS.flutter.values.-t", "none", "flutter -t build clean"],
  ["TOOLS.python", "build", "python -m build"],
  ["TOOLS.python.values.-c", "none", "python -c build clean"],
  ["TOOLS.python3", "build", "python3 -m build"],
  ["TOOLS.python3.values.-c", "none", "python3 -c build clean"],
  ["TOOLS.sbt", "build", "sbt build"],
  ["TOOLS.rake", "build", "rake build"],
  ["TOOLS.rake.dirs.-C", "none", "rake -C build clean"],
  ["TOOLS.rake.values.-f", "none", "rake -f build clean"],
  ["MANAGERS.npm-run-all", "build", "npm-run-all build"],
  ["MANAGERS.run-s", "build", "run-s build"],
  ["MANAGERS.run-p", "build", "run-p build"],
  ["MANAGER_PASS.foreach", "build", "yarn workspaces foreach --all run build"],
  ["NEVER_FLAGS.--help", "none", "pnpm build --help"],
  ["NEVER_FLAGS.-h", "none", "pnpm build -h"],
  ["NEVER_FLAGS.--version", "none", "pnpm build --version"],
  ["NEVER_FLAGS.--dry-run", "none", "pnpm build --dry-run"],
  ["NEVER_FLAGS.--print", "none", "pnpm build --print"],
  ["NEVER_FLAGS.--noEmit", "none", "pnpm build --noEmit"],
  ["WRAPPERS.cross-env", "build", "cross-env pnpm build"],
  ["WRAPPERS.setsid", "build", "setsid pnpm build"],
  ["WRAPPERS.unbuffer", "build", "unbuffer pnpm build"],
  ["WRAPPERS.flock", "build", "flock pnpm build"],
  ["WRAPPERS.taskset", "build", "taskset pnpm build"],
  ["WRAPPERS.chrt", "build", "chrt pnpm build"],
  ["WRAPPERS.retry", "build", "retry pnpm build"],
  ["WRAPPERS.script", "build", "script pnpm build"],
  ["WRAPPERS.concurrently", "build", "concurrently pnpm build"],
  ["EXISTENCE_PROBE.-v", "none", "command -v tsup"],
  ["EXISTENCE_PROBE.-V", "none", "command -V tsup"],
  ["SCRIPT_EXTENSIONS.sh", "heuristic", "./scripts/build.sh"],
  ["SCRIPT_EXTENSIONS.ps1", "heuristic", "./scripts/build.ps1"],
  ["SCRIPT_EXTENSIONS.bat", "heuristic", "./scripts/build.bat"],
  ["SCRIPT_EXTENSIONS.cmd", "heuristic", "./scripts/build.cmd"],
  ["SCRIPT_EXTENSIONS.mjs", "heuristic", "./scripts/build.mjs"],
  ["SCRIPT_EXTENSIONS.cjs", "heuristic", "./scripts/build.cjs"],
  ["SCRIPT_EXTENSIONS.js", "heuristic", "./scripts/build.js"],
  ["SCRIPT_EXTENSIONS.ts", "heuristic", "./scripts/build.ts"],
  ["NAME_SEPARATORS.:", "heuristic", "pnpm run build:main"],
  ["NAME_SEPARATORS.-", "heuristic", "pnpm run pre-build"],
  ["NAME_SEPARATORS._", "heuristic", "pnpm build_all"],
  ["NAME_SEPARATORS..", "heuristic", "pnpm run build.prod"],
  ["NAME_SEPARATORS./", "heuristic", "pnpm run ci/build"],
  ["RULES.isSetting", "none", "make build_dir=out clean"],
  ["RULES.isPathLike", "none", "bazel test //src/build:tests"],
  ["TOOLS.make.values.-o", "none", "make -o build clean"],
  ["TOOLS.make.values.--old-file", "none", "make --old-file build clean"],
  ["TOOLS.make.values.-W", "none", "make -W build clean"],
  ["TOOLS.make.values.--what-if", "none", "make --what-if build clean"],
  ["TOOLS.make.optional.-j", "build", "make -j 4"],
  ["TOOLS.make.optional.--jobs", "build", "make --jobs 4"],
  ["TOOLS.make.optional.-l", "build", "make -l 4"],
  ["TOOLS.make.optional.--load-average", "build", "make --load-average 4"],
  ["TOOLS.make.builds.all", "build", "make all"],
  ["TOOLS.make.bareIsBuild", "build", "make"],
  ["TOOLS.ninja.bareIsBuild", "build", "ninja"],
  ["TOOLS.just.bareIsBuild", "build", "just"],
  ["TOOLS.task.bareIsBuild", "build", "task"],
  ["TOOLS.waf.bareIsBuild", "build", "waf"],
  ["TOOLS.cargo.builds.install", "build", "cargo install"],
  ["TOOLS.go.builds.install", "build", "go install"],
  ["TOOLS.gradle.values.-x", "none", "gradle -x build clean"],
  ["TOOLS.gradle.values.--exclude-task", "none", "gradle --exclude-task build clean"],
  ["TOOLS.gradle.builds.jar", "build", "gradle jar"],
  ["TOOLS.gradle.builds.war", "build", "gradle war"],
  ["TOOLS.gradle.builds.bootJar", "build", "gradle bootJar"],
  ["TOOLS.gradle.builds.shadowJar", "build", "gradle shadowJar"],
  ["TOOLS.gradle.builds.installDist", "build", "gradle installDist"],
  ["TOOLS.gradle.buildPrefixes.assemble", "build", "gradle assembleRelease"],
  ["TOOLS.gradle.buildPrefixes.bundle", "build", "gradle bundleRelease"],
  ["TOOLS.gradlew.values.--init-script", "none", "gradlew --init-script build clean"],
  ["TOOLS.gradlew.values.-x", "none", "gradlew -x build clean"],
  ["TOOLS.gradlew.values.--exclude-task", "none", "gradlew --exclude-task build clean"],
  ["TOOLS.gradlew.builds.jar", "build", "gradlew jar"],
  ["TOOLS.gradlew.builds.war", "build", "gradlew war"],
  ["TOOLS.gradlew.builds.bootJar", "build", "gradlew bootJar"],
  ["TOOLS.gradlew.builds.shadowJar", "build", "gradlew shadowJar"],
  ["TOOLS.gradlew.builds.installDist", "build", "gradlew installDist"],
  ["TOOLS.gradlew.buildPrefixes.assemble", "build", "gradlew assembleRelease"],
  ["TOOLS.gradlew.buildPrefixes.bundle", "build", "gradlew bundleRelease"],
  ["TOOLS.mvn.builds.package", "build", "mvn package"],
  ["TOOLS.mvn.builds.install", "build", "mvn install"],
  ["TOOLS.mvn.builds.verify", "build", "mvn verify"],
  ["TOOLS.mvn.builds.compile", "build", "mvn compile"],
  ["TOOLS.mvn.builds.deploy", "build", "mvn deploy"],
  ["TOOLS.dotnet.values.-a", "none", "dotnet -a build clean"],
  ["TOOLS.dotnet.builds.publish", "build", "dotnet publish"],
  ["TOOLS.dotnet.builds.pack", "build", "dotnet pack"],
  ["TOOLS.meson", "build", "meson compile -C builddir"],
  ["TOOLS.meson.dirs.-C", "none", "meson -C build clean"],
  ["TOOLS.meson.values.-D", "none", "meson -D build clean"],
  ["TOOLS.meson.builds.compile", "build", "meson compile"],
  ["TOOLS.scons", "build", "scons"],
  ["TOOLS.scons.values.-j", "none", "scons -j build clean"],
  ["TOOLS.scons.bareIsBuild", "build", "scons"],
  ["TOOLS.tsc", "build", "tsc -b"],
  ["TOOLS.tsc.values.-p", "none", "tsc -p build clean"],
  ["TOOLS.tsc.values.--project", "none", "tsc --project build clean"],
  ["TOOLS.tsc.values.-t", "none", "tsc -t build clean"],
  ["TOOLS.tsc.values.--module", "none", "tsc --module build clean"],
  ["TOOLS.tsc.buildFlags.-b", "build", "tsc -b dist"],
  ["TOOLS.tsc.buildFlags.--build", "build", "tsc --build ."],
  ["TOOLS.tsc.buildFlags.--outDir", "build", "tsc --outDir dist"],
  ["TOOLS.tsc.buildFlags.--outFile", "build", "tsc --outFile dist"],
  ["TOOLS.tsc.buildFlags.--emitDeclarationOnly", "build", "tsc --emitDeclarationOnly dist"],
  ["TOOLS.tsc.bareIsBuild", "build", "tsc"],
  ["TOOLS.docker.values.-p", "none", "docker -p build clean"],
  ["TOOLS.docker.values.--project-name", "none", "docker --project-name build clean"],
  ["TOOLS.docker.stops.run", "none", "docker run --rm alpine echo build-info"],
  ["TOOLS.docker.stops.exec", "none", "docker exec --rm alpine echo build-info"],
  ["TOOLS.podman.values.-H", "none", "podman -H build clean"],
  ["TOOLS.podman.values.--platform", "none", "podman --platform build clean"],
  ["TOOLS.podman.values.--name", "none", "podman --name build clean"],
  ["TOOLS.podman.values.-p", "none", "podman -p build clean"],
  ["TOOLS.podman.values.--project-name", "none", "podman --project-name build clean"],
  ["TOOLS.podman.stops.run", "none", "podman run --rm alpine echo build-info"],
  ["TOOLS.podman.stops.exec", "none", "podman exec --rm alpine echo build-info"],
  ["TOOLS.docker-compose", "build", "docker-compose build"],
  ["TOOLS.docker-compose.dirs.-f", "none", "docker-compose -f build clean"],
  ["TOOLS.docker-compose.dirs.--file", "none", "docker-compose --file build clean"],
  ["TOOLS.docker-compose.values.-p", "none", "docker-compose -p build clean"],
  [
    "TOOLS.docker-compose.values.--project-name",
    "none",
    "docker-compose --project-name build clean",
  ],
  ["TOOLS.python.builds.bdist_wheel", "build", "python bdist_wheel"],
  ["TOOLS.python.builds.sdist", "build", "python sdist"],
  ["TOOLS.python.builds.build_ext", "build", "python build_ext"],
  ["TOOLS.python3.builds.bdist_wheel", "build", "python3 bdist_wheel"],
  ["TOOLS.python3.builds.sdist", "build", "python3 sdist"],
  ["TOOLS.python3.builds.build_ext", "build", "python3 build_ext"],
  ["TOOLS.sbt.builds.compile", "build", "sbt compile"],
  ["TOOLS.sbt.builds.package", "build", "sbt package"],
  ["TOOLS.sbt.builds.assembly", "build", "sbt assembly"],
  ["TOOLS.sbt.builds.stage", "build", "sbt stage"],
  ["TOOLS.rake.bareIsBuild", "build", "rake"],
  ["INTERPRETERS.bash.values.-o", "heuristic", "bash -o pipefail scripts/build.sh"],
  ["INTERPRETERS.bash.values.--rcfile", "heuristic", "bash --rcfile rc scripts/build.sh"],
  ["INTERPRETERS.bash.values.--init-file", "heuristic", "bash --init-file rc scripts/build.sh"],
  ["INTERPRETERS.sh.values.-o", "heuristic", "sh -o pipefail scripts/build.sh"],
  ["INTERPRETERS.zsh.values.-o", "heuristic", "zsh -o pipefail scripts/build.sh"],
  ["INTERPRETERS.zsh.values.--rcs", "heuristic", "zsh --rcs rc scripts/build.sh"],
  [
    "INTERPRETERS.pwsh.values.-ExecutionPolicy",
    "heuristic",
    "pwsh -ExecutionPolicy Bypass scripts/build.sh",
  ],
  [
    "INTERPRETERS.pwsh.values.-WorkingDirectory",
    "heuristic",
    "pwsh -WorkingDirectory sub scripts/build.sh",
  ],
  [
    "INTERPRETERS.pwsh.values.-OutputFormat",
    "heuristic",
    "pwsh -OutputFormat Text scripts/build.sh",
  ],
  ["INTERPRETERS.pwsh.inline.-Command", "build", 'pwsh -Command "pnpm build"'],
  ["INTERPRETERS.pwsh.inline.-c", "build", 'pwsh -c "pnpm build"'],
  ["INTERPRETERS.pwsh.inline.-EncodedCommand", "build", 'pwsh -EncodedCommand "pnpm build"'],
  [
    "INTERPRETERS.powershell.values.-ExecutionPolicy",
    "heuristic",
    "powershell -ExecutionPolicy Bypass scripts/build.sh",
  ],
  [
    "INTERPRETERS.powershell.values.-WorkingDirectory",
    "heuristic",
    "powershell -WorkingDirectory sub scripts/build.sh",
  ],
  [
    "INTERPRETERS.powershell.values.-OutputFormat",
    "heuristic",
    "powershell -OutputFormat Text scripts/build.sh",
  ],
  ["INTERPRETERS.powershell.inline.-Command", "build", 'powershell -Command "pnpm build"'],
  ["INTERPRETERS.powershell.inline.-c", "build", 'powershell -c "pnpm build"'],
  [
    "INTERPRETERS.powershell.inline.-EncodedCommand",
    "build",
    'powershell -EncodedCommand "pnpm build"',
  ],
  ["TOOLS.docker.builds.bake", "build", "docker buildx bake -f docker-bake.hcl"],
  ["TOOLS.podman.builds.bake", "build", "podman buildx bake -f docker-bake.hcl"],
  ["WRAPPERS.timeout", "build", "timeout 600 pnpm build"],
];

/**
 * The sets `GRAMMAR` exports are the very objects the classifier reads, so a member can be deleted and
 * put back in process. That is what lets the sweep below be a test rather than a measurement someone
 * has to remember to re-run.
 */
const SETS: Readonly<Record<string, Set<string>>> = {
  MANAGERS: GRAMMAR.managers,
  BUNDLERS: GRAMMAR.bundlers,
  MANAGER_PASS: GRAMMAR.managerPass,
  MANAGER_CONSUMING: GRAMMAR.managerConsuming,
  MANAGER_DIRS: GRAMMAR.managerDirs,
  TARGET_FLAGS: GRAMMAR.targetFlags,
  NO_SCRIPTS: GRAMMAR.noScripts,
  NEVER_FLAGS: GRAMMAR.neverFlags,
  WRAPPERS: GRAMMAR.wrappers,
  EXISTENCE_PROBE: GRAMMAR.existenceProbe,
};

/** The two lists that build a regex and a split. Arrays, not sets, so they restore by content. */
const ARRAYS: Readonly<Record<string, string[]>> = {
  SCRIPT_EXTENSIONS: GRAMMAR.scriptExtensions,
  NAME_SEPARATORS: GRAMMAR.nameSeparators,
};

/**
 * Delete one member named by a `grammarMembers()` path; the returned function puts it back exactly.
 *
 * A set is restored by clearing and re-adding in the original order — appending would be enough for
 * behaviour, since every set is only ever read with `.has`, but not for the two tests that compare
 * member lists.
 */
function deleteMember(member: string): () => void {
  const parts = member.split(".");
  const head = parts[0] ?? "";

  if (head === "TOOLS") {
    const name = parts[1] ?? "";
    const original = GRAMMAR.tools[name];
    if (original === undefined) throw new Error(`no such tool: ${name}`);
    const restore = (): void => {
      GRAMMAR.tools[name] = original;
    };
    if (parts.length === 2) {
      // `Reflect.deleteProperty` rather than `delete`, which the lint rule bars on a computed key. The
      // key has to go: an entry with empty lists still makes the verb a known tool.
      Reflect.deleteProperty(GRAMMAR.tools, name);
      return restore;
    }
    if (parts[2] === "bareIsBuild") {
      GRAMMAR.tools[name] = { ...original, bareIsBuild: false };
      return restore;
    }
    const field = parts[2] ?? "";
    const flag = parts.slice(3).join(".");
    if (!TOOL_LISTS.some((known) => known === field)) {
      throw new Error(`no such tool field: ${field}`);
    }
    const list = original[field as (typeof TOOL_LISTS)[number]] ?? [];
    GRAMMAR.tools[name] = { ...original, [field]: list.filter((entry) => entry !== flag) };
    return restore;
  }

  if (head === "INTERPRETERS") {
    const name = parts[1] ?? "";
    const original = GRAMMAR.interpreters[name];
    if (original === undefined) throw new Error(`no such interpreter: ${name}`);
    const restore = (): void => {
      GRAMMAR.interpreters[name] = original;
    };
    if (parts.length === 2) {
      Reflect.deleteProperty(GRAMMAR.interpreters, name);
      return restore;
    }
    const field = parts[2] ?? "";
    const flag = parts.slice(3).join(".");
    if (!INTERPRETER_LISTS.some((known) => known === field)) {
      throw new Error(`no such interpreter field: ${field}`);
    }
    const list = original[field as (typeof INTERPRETER_LISTS)[number]];
    GRAMMAR.interpreters[name] = { ...original, [field]: list.filter((entry) => entry !== flag) };
    return restore;
  }

  if (head === "RULES") {
    // A rule is neutralised rather than deleted: replaced with the answer that stops it deciding
    // anything. `isSetting` was reducible to a constant `false` with the whole corpus green.
    const name = parts[1] ?? "";
    if (name !== "isSetting" && name !== "isPathLike") throw new Error(`no such rule: ${name}`);
    const original = GRAMMAR.rules[name];
    GRAMMAR.rules[name] = () => false;
    return () => {
      GRAMMAR.rules[name] = original;
    };
  }

  if (head === "LIFECYCLE") {
    const hook = parts[1] ?? "";
    const original = GRAMMAR.lifecycle[hook];
    if (original === undefined) throw new Error(`no such lifecycle hook: ${hook}`);
    const dropped = parts.slice(2).join(".");
    GRAMMAR.lifecycle[hook] = original.filter((entry) => entry !== dropped);
    return () => {
      GRAMMAR.lifecycle[hook] = original;
    };
  }

  const array = ARRAYS[head];
  if (array !== undefined) {
    const before = [...array];
    const dropped = parts.slice(1).join(".");
    // Spliced in place, because a regex is built from this array on every call — reassigning the
    // binding would leave the classifier reading the old one.
    const at = array.indexOf(dropped);
    if (at !== -1) array.splice(at, 1);
    return () => {
      array.length = 0;
      array.push(...before);
    };
  }

  const set = SETS[head];
  if (set === undefined) throw new Error(`no such grammar set: ${head}`);
  const before = [...set];
  set.delete(parts.slice(1).join("."));
  return () => {
    set.clear();
    for (const entry of before) set.add(entry);
  };
}

describe("classifyBuildCommand", () => {
  it("catches the twenty forms round 4 measured as v4 regressions", async () => {
    const sources = await repositorySources();
    const REGRESSIONS = [
      "npm ci && npm run build",
      "pnpm install --frozen-lockfile && pnpm build",
      "cd packages/qfai && pnpm build",
      "pnpm lint; pnpm build",
      "time pnpm build",
      "sudo make build",
      "env NODE_ENV=production pnpm build",
      "docker build -t qfai:ci .",
      "just build",
      "task build",
      "waf build",
      "dune build",
      "stack build",
      "flutter build web",
      "poetry build",
      "python -m build",
      "xcodebuild -scheme QFAI build",
      "npx --yes tsup",
      "node --run build",
      "msbuild MySolution.sln",
    ];
    // `msbuild` was named as missed by round 3 and dropped from the corpus a round later, which is
    // corpus selection by outcome. It stays in this list now whether it passes or not.
    const missed = REGRESSIONS.filter((line) => classifyBuildCommand(line, sources) === "none");
    expect.soft(missed, "a build form v3 caught and a later version must not lose").toEqual([]);
  });

  it("keeps every form v4 already handled", async () => {
    const sources = await repositorySources();
    const KEPT = [
      "pnpm -C packages/qfai build",
      "pnpm run build",
      "npm run build-storybook",
      "nx run-many --target=build",
      "cmake --build .",
      "npx tsup",
      "./scripts/build.sh",
      "bash scripts/build-dist.sh",
      "turbo run build",
      "cargo build",
      "go build ./...",
      "gradle build",
      "dotnet build",
      "pnpm exec vite build",
      "npx webpack --mode production",
    ];
    const missed = KEPT.filter((line) => classifyBuildCommand(line, sources) === "none");
    expect.soft(missed, "a fix for the regressions must not undo v4's own gains").toEqual([]);
  });

  it("reads `tsc -b` as the build it is, which three rounds pinned the other way", async () => {
    // The evidence is in the tsconfig, not in the script name: `packages/qfai/tsconfig.json` sets
    // `outDir: "dist"` and `composite: true` and no `noEmit`, so `tsc -b` writes JS and declarations
    // into `packages/qfai/dist`. That is a build by the only definition this file uses.
    //
    // It was pinned as NOT a build for three rounds, in the list of "non-builds a review round added
    // after a false positive" — which is v4's naming defect sitting inside the corpus assembled to
    // catch it. `pnpm ci:gate` moves with it, because `ci:gate` runs `check-types`.
    const sources = await repositorySources();
    expect.soft(classifyBuildCommand("pnpm check-types", sources)).toBe("build");
    expect.soft(classifyBuildCommand("tsc -b", sources)).toBe("build");
    expect.soft(classifyBuildCommand("tsc -p tsconfig.build.json", sources)).toBe("build");
    expect.soft(classifyBuildCommand("pnpm ci:gate", sources)).toBe("build");

    // And the line that separates the check from the emit, in both spellings.
    expect.soft(classifyBuildCommand("npx tsc --noEmit", sources)).toBe("none");
    expect.soft(classifyBuildCommand("tsc --noEmit -p tsconfig.json", sources)).toBe("none");
  });

  it("reports none for every non-build a review round added after a false positive", async () => {
    const sources = await repositorySources();
    // `pnpm check-types` used to be in this list and is now asserted as a BUILD below. Three rounds
    // pinned it here on the strength of the script's name; its body is `tsc -b`, and
    // `packages/qfai/tsconfig.json` sets `outDir: dist` and `composite: true` with no `noEmit`, so it
    // emits. Reading a verdict off a script's name is the defect v4 was broken for, and this list had
    // an instance of it in it the whole time. `--noEmit` is what separates the check from the emit.
    const NOT_BUILDS = [
      "npx tsc --noEmit",
      "npm ci --ignore-scripts",
      "pnpm exec eslint . --cache-location .cache/build",
      "npm test -- --reporter=junit --outputFile reports/build.xml",
      "npx playwright test --output=build-artifacts",
      "yarn dlx license-checker --start ./build",
      "pnpm vitest run --project e2e",
      "npm run lint:md",
      "pnpm -C packages/qfai test:e2e",
      "pnpm install --frozen-lockfile",
      "rm -rf build dist",
      "mkdir -p build",
      "cp -r dist build-output",
      "apt-get install -y build-essential",
      "git diff --name-only",
      'echo "unit lane placeholder - opted in, but the test-lane body ships later"',
      'echo "::notice::build reuse is not wired yet"',
    ];
    const falsePositives = NOT_BUILDS.filter(
      (line) => classifyBuildCommand(line, sources) !== "none",
    );
    expect.soft(falsePositives, "a non-build reported as one").toEqual([]);
  });

  it("resolves a script's body rather than its name, in both directions", async () => {
    const sources = await repositorySources();

    // Names a build, and what it reaches is a helper file whose NAME also says build — so the honest
    // verdict is the labelled guess, not `build`. v4 returned a flat `true`, which reads as analysis;
    // the build is spawned by `spawnSync` inside `check-build-warnings.mjs`, which no command-line
    // scan reaches.
    expect
      .soft(
        classifyBuildCommand("pnpm ci:build-verify", sources),
        "`ci:build-verify` runs `node ./scripts/check-build-warnings.mjs && …`, so only the helper's " +
          "filename suggests a build",
      )
      .toBe("heuristic");

    // Names no build, reaches one through the `prepack` lifecycle hook.
    expect
      .soft(
        classifyBuildCommand("pnpm -C packages/qfai pack --pack-destination /tmp/x", sources),
        "`pack` triggers `prepack`, which is `npm run build`, which is `tsup`",
      )
      .toBe("build");

    // Resolved through the root manifest, which delegates to the package's.
    expect
      .soft(
        classifyBuildCommand("pnpm build", sources),
        "the root `build` is `pnpm -C packages/qfai build`, whose `build` is `tsup`",
      )
      .toBe("build");

    // With no script map there is nothing but the name, and the verdict says so rather than passing
    // a guess off as an analysis.
    expect(classifyBuildCommand("pnpm ci:build-verify")).toBe("heuristic");
    expect(classifyBuildCommand("pnpm run build")).toBe("heuristic");
  });

  it("classifies each command of a compound line, not just the first", () => {
    // v4 returned on the first target, so everything after `&&` was invisible — including
    // `npm ci && npm run build`, the most common build form in a workflow `run:` block.
    //
    // `reachesBuild` rather than the verdict here: with no script map every one of these can only be
    // a name-shaped match, and what this test is about is the SPLIT, not the strength.
    expect(reachesBuild("npm ci && npm run build")).toBe(true);
    expect(reachesBuild("pnpm lint && pnpm test")).toBe(false);
    expect(reachesBuild("pnpm lint | tee log.txt")).toBe(false);
    expect(reachesBuild("pnpm lint || pnpm build")).toBe(true);
    expect(reachesBuild("cd packages/qfai && pnpm build")).toBe(true);

    // And with the manifests supplied, the same split resolves to a proven build.
    const sources: ScriptSources = { manifests: { "": { build: "tsup" } } };
    expect(classifyBuildCommand("npm ci && npm run build", sources)).toBe("build");
    expect(classifyBuildCommand("pnpm lint && pnpm test", sources)).toBe("none");
  });

  it("classifies the ten forms round 5 measured against v5", async () => {
    // Round 5's `qa-gatekeeper` broke v5 ten ways. Its cases are here, in its own framing, because a
    // corpus this stage chose has flattered this predicate at every version.
    const sources = await repositorySources();

    // The worst one: a MISSING script returned the strong `build` verdict from the bare name, so the
    // same command changed verdict depending on whether a lookup happened to hit.
    expect
      .soft(
        classifyBuildCommand("pnpm --filter qfai ci:build-verify", sources),
        "a manifest lookup that misses may never produce more than a labelled guess",
      )
      .toBe("heuristic");
    expect.soft(classifyBuildCommand("pnpm ci:build-verify", sources)).toBe("heuristic");
    expect
      .soft(
        classifyBuildCommand("pnpm --filter qfai ci:build-verify", sources),
        "and it must agree with the unfiltered form — round 5 found them differing",
      )
      .toBe(classifyBuildCommand("pnpm ci:build-verify", sources));

    // Names that merely contain `build` are guesses, not builds.
    expect.soft(classifyBuildCommand("npm run clean:build-cache", sources)).toBe("heuristic");
    expect.soft(classifyBuildCommand("npm run restore:build-artifact", sources)).toBe("heuristic");

    // A build tool's subcommand counts before a flag, not after: `--install build` names a directory.
    expect.soft(classifyBuildCommand("cmake --install build", sources)).toBe("none");
    expect.soft(classifyBuildCommand("cmake --build .", sources)).toBe("build");

    // Forms v5 lost entirely.
    expect.soft(classifyBuildCommand("pnpm -w build", sources), "`-w` is boolean").toBe("build");
    expect.soft(classifyBuildCommand("npx turbo run build", sources)).toBe("build");
    expect.soft(classifyBuildCommand("pnpm nx build web", sources)).toBe("build");
    expect
      .soft(
        classifyBuildCommand("yarn workspace qfai build", sources),
        "the workspace NAME is not the target",
      )
      .toBe("build");
    expect.soft(classifyBuildCommand("python -m build", sources)).toBe("build");
  });

  it("treats `cd ./pkg` and `cd pkg` as the same directory", () => {
    // Round 5 found them differing: `normalise` left the `./` in place, so one resolved in a manifest
    // that did not exist. Round 5 also found that removing the whole `cd` handler reddened nothing,
    // which is why this asserts a positive resolution rather than an absence.
    const sources: ScriptSources = { manifests: { "": {}, pkg: { build: "tsup" } } };
    expect(classifyBuildCommand("cd ./pkg && pnpm build", sources)).toBe("build");
    expect(classifyBuildCommand("cd pkg && pnpm build", sources)).toBe("build");
    expect(classifyBuildCommand("cd ./pkg/ && pnpm build", sources)).toBe("build");
    // And a directory with no manifest resolves to a guess, not to the root's script.
    expect(classifyBuildCommand("cd ./elsewhere && pnpm build", sources)).toBe("heuristic");
    // Without the `cd`, the root manifest declares no `build`, so the same command is only a guess.
    expect(classifyBuildCommand("pnpm build", sources)).toBe("heuristic");
  });

  it("classifies the class round 6 measured v6 regressing on", async () => {
    // v6 treated ANY flag as ending the subcommand position, so every one of these went to `none`
    // while being a build under v5. Round 6 measured them; the fix is narrower, not broader — only a
    // flag that takes a DIRECTORY makes the next bare token a location.
    const sources = await repositorySources();
    const REGRESSED = [
      "make -C packages/qfai build",
      "make -j4 build",
      "cargo --locked build",
      "gradle --no-daemon build",
      "bazel --output_base=/tmp build //...",
      "docker buildx build --push .",
      "docker -H tcp://x build .",
    ];
    const missed = REGRESSED.filter((line) => classifyBuildCommand(line, sources) !== "build");
    expect.soft(missed, "a build v5 caught and v6 lost").toEqual([]);

    // And the one case the directory-flag rule exists for still holds.
    expect.soft(classifyBuildCommand("cmake --install build", sources)).toBe("none");
    expect.soft(classifyBuildCommand("cmake --build .", sources)).toBe("build");
  });

  it("gives one command one verdict across a flag's long, short and absent forms", async () => {
    // Round 6: `pnpm build` was `build`, `pnpm --filter qfai build` `heuristic`, and
    // `pnpm -F qfai build` `none`. `--filter` selects a PACKAGE, not a directory, so reading it as a
    // manifest path pointed at a directory that does not exist — and the short form was not read at
    // all. All three must agree.
    const sources = await repositorySources();
    const forms = ["pnpm build", "pnpm --filter qfai build", "pnpm -F qfai build"];
    const verdicts = forms.map((line) => classifyBuildCommand(line, sources));
    expect.soft(new Set(verdicts).size, `one command, one verdict: ${verdicts.join(", ")}`).toBe(1);
    expect.soft(verdicts[0]).toBe("build");
  });

  it("does not read a build out of a flag value or a suppressed lifecycle hook", async () => {
    const sources = await repositorySources();
    // `--ignore-scripts` means `prepack` does not run, so packing reaches no build.
    expect
      .soft(
        classifyBuildCommand("pnpm -C packages/qfai pack --ignore-scripts", sources),
        "a suppressed lifecycle hook cannot be a build",
      )
      .toBe("none");
    // Only a target-naming flag's value can name a target.
    expect
      .soft(
        classifyBuildCommand("pnpm --reporter=build-log install", sources),
        "a reporter name is not a build target",
      )
      .toBe("none");
  });

  it("gives each build tool its own grammar, which round 7 found v7 lacking", async () => {
    // A global "flags that take a directory" set held three flags that are BOOLEAN in the tools it was
    // applied to, so `make -B build` was `none` while `make --always-make build` was `build` — the
    // several-verdicts-per-command defect, re-created by a set that exists for `cmake --install build`
    // alone. And `run` was a global passthrough, so `docker run --name build-agent alpine` was a build.
    const sources = await repositorySources();

    const SHOULD_BUILD = [
      "make -B build",
      "make --always-make build",
      "make -S build",
      "make --no-keep-going build",
      "gradle -S build",
      "gradle --full-stacktrace build",
      "cmake --build .",
      "docker buildx build --push .",
    ];
    const SHOULD_NOT = [
      "cmake --install build",
      "make --directory build clean",
      "make -C build clean",
      "docker run --name build-agent alpine",
      "pnpm --reporter build-log install",
      "pnpm --reporter=build-log install",
    ];
    expect
      .soft(
        SHOULD_BUILD.filter((line) => classifyBuildCommand(line, sources) !== "build"),
        "a build a per-tool grammar must see",
      )
      .toEqual([]);
    expect
      .soft(
        SHOULD_NOT.filter((line) => classifyBuildCommand(line, sources) !== "none"),
        "a non-build a per-tool grammar must not invent",
      )
      .toEqual([]);
  });

  it("names every grammar member in a hardcoded case, and no member the grammar dropped", () => {
    // Round 8's headline finding: the version of this test that ITERATED `GRAMMAR` detected nothing.
    // It generated `pnpm ${flag} build` from the very set it meant to pin, so deleting a member deleted
    // its own probe — 0 of 17 member mutations reddened it, and member survival went 43% -> 61% while
    // the test reported success.
    //
    // So MEMBER_CASES is hardcoded, and this pair of assertions replaces the iteration:
    //
    // - here, that the case list and the grammar name the same members. A new member with no case fails
    //   the first assertion; a member deleted from the grammar fails the second, which is the deliberate
    //   part — removing grammar has to be a decision, not a silent narrowing.
    // - below, that each case still holds. That one is where a deletion is CAUGHT rather than merely
    //   noticed, and it works because the commands are literals that outlive the member.
    //
    // No count is written here. Three rounds put one in this comment and in the matrix and it was
    // stale within a commit every time: 208 while the grammar held 250, which is the defect class the
    // sibling guards exist for, inside the sentence claiming measurement. The count is available at
    // runtime, and the assertions below are the measurement rather than a report of one.
    const named = new Set(MEMBER_CASES.map(([member]) => member));
    expect(
      grammarMembers().filter((member) => !named.has(member)),
      "a grammar member no hardcoded case names — iterating the set instead is what round 8 measured " +
        "as detecting nothing",
    ).toEqual([]);
    expect(
      [...named].filter((member) => !grammarMembers().includes(member)),
      "a case naming a member the grammar no longer has",
    ).toEqual([]);
    expect(MEMBER_CASES.length, "one case per member, no duplicates").toBe(named.size);
  });

  it("holds the verdict of every hardcoded member case", () => {
    // Synthetic manifests, not this repository's, because a probe must turn on the grammar rather than
    // on which scripts happen to exist. `pnpm --dir sub hello` reaching `tsup` says the directory flag
    // moved the lookup; against the real tree it would reach a build either way, through the root
    // `build` script, and pin nothing.
    const wrong = MEMBER_CASES.filter(
      ([, want, line]) => classifyBuildCommand(line, SYNTHETIC) !== want,
    ).map(
      ([member, want, line]) =>
        `${member}: want ${want}, got ${classifyBuildCommand(line, SYNTHETIC)} — ${line}`,
    );
    expect(wrong, "a member case whose verdict moved").toEqual([]);
  });

  it("reddens on the deletion of any one grammar member", () => {
    // The property the hardcoded table exists for, asserted rather than described. Deleting each member
    // in turn must make at least one case disagree; a member that survives is a member the corpus does
    // not really pin, which is the state round 8 found the previous version of this file in — 0 of 17
    // mutations reddening it, because it generated its probes from the sets it pinned.
    //
    // This is also what shrank v10: run against v9's grammar, 162 of 207 members survived, and
    // forty-five of them survived every command anyone could write. Those are gone from the grammar now,
    // and their absence is why this can demand nothing less than all of them.
    const undetected: string[] = [];
    const mislabelled: string[] = [];
    for (const member of grammarMembers()) {
      const restore = deleteMember(member);
      try {
        // Both properties, because the table claims the stronger one. `undetected` is the weak
        // property: SOME case notices. `mislabelled` is what the table's labels assert, that the
        // member's OWN case notices its own deletion. Round 9 measured the strong property holding for
        // every member while only the weak one was asserted, and asserting the true one is free.
        const disagreeing = MEMBER_CASES.filter(
          ([, want, line]) => classifyBuildCommand(line, SYNTHETIC) !== want,
        ).map(([label]) => label);
        if (!disagreeing.length) undetected.push(member);
        else if (!disagreeing.includes(member)) mislabelled.push(member);
      } finally {
        restore();
      }
    }
    expect(undetected, "a grammar member whose deletion no case in this corpus notices").toEqual(
      [],
    );
    expect(
      mislabelled,
      "a member whose deletion is noticed only by SOME OTHER member's case: the label is then " +
        "decoration, and a case going inert would be covered for by its neighbour",
    ).toEqual([]);

    // And the restore has to be exact, or every test after this one is measuring a different grammar.
    expect(grammarMembers().length, "the sweep must leave the grammar as it found it").toBe(
      MEMBER_CASES.length,
    );
  });

  it("consumes a tool's spaced flag value, which round 8 measured v8 never doing", async () => {
    // v8's one global rule was `const known = isManager ? MANAGER_BOOLEAN.has(token) : true`, so for a
    // build tool `known` was unconditionally true and a spaced flag never consumed its value. The value
    // landed in the subcommand position instead, and six ordinary CI lines went missing. The naive
    // repair — dropping the `isManager` branch — reddened the four `make -B build` forms above, which is
    // why the knowledge had to move into each tool's own `values` list.
    const sources = await repositorySources();
    const MISSED = [
      "gradle --console plain build",
      "dotnet --verbosity minimal build",
      "make -j 4 build",
      "cargo --color never build",
      "ninja -j 8 build",
      "turbo --concurrency 4 run build",
    ];
    // And the other direction, from the same round: a flag whose NAME contains "build" is not a build,
    // and a bare token carrying `=` is a setting rather than a subcommand.
    const INVENTED = [
      "cargo --config build.jobs=2 test",
      "gradle --build-cache test",
      "gradle --build-file other.gradle clean",
      "dotnet --arch build test",
    ];
    expect
      .soft(
        MISSED.filter((line) => classifyBuildCommand(line, sources) !== "build"),
        "a build whose tool consumed its own flag value",
      )
      .toEqual([]);
    expect
      .soft(
        INVENTED.filter((line) => classifyBuildCommand(line, sources) !== "none"),
        "a non-build read out of a flag name or a setting",
      )
      .toEqual([]);

    // One command, one verdict — the same invariant as the long/short/absent test above, extended to
    // the spaced and inline forms of the flags this round added.
    for (const [spaced, inline] of [
      ["gradle --console plain build", "gradle --console=plain build"],
      ["dotnet --verbosity minimal build", "dotnet --verbosity=minimal build"],
      ["make -j 4 build", "make -j4 build"],
      ["cargo --color never build", "cargo --color=never build"],
      ["pnpm -w build", "pnpm --workspace-root build"],
    ] as const) {
      expect
        .soft(classifyBuildCommand(spaced, sources), `${spaced} and ${inline} are the same command`)
        .toBe(classifyBuildCommand(inline, sources));
    }
  });

  it("sees the builds round 8 planted in a shipped lane, wrappers and all", async () => {
    // Round 8's gatekeeper replaced a shipped placeholder step with a real build, one form at a time,
    // and ran the story `US-0017-0004` rests on. The control reddened; **ten of eleven builds did not**.
    // Three were the tool-flag defect fixed above. The rest are three more places where a global rule
    // stood in for per-family knowledge:
    //
    // - a WRAPPER's own flags were not consumed, so the loop broke on `-n` / `-a` and the wrapper's
    //   argument was read as the command. `env NODE_ENV=production pnpm build` was pinned; `env -u CI
    //   pnpm build` was `none`, and `xvfb-run -a` and `timeout 600` are the idiomatic CI spellings.
    // - `timeout` was not a wrapper at all, and its first bare token is a duration rather than a
    //   command.
    // - `-w` is BOOLEAN for pnpm (`--workspace-root`) and takes a VALUE for npm (`--workspace`). One
    //   spelling, two managers, two meanings — the same shape as `-B` in make and cmake, one level up.
    const sources = await repositorySources();
    const PLANTED = [
      "pnpm build",
      "nice -n 19 pnpm build",
      "xvfb-run -a pnpm build",
      "timeout 600 pnpm build",
      "gradle --console plain build",
      "make -j 4 build",
      "dotnet --verbosity minimal build",
      "pnpm --stream build",
      "pnpm --workspace-root build",
      "npm -w pkg run build",
      "docker buildx bake -f docker-bake.hcl",
    ];
    expect
      .soft(
        PLANTED.filter((line) => classifyBuildCommand(line, sources) === "none"),
        "a real build that ships without the story noticing",
      )
      .toEqual([]);

    // The rest of the wrapper forms the same round measured, and the one it named as still `none`.
    const WRAPPED = [
      "sudo -E make build",
      "stdbuf -oL pnpm build",
      "env -u CI pnpm build",
      "ionice -c 3 pnpm build",
      "time -p pnpm build",
      "nohup pnpm build",
    ];
    expect
      .soft(
        WRAPPED.filter((line) => classifyBuildCommand(line, sources) === "none"),
        "a build behind a wrapper flag",
      )
      .toEqual([]);

    // And the direction that must not move: a wrapper's flag value is not a target, and a duration is
    // not a command.
    const STILL_NONE = [
      "timeout 600 pnpm test",
      "nice -n 19 pnpm lint",
      "env -u BUILD pnpm test",
      "sudo -u builder whoami",
      "docker run --name build-agent alpine",
    ];
    expect
      .soft(
        STILL_NONE.filter((line) => classifyBuildCommand(line, sources) !== "none"),
        "a non-build invented out of a wrapper's own argument",
      )
      .toEqual([]);
  });

  it("sees the builds round 9 planted in the shipped lane, all forty-one of them", async () => {
    // Two reviewers planted real builds in the shipped orchestrator and ran the story's own loop.
    // **Eighteen of twenty shipped unnoticed** for one, **thirty-four of forty** for the other, and
    // fifteen of the eighteen were tools this grammar already declared. The root cause was one level
    // above v9's flag work: no version had given a tool its own SUBCOMMAND grammar, so a build was
    // recognised only when a bare token split to contain the literal word "build".
    //
    // Every form below is a reviewer's, not this stage's. That distinction is the finding round 9
    // closed with: "eleven versions in, the corpus's authority still comes from who chose it."
    const sources = await repositorySources();
    const PLANTED = [
      // the build verb is not the word `build`
      "mvn package",
      "mvn -B package",
      "mvn install -DskipTests",
      "mvn verify",
      "gradle assemble",
      "gradle jar",
      "./gradlew assembleRelease",
      "dotnet publish -c Release",
      "dotnet pack",
      "go install ./cmd/...",
      "sbt compile",
      "sbt assembly",
      "meson compile -C builddir",
      "python3 setup.py bdist_wheel",
      "docker-compose build",
      // a bare tool with a default target
      "make",
      "make all",
      "make -j4",
      "make -j build",
      "ninja",
      "rake",
      "scons",
      "just",
      "task",
      "waf",
      // the interpreter had no flag grammar
      'bash -c "pnpm build"',
      "bash -lc 'pnpm build'",
      "sh -c 'npm run build'",
      "pwsh -Command 'pnpm build'",
      "pwsh -File scripts/build.ps1",
      // the wrapper list was the six forms someone had measured
      "cross-env NODE_ENV=production pnpm build",
      'xvfb-run -a -s "-screen 0 1024x768x24" pnpm build',
      "setsid pnpm build",
      "flock /tmp/lock pnpm build",
      "taskset -c 0-3 pnpm build",
      "unbuffer pnpm build",
      // a manager flag nobody had listed as boolean ate the script name
      "pnpm --no-frozen-lockfile build",
      "pnpm --shell-emulator build",
      // the canonical yarn-berry workspace build
      "yarn workspaces foreach --all run build",
      "yarn workspaces foreach -A run build",
      // and `tsc -b`, which this repository's own type-check lane runs
      "pnpm exec tsc -b",
    ];
    expect
      .soft(
        PLANTED.filter((line) => classifyBuildCommand(line, sources) === "none"),
        "a real build that ships without the story noticing",
      )
      .toEqual([]);

    // The other direction, from the same two rounds. Four of these were false positives the new
    // wrapper grammar introduced, and four are labels or paths whose components include `build`.
    const NOT_PLANTED = [
      "command -v tsup",
      "command -v vite",
      "stdbuf -oL npx tsup --help",
      "timeout 5 docker buildx bake --print",
      "bazel test //src/build:tests",
      "bazel query deps(//build:all)",
      "make ./build/report.txt",
      "docker inspect ./build",
      "docker run --rm alpine echo build-info",
      "go vet ./build/...",
      "gradle test -x build",
      "dotnet -a build test",
      "make -j 4 clean",
      "ninja clean",
      "make clean",
      "make test",
    ];
    expect
      .soft(
        NOT_PLANTED.filter((line) => classifyBuildCommand(line, sources) !== "none"),
        "a non-build invented out of a flag value, a label or a container's own command line",
      )
      .toEqual([]);

    // What stays unseeable, stated rather than left to be rediscovered: a build inside a helper whose
    // filename does not say build. Round 9 planted this one too, and it is the honest `none`.
    expect
      .soft(classifyBuildCommand("node scripts/bundle.mjs", sources), "no scan can read this")
      .toBe("none");
  });

  it("terminates on a self-referential script chain rather than recursing forever", () => {
    const sources: ScriptSources = { manifests: { "": { a: "pnpm b", b: "pnpm a" } } };
    expect(classifyBuildCommand("pnpm a", sources)).toBe("none");
  });

  it("resolves a script in the manifest its directory selects, not a merged one", () => {
    const sources: ScriptSources = {
      manifests: {
        "": { build: "pnpm -C pkg build", other: "echo root" },
        pkg: { build: "tsup", other: "echo package" },
      },
    };
    expect(classifyBuildCommand("pnpm build", sources)).toBe("build");
    expect(classifyBuildCommand("pnpm -C pkg build", sources)).toBe("build");
    expect(classifyBuildCommand("pnpm other", sources)).toBe("none");
    // `cd` moves the manifest too, which is what makes `cd pkg && …` differ from a bare invocation.
    expect(classifyBuildCommand("cd pkg && pnpm other", sources)).toBe("none");
  });
});

describe("the real workflow trees", () => {
  interface CommandLine {
    readonly file: string;
    readonly command: string;
  }

  /** Every `run:` command line in a workflow directory, comments stripped. */
  async function commandLines(relativeDir: string): Promise<CommandLine[]> {
    const { readdir } = await import("node:fs/promises");
    const dir = path.join(ROOT, relativeDir);
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      return [];
    }

    const lines: CommandLine[] = [];
    for (const file of names) {
      if (!/\.ya?ml$/.test(file)) continue;
      const text = await readFile(path.join(dir, file), "utf8");
      let inRun = false;
      let indent = 0;
      for (const rawLine of text.split(/\r?\n/)) {
        const inline = /^\s*(?:-\s+)?run:\s*(\S.*)$/.exec(rawLine);
        if (inline !== null && !/^[|>]/.test(inline[1] ?? "")) {
          lines.push({ file, command: inline[1] ?? "" });
          inRun = false;
          continue;
        }
        const block = /^(\s*)(?:-\s+)?run:\s*[|>][-+]?\s*$/.exec(rawLine);
        if (block !== null) {
          inRun = true;
          indent = (block[1] ?? "").length;
          continue;
        }
        if (!inRun || rawLine.trim() === "") continue;
        if (rawLine.length - rawLine.trimStart().length <= indent) {
          inRun = false;
          continue;
        }
        lines.push({ file, command: rawLine.trim() });
      }
    }

    return lines
      .map((entry) => ({ file: entry.file, command: entry.command.replace(/#.*$/, "").trim() }))
      .filter((entry) => entry.command !== "");
  }

  it("finds no build in the shipped tree, which is what US-0017-0004 needs", async () => {
    // No script map: `qfai init` ships no `package.json`, so an adopter's script bodies are unknown
    // and only a name-shaped guess is available. BOTH verdicts are rejected here, so the assertion is
    // the stronger one — not even a suspicious name appears in a shipped lane.
    const lines = await commandLines("packages/qfai/assets/init/root/.github/workflows");
    const flagged = lines
      .filter((entry) => classifyBuildCommand(entry.command) !== "none")
      .map((entry) => `${entry.file}::${entry.command}`);
    expect.soft(lines.length, "the shipped tree must actually have been read").toBeGreaterThan(50);
    expect.soft(flagged, "no shipped lane may run or appear to run its own build").toEqual([]);
  });

  it("finds the own tree's builds, and labels the two no scan can resolve", async () => {
    const sources = await repositorySources();
    const lines = await commandLines(".github/workflows");
    expect
      .soft(lines.length, "the scan must reach a real corpus or its silence means nothing")
      .toBeGreaterThan(250);

    const flagged = lines
      .map((entry) => ({ ...entry, verdict: classifyBuildCommand(entry.command, sources) }))
      .filter((entry) => entry.verdict !== "none")
      .map((entry) => `${entry.verdict}::${entry.file}::${entry.command}`)
      .sort();

    // Round 4 established that this repository reaches a build in FOUR places, and that the previous
    // assertion — "exactly the two real builds and nothing else" — was green only because the
    // predicate was blind. Two resolve through `package.json`; two do not, because the build is
    // spawned inside `scripts/check-build-warnings.mjs`, and those land on `heuristic` only because
    // that filename happens to say `build`.
    //
    // Pinned as a set, so a build in a new place fails this rather than being absorbed by a count.
    expect
      .soft(
        flagged,
        "every command reaching or appearing to reach a build: `build` = a resolved chain of script " +
          "bodies, `heuristic` = only a name says so",
      )
      .toEqual([
        "build::ci.yml::pnpm -C packages/qfai build",
        // This one is new, and it is a fact about the repository rather than about the predicate:
        // the own tree has a THIRD lane that builds. `check-types` runs `tsc -b`, which emits into
        // `dist`, so the type-check lane and the build lane compile the same package twice.
        "build::ci.yml::pnpm check-types",
        'build::release.yml::pnpm -C packages/qfai pack --pack-destination "$PWD/tmp"',
        // `ci:gate` runs `check-types`, whose `tsc -b` emits into `dist`. It was `heuristic` here for
        // three rounds because the chain was read as far as a script NAME and no further.
        "build::release.yml::pnpm ci:gate",
        "heuristic::ci.yml::pnpm ci:build-verify",
      ]);
  });
});
