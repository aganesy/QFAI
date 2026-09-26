# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                            | Expected                                                                                                                             |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0148-01 | AC-0001-0148-01 | Given DESIGN.md declares `patch_zone` tokens `--color-accent` and `--radius-md`, with frozen `majorHash: a1b2c3` When `--radius-md` changes from `8px` to `10px` inside the zone | Then `patchHash` changes, `majorHash` stays `a1b2c3`, and existing prototyping evidence stays valid without a Reviewer Gate finding. |
| EX-0001-0148-02 | AC-0001-0148-02 | Given the same frozen DESIGN.md When `--font-sans` changes outside the zone or the `patch_zone` block is removed                                                                 | Then evidence is invalidated and Reviewer Gate emits warning `R-DESIGN-MD-PATCH-OUT-OF-ZONE`.                                        |
