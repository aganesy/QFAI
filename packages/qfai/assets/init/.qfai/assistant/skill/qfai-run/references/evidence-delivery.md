# Evidence delivery

## Contents

- When delivery is required
- Identity and the ignored index
- Selection and privacy
- Native preflight
- Copy and archive
- Retained storage and receipt
- Independent receiver
- Failure and proof limits

## When delivery is required

Read this guide when a request requires evidence handover before a session is
archived. Complete that handover before archiving the session. Ordinary
completion does not require an unsolicited upload or an extra full verification
run solely to deliver evidence.

Use explicit selected regular files, an ignored human-readable index, standard
native tools and authorized retained storage. Keep originals until the named
recipient or receiving role has independently received and checked every
required item. A storage link or producer self-read is not that receipt.

This guide adds no QFAI command, exporter, storage service, machine schema or
runtime state. It does not change the plan, its gates or existing verdicts.

## Identity and the ignored index

Write the index in an ignored location outside the selected payload and keep
its destination in the stage report or session handoff. Record:

- target, scope, repository, branch and full source revision;
- observed worktree/index state and the fingerprint of the selected input;
- actual executable and build, command with separated argv, cwd, runtime,
  input and time where observed;
- each selected relative name, expected byte length and SHA-256 digest;
- original results, excluded attempts and their original result and exclusion
  reason, review identity, open work, owner and resume condition;
- sharing authority, exclusions, destination, receiving role and retention.

Use native Git observations such as `git rev-parse HEAD`,
`git status --porcelain=v1 --untracked-files=all` and
`git rev-parse --git-path index` to record the source and index. Where the index
exists, record its raw-byte digest too. Recheck the revision, index and selected
input before producing the archive. A changed revision/index or stale index
entry stops delivery until the intended source and required inventory are
established again. A dirty tree is disclosed with the selected-byte snapshot;
its commit alone cannot identify the actual input or build used by an old run.

Keep trusted expected selected sizes/digests, source identity and archive digest
outside the delivered bundle. Compare the index with those expectations. A
downloaded index cannot establish its own source or digest authority. Required
selected-file or independent source/archive identity that is UNKNOWN refuses
delivery; do not fabricate it from an unverified receipt.

Historical executable, build, command or time that was not observed stays
UNKNOWN. Known evidence may still be preserved, but unknown historical execution
does not prove verification. Keep old-source PASS separate from current FAIL,
UNRUN and delegated pending checks. Retain excluded failed attempts without
changing their result. No delivery completes failed or unrun required
verification, turns pending CI into PASS or relabels a review for another head.
Existing `verify.json` fields, scope and statuses stay unchanged.

## Selection and privacy

Select only the files needed to resume this target. Do not recursively discover
scratch, select a directory or copy a whole checkout. Give each required entry
a canonical relative name with `/` separators, a known expected byte length and
lowercase SHA-256 digest. Use a new owned staging root; keep the index and
archive outside it.

For portable names and unambiguous native listings, exclude control characters
and components ending in a dot or space. If a required original uses such a
name, review and identify a separately named copy before selecting it.

Review the selected names and contents, sharing authority and destination before
upload. Exclude credentials and unapproved private material. Record exclusions
without exposing withheld values. If a reviewed or redacted copy is needed,
identify it separately from the retained original and hash the bytes actually
delivered. Neither hashes nor the preflight detect all secrets, automatically
redact contents or establish privacy completeness.

The preflight below reads only the explicit selection. It refuses unsafe names,
missing or non-regular entries, linked root/ancestors/leaves, hardlinks,
duplicate normalized names, case collisions and wrong or changed byte identity.
It checks observations again during and after reading. These observations are
not an atomic snapshot or protection against every concurrent adversary.

## Native preflight

Save this single block verbatim as an owned temporary `.mjs` file. Run it with
the installed Node executable and separated argv:

`node <saved-preflight.mjs> <absolute-root> <relative-name> <decimal-byte-length> <lowercase-sha256> [more triples]`

Use the same block and trusted expected triples for source, staged copy and
receiver roots. There is no collection/receiver mode and no input from stdin.
The block changes no file. Exit 0 and `Verified N selected files.` mean only
that this selection passed these checks. Exit 1 refuses it; neither result
proves sharing authority, storage access, historical execution or handover.

```js
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

function sameIdentity(left, right) {
  return ["dev", "ino", "mode", "nlink", "size", "mtimeNs", "ctimeNs"].every(
    (key) => left[key] === right[key],
  );
}

function sameDirectory(left, right) {
  return ["dev", "ino", "mode"].every((key) => left[key] === right[key]);
}

function main() {
  const [rootArg, ...args] = process.argv.slice(2);
  if (!rootArg || !path.isAbsolute(rootArg) || !args.length || args.length % 3) {
    throw new Error("Use an absolute root and complete name/size/digest triples.");
  }
  const root = path.resolve(rootArg);
  const names = new Set();
  const directories = new Map();
  const entries = [];

  function directory(name) {
    const stat = fs.lstatSync(name, { bigint: true });
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error("A selected path has a linked or non-directory component.");
    }
    const previous = directories.get(name);
    if (previous && !sameDirectory(previous, stat)) {
      throw new Error("A selected directory changed.");
    }
    directories.set(name, stat);
  }

  const parents = [];
  for (let current = root; ; current = path.dirname(current)) {
    parents.push(current);
    if (path.dirname(current) === current) break;
  }
  parents.reverse().forEach(directory);

  for (let offset = 0; offset < args.length; offset += 3) {
    const [name, sizeText, digest] = args.slice(offset, offset + 3);
    const parts = name.split("/");
    if (
      path.isAbsolute(name) ||
      /[\\:\x00-\x1f\x7f]/u.test(name) ||
      parts.some((part) => !part || part === "." || part === ".." || /[. ]$/u.test(part)) ||
      !/^\d+$/u.test(sizeText) ||
      !Number.isSafeInteger(Number(sizeText)) ||
      !/^[a-f0-9]{64}$/u.test(digest)
    ) {
      throw new Error("A selected name, expected size or digest is unsafe.");
    }
    const normalized = name.toLowerCase();
    if (names.has(normalized)) {
      throw new Error("Selected names are duplicated or collide by case.");
    }
    names.add(normalized);
    let current = root;
    for (const part of parts.slice(0, -1)) {
      current = path.join(current, part);
      directory(current);
    }
    const file = path.join(root, ...parts);
    const stat = fs.lstatSync(file, { bigint: true });
    const expectedSize = BigInt(sizeText);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1n) {
      throw new Error("A selected entry is linked, hardlinked or non-regular.");
    }
    if (stat.size !== expectedSize) throw new Error("A selected size changed.");
    entries.push({ file, stat, expectedSize, digest });
  }

  function recheckDirectories() {
    for (const [name, before] of directories) {
      const after = fs.lstatSync(name, { bigint: true });
      if (!after.isDirectory() || after.isSymbolicLink() || !sameDirectory(before, after)) {
        throw new Error("A selected directory changed.");
      }
    }
  }

  const buffer = Buffer.alloc(64 * 1024);
  for (const entry of entries) {
    recheckDirectories();
    const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
    const descriptor = fs.openSync(entry.file, flags);
    try {
      const before = fs.fstatSync(descriptor, { bigint: true });
      if (!before.isFile() || before.nlink !== 1n || !sameIdentity(entry.stat, before)) {
        throw new Error("A selected entry changed before reading.");
      }
      const hash = createHash("sha256");
      let size = 0n;
      for (;;) {
        const count = fs.readSync(descriptor, buffer, 0, buffer.length, null);
        if (!count) break;
        size += BigInt(count);
        if (size > entry.expectedSize) throw new Error("A selected size changed.");
        hash.update(buffer.subarray(0, count));
      }
      const after = fs.fstatSync(descriptor, { bigint: true });
      const current = fs.lstatSync(entry.file, { bigint: true });
      if (
        !sameIdentity(before, after) ||
        !sameIdentity(before, current) ||
        size !== entry.expectedSize ||
        hash.digest("hex") !== entry.digest
      ) {
        throw new Error("Selected bytes or identity changed.");
      }
      recheckDirectories();
    } finally {
      fs.closeSync(descriptor);
    }
  }
  recheckDirectories();
  for (const entry of entries) {
    if (!sameIdentity(entry.stat, fs.lstatSync(entry.file, { bigint: true }))) {
      throw new Error("A selected entry changed after reading.");
    }
  }
  console.log(`Verified ${entries.length} selected files.`);
}

try {
  main();
} catch (error) {
  console.error(`Evidence preflight refused: ${error.message}`);
  process.exitCode = 1;
}
```

## Copy and archive

After source preflight succeeds, copy only those selected files to the new owned
staging root. Use a native literal-path copy or Node's `fs.copyFileSync`; create
only their listed parent directories. Do not decode, rewrite or normalize
binary data, encoding markers, LF or CRLF. Re-run the exact preflight block on
staging with the trusted source expectations immediately before native tar.
If anything changes or cannot be read, stop before archive and keep originals.

Use the installed native tar executable with separated argv, for example:

- create: `tar -cf <absolute-bundle.tar> -C <absolute-staging-root> ./<selected-name> ...`
- list: `tar -tf <absolute-bundle.tar>`
- extract: `tar -xf <absolute-bundle.tar> -C <fresh-absolute-receiver-root>`

Prefix each selected name with `./` to avoid option or archive-inclusion
interpretation. Select no directory and use no wildcard or shell interpolation.
Check the actual listing against the exact expected member set: each required
name occurs once, with no unexpected or missing member. Record the actual
executable/version, argv, cwd, platform, exit/signal and stdout/stderr. A missing
tool or failed command is not successful production. Different native tar
implementations need not produce identical archive container bytes.

Calculate the produced archive's raw-byte SHA-256 and record it with the trusted
source and selected expectations outside the archive. Archive digest identity
alone does not prove file provenance, privacy or recipient access.

## Retained storage and receipt

Before upload, establish existing authority for this target and payload,
destination privacy, the named recipient or receiving role, required access and
retention. A visible storage link grants none of these. Use an existing
authorized retained channel; do not create a paid service or publish private raw
evidence by assumption. Preserve actual upload results and artifact identity.

The ignored receiving receipt records who received the evidence, retrieval time,
destination and artifact identity, retrieved items, independently checked source
and archive identity, every required size/digest result and missing evidence.
Keep its reference in the stage report or handoff. A required item or receipt
that is unavailable, expired, denied, incomplete or mismatched leaves handover
pending, records the blocker and resume condition, and retains originals.

## Independent receiver

The receiver independently retrieves every required item from retained storage;
producer self-read or index visibility is insufficient. Supply trusted source,
archive digest and selected-file expectations through a separate authorized
channel. Check the archive's actual raw-byte digest and source identity against
those expectations before extraction. Refuse a mismatched or unknown archive.

Extract only this known-safe producer archive into a fresh owned receiving root.
This procedure does not safely extract arbitrary third-party archives. Check
the exact member set and re-run the same preflight on the extracted regular
files with the trusted expected triples. Compare the index's target/source and
inventory with the separately supplied expectations. Missing, duplicated,
unexpected, linked or altered members do not produce an accepted receipt.

Only the named recipient's actual complete receiving proof allows the requested
handover to complete before real session archive. Local producer checks cannot
stand in for it. Preserve unrelated receiver contents and originals when proof
fails; do not destroy or silently replace them to make the receipt pass.

## Failure and proof limits

On unsafe selection, changed source or index, missing evidence, unknown required
identity, denied access, expiry or mismatched bytes, stop dependent delivery and
archive. Name the observed blocker, missing item, owner and resume condition.
Keep actual failure output and originals. Required verification FAIL, UNRUN or
pending remains incomplete even if some evidence was successfully delivered.

Generic capability acceptance requires actual native Linux and Windows
producers and separate Linux and Windows hosted receivers. Each receiver must
retrieve both retained producer artifacts and independently check their bytes,
digests and source identity: all four transfer directions need actual proof.
Executing only the instructions or reading one's own output is insufficient.

That controlled CI receipt proves the tested capability. It does not establish
this session's real successor access, long-term retention, a session archive or
general sharing permission. Historical metadata remains UNKNOWN where absent.
The preflight is neither an automatic secret scanner, an exporter nor an atomic
concurrent-adversary guarantee. Native archives are not a general safe restore
engine. Report these limits with the actual observations.
