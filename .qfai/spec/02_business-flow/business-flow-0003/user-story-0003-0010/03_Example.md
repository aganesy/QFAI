# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                      | Expected                                                                                                       |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| EX-0003-0010-01 | AC-0003-0010-01 | `qfai doctor --profile qfai-prototyping`, where `<paths.skillsDir>/qfai-prototyping/manifest.json` declares playwright and `node_modules` does not hold it | playwright is reported as missing, and its install command is shown                                            |
| EX-0003-0010-02 | AC-0003-0010-02 | `qfai doctor --profile <skill>` (manifest の runtimeDependencies が `[]`)                                                                                  | probe finding が 1 件も emit されない (false positive なし); drift ケースでは `R-SKILL-MANIFEST-DRIFT` が emit |
