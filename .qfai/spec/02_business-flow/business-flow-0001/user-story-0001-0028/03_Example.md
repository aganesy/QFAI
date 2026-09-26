# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                        | Expected                                                                                                                             |
| --------------- | --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0028-01 | AC-0001-0028-02 | Windows (Developer Mode OFF) で `qfai init`                                  | The run stops after the first failed symlink, with an EPERM message that names Developer Mode and carries the Microsoft guidance URL |
| EX-0001-0028-02 | AC-0001-0028-01 | Run `qfai init` inside a Git repository whose `core.symlinks` is not enabled | Init sets `git config core.symlinks true`; the observation comes from a behavioral init run rather than a source-text search         |
| EX-0001-0028-03 | AC-0001-0028-01 | `qfai init` runs outside a Git repository                                    | Init succeeds without reporting a `core.symlinks` setting change.                                                                    |
