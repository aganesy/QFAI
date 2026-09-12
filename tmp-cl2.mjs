import fs from "node:fs";
let s = fs.readFileSync("CHANGELOG.md", "utf-8");
const anchor = "- **The working-tree address is written one way** (#1651).";
const add =
  "- **A glob's bracket expression names a set on both sides** (#1652). A class\n" +
  "  was compiled by scanning for the first `]`, which stops inside a named class\n" +
  "  such as `[[:digit:]]` and produces a pattern matching the letters of the\n" +
  "  name. The class's real terminator is found now, and each named class is\n" +
  "  written out as the members a regular expression takes — so a project whose\n" +
  "  test glob uses one is no longer told its generated file does not match it.\n\n";
if (!s.includes(anchor)) { console.log("anchor missing"); process.exit(1); }
fs.writeFileSync("CHANGELOG.md", s.replace(anchor, () => add + anchor));
console.log("added");
