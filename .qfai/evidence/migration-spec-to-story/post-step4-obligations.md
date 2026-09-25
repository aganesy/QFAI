# Obligations written after step 4

`id-map.json` fixes the old-to-new IDs as step 4 wrote them, and is not revised
afterwards. Every AC, EX and BR the story tree defines but the map does not
target was written later, by hand. This register lists each one with its
authority.

## How the sets were computed

- Tree IDs: `# AC-NNNN-NNNN-NN` headings in `02_Acceptance-Criteria.md`, the
  first column of `03_Example.md` tables, and the first column of the rule
  tables under `.qfai/spec/03_contract/`.
- Mapped IDs: every target value in `id-map.json`, for all old packs.
- Post-step-4 set: tree IDs minus mapped IDs.
- Introduced by: the first commit whose change to `.qfai/spec/` adds the ID
  (`git log -S <ID> --reverse`). None of the three commits has a message body,
  so the stated reason is the subject line:

| Commit      | Subject                                                           |
| ----------- | ----------------------------------------------------------------- |
| `df55ba0c2` | feat: migrate QFAI to story tree and singular assistant assets    |
| `d77a084a0` | fix(story-tree): reconcile migrated rules and coverage evidence   |
| `239af3cd9` | test: replace BF3 placeholder examples with diagnostic assertions |

The reason each item exists is therefore taken from the decision rows and
migration records below, not from the commits.

## Totals

| Kind | In the tree | Mapped targets | Mapped targets in the tree | Written after step 4 |
| ---- | ----------- | -------------- | -------------------------- | -------------------- |
| AC   | 465         | 447            | 447                        | 18                   |
| EX   | 730         | 636            | 633                        | 97                   |
| BR   | 526         | 514            | 514                        | 12                   |

Three mapped EX targets are no longer in the tree. DEC-0719 removed
EX-0001-0069-01 and EX-0001-0069-02, and DEC-0730 removed EX-0003-0013-05. So
the tree's 730 examples are 633 mapped and 97 written after step 4.

## Authority by kind

Each item is counted once, in the first column that applies.

| Kind | Existing decision row | Migration record only | Decision row added with this register | Total |
| ---- | --------------------- | --------------------- | ------------------------------------- | ----- |
| AC   | 6                     | 0                     | 12                                    | 18    |
| EX   | 23                    | 44                    | 30                                    | 97    |
| BR   | 5                     | 0                     | 7                                     | 12    |

- A migration record names 1 AC and 57 EX: the 44 above, and 13 that also
  have an existing decision row. EX-0001-0041-01 is counted under its record,
  `region-a-br-audit.csv`, and also cites DEC-0728.
- The six decision rows added with this register are DEC-0725 to DEC-0730 in
  `.qfai/spec/decisions.md`. Each restates an approved story, a migrated rule
  or a recorded decision, so no item needed an open question.
- The branch's merge base holds no `.qfai/spec/decisions.md`, so the drift
  gate reports nothing for the added rows (BR-0169).

## Register

Paths in the Where column are relative to `.qfai/spec/02_business-flow/` for
AC and EX, and to `.qfai/spec/03_contract/` for BR. Record files are in this
directory. "(new)" marks a decision row added with this register.

| ID              | Where                                     | Introduced by | Authority                                                                                                                                                               |
| --------------- | ----------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-0001-0014-01 | `business-flow-0001/user-story-0001-0014` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| AC-0001-0017-01 | `business-flow-0001/user-story-0001-0017` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| AC-0001-0019-01 | `business-flow-0001/user-story-0001-0019` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| AC-0001-0029-01 | `business-flow-0001/user-story-0001-0029` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| AC-0001-0029-02 | `business-flow-0001/user-story-0001-0029` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| AC-0001-0073-06 | `business-flow-0001/user-story-0001-0073` | `df55ba0c2`   | DEC-0727 (new)                                                                                                                                                          |
| AC-0001-0082-01 | `business-flow-0001/user-story-0001-0082` | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| AC-0001-0083-01 | `business-flow-0001/user-story-0001-0083` | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| AC-0001-0084-01 | `business-flow-0001/user-story-0001-0084` | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| AC-0001-0085-01 | `business-flow-0001/user-story-0001-0085` | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| AC-0001-0086-01 | `business-flow-0001/user-story-0001-0086` | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| AC-0001-0104-01 | `business-flow-0001/user-story-0001-0104` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| AC-0001-0106-01 | `business-flow-0001/user-story-0001-0106` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| AC-0001-0107-01 | `business-flow-0001/user-story-0001-0107` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| AC-0001-0109-01 | `business-flow-0001/user-story-0001-0109` | `df55ba0c2`   | DEC-0715; `step05-step08-tc-disposition.csv` line 10 (TC-0012-0339)                                                                                                     |
| AC-0001-0110-01 | `business-flow-0001/user-story-0001-0110` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| AC-0001-0113-01 | `business-flow-0001/user-story-0001-0113` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| AC-0001-0116-01 | `business-flow-0001/user-story-0001-0116` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| EX-0001-0014-01 | `business-flow-0001/user-story-0001-0014` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| EX-0001-0014-02 | `business-flow-0001/user-story-0001-0014` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| EX-0001-0017-01 | `business-flow-0001/user-story-0001-0017` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| EX-0001-0019-01 | `business-flow-0001/user-story-0001-0019` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| EX-0001-0019-02 | `business-flow-0001/user-story-0001-0019` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| EX-0001-0026-01 | `business-flow-0001/user-story-0001-0026` | `df55ba0c2`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0027-01 | `business-flow-0001/user-story-0001-0027` | `df55ba0c2`   | `step04-ex-provenance.csv` line 17 (EX-0003-0007)                                                                                                                       |
| EX-0001-0029-01 | `business-flow-0001/user-story-0001-0029` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| EX-0001-0029-02 | `business-flow-0001/user-story-0001-0029` | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| EX-0001-0035-03 | `business-flow-0001/user-story-0001-0035` | `df55ba0c2`   | `step04-ex-provenance.csv` line 18 (EX-0003-0020)                                                                                                                       |
| EX-0001-0035-04 | `business-flow-0001/user-story-0001-0035` | `d77a084a0`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0037-01 | `business-flow-0001/user-story-0001-0037` | `df55ba0c2`   | `step04-ex-provenance.csv` line 20 (EX-0003-0023)                                                                                                                       |
| EX-0001-0037-02 | `business-flow-0001/user-story-0001-0037` | `df55ba0c2`   | `step04-ex-provenance.csv` line 20 (EX-0003-0023)                                                                                                                       |
| EX-0001-0039-01 | `business-flow-0001/user-story-0001-0039` | `df55ba0c2`   | `step04-ex-provenance.csv` line 22 (EX-0004-0004)                                                                                                                       |
| EX-0001-0041-01 | `business-flow-0001/user-story-0001-0041` | `df55ba0c2`   | DEC-0728 (new); `region-a-br-audit.csv` (BR-0100)                                                                                                                       |
| EX-0001-0049-03 | `business-flow-0001/user-story-0001-0049` | `df55ba0c2`   | `step04-ex-provenance.csv` line 23 (EX-0004-0037); `manual-contract-rehome.md`                                                                                          |
| EX-0001-0049-04 | `business-flow-0001/user-story-0001-0049` | `df55ba0c2`   | `step04-ex-provenance.csv` line 23 (EX-0004-0037); `manual-contract-rehome.md`                                                                                          |
| EX-0001-0069-03 | `business-flow-0001/user-story-0001-0069` | `df55ba0c2`   | `step04-ex-provenance.csv` line 24 (EX-0008-0001); `manual-contract-rehome.md`                                                                                          |
| EX-0001-0070-01 | `business-flow-0001/user-story-0001-0070` | `df55ba0c2`   | `step04-ex-provenance.csv` line 25 (EX-0008-0002)                                                                                                                       |
| EX-0001-0072-01 | `business-flow-0001/user-story-0001-0072` | `d77a084a0`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0073-03 | `business-flow-0001/user-story-0001-0073` | `df55ba0c2`   | `step04-ex-provenance.csv` line 26 (EX-0008-0005); `manual-contract-rehome.md`                                                                                          |
| EX-0001-0073-04 | `business-flow-0001/user-story-0001-0073` | `df55ba0c2`   | DEC-0719; DEC-0727 (new); `step04-ex-provenance.csv` line 27 (EX-0008-0017)                                                                                             |
| EX-0001-0073-05 | `business-flow-0001/user-story-0001-0073` | `df55ba0c2`   | DEC-0719                                                                                                                                                                |
| EX-0001-0073-06 | `business-flow-0001/user-story-0001-0073` | `d77a084a0`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0078-04 | `business-flow-0001/user-story-0001-0078` | `df55ba0c2`   | `step04-ex-provenance.csv` line 28 (EX-0009-0001)                                                                                                                       |
| EX-0001-0079-02 | `business-flow-0001/user-story-0001-0079` | `df55ba0c2`   | `step04-ex-provenance.csv` line 29 (EX-0009-0003)                                                                                                                       |
| EX-0001-0081-01 | `business-flow-0001/user-story-0001-0081` | `d77a084a0`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0081-02 | `business-flow-0001/user-story-0001-0081` | `d77a084a0`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0082-01 | `business-flow-0001/user-story-0001-0082` | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| EX-0001-0083-01 | `business-flow-0001/user-story-0001-0083` | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| EX-0001-0084-01 | `business-flow-0001/user-story-0001-0084` | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| EX-0001-0085-01 | `business-flow-0001/user-story-0001-0085` | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| EX-0001-0086-01 | `business-flow-0001/user-story-0001-0086` | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| EX-0001-0100-01 | `business-flow-0001/user-story-0001-0100` | `df55ba0c2`   | DEC-0716; `step04-ex-provenance.csv` line 36 (EX-0012-0098)                                                                                                             |
| EX-0001-0100-02 | `business-flow-0001/user-story-0001-0100` | `df55ba0c2`   | DEC-0716; `step04-ex-provenance.csv` line 45 (EX-0012-0120); `step05-step08-tc-disposition.csv` line 13 (TC-0012-0351)                                                  |
| EX-0001-0102-02 | `business-flow-0001/user-story-0001-0102` | `df55ba0c2`   | DEC-0716; `step04-ex-provenance.csv` line 36 (EX-0012-0098)                                                                                                             |
| EX-0001-0103-01 | `business-flow-0001/user-story-0001-0103` | `d77a084a0`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0104-01 | `business-flow-0001/user-story-0001-0104` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| EX-0001-0105-01 | `business-flow-0001/user-story-0001-0105` | `df55ba0c2`   | `step04-ex-provenance.csv` line 35 (EX-0012-0089)                                                                                                                       |
| EX-0001-0106-01 | `business-flow-0001/user-story-0001-0106` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| EX-0001-0107-01 | `business-flow-0001/user-story-0001-0107` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| EX-0001-0108-02 | `business-flow-0001/user-story-0001-0108` | `df55ba0c2`   | `step04-ex-provenance.csv` line 39 (EX-0012-0111)                                                                                                                       |
| EX-0001-0108-03 | `business-flow-0001/user-story-0001-0108` | `df55ba0c2`   | `step04-ex-provenance.csv` line 39 (EX-0012-0111)                                                                                                                       |
| EX-0001-0108-04 | `business-flow-0001/user-story-0001-0108` | `df55ba0c2`   | `step05-step08-tc-disposition.csv` line 8 (TC-0012-0333)                                                                                                                |
| EX-0001-0108-05 | `business-flow-0001/user-story-0001-0108` | `df55ba0c2`   | DEC-0718                                                                                                                                                                |
| EX-0001-0108-06 | `business-flow-0001/user-story-0001-0108` | `df55ba0c2`   | DEC-0718; `corrected-story-examples.md`                                                                                                                                 |
| EX-0001-0109-01 | `business-flow-0001/user-story-0001-0109` | `df55ba0c2`   | DEC-0715; `step04-ex-provenance.csv` line 43 (EX-0012-0116); `step05-step08-tc-disposition.csv` line 10 (TC-0012-0339)                                                  |
| EX-0001-0110-01 | `business-flow-0001/user-story-0001-0110` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| EX-0001-0111-02 | `business-flow-0001/user-story-0001-0111` | `d77a084a0`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0112-01 | `business-flow-0001/user-story-0001-0112` | `df55ba0c2`   | DEC-0718                                                                                                                                                                |
| EX-0001-0112-02 | `business-flow-0001/user-story-0001-0112` | `df55ba0c2`   | DEC-0718                                                                                                                                                                |
| EX-0001-0112-03 | `business-flow-0001/user-story-0001-0112` | `df55ba0c2`   | DEC-0718; DEC-0720; `corrected-story-examples.md`                                                                                                                       |
| EX-0001-0112-04 | `business-flow-0001/user-story-0001-0112` | `df55ba0c2`   | DEC-0718                                                                                                                                                                |
| EX-0001-0113-01 | `business-flow-0001/user-story-0001-0113` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| EX-0001-0113-02 | `business-flow-0001/user-story-0001-0113` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| EX-0001-0114-01 | `business-flow-0001/user-story-0001-0114` | `d77a084a0`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0115-01 | `business-flow-0001/user-story-0001-0115` | `df55ba0c2`   | `step04-ex-provenance.csv` line 40 (EX-0012-0112)                                                                                                                       |
| EX-0001-0115-02 | `business-flow-0001/user-story-0001-0115` | `df55ba0c2`   | `step04-ex-provenance.csv` line 50 (EX-0012-0134)                                                                                                                       |
| EX-0001-0116-01 | `business-flow-0001/user-story-0001-0116` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| EX-0001-0116-02 | `business-flow-0001/user-story-0001-0116` | `df55ba0c2`   | DEC-0726 (new)                                                                                                                                                          |
| EX-0001-0118-05 | `business-flow-0001/user-story-0001-0118` | `df55ba0c2`   | DEC-0717; `step04-ex-provenance.csv` line 47 (EX-0012-0123)                                                                                                             |
| EX-0001-0118-06 | `business-flow-0001/user-story-0001-0118` | `df55ba0c2`   | `step05-step08-tc-disposition.csv` lines 17 (TC-0012-0404), 18 (TC-0012-0409)                                                                                           |
| EX-0001-0122-05 | `business-flow-0001/user-story-0001-0122` | `df55ba0c2`   | `step04-ex-provenance.csv` line 51 (EX-0012-0135)                                                                                                                       |
| EX-0001-0122-06 | `business-flow-0001/user-story-0001-0122` | `df55ba0c2`   | DEC-0717; `step04-ex-provenance.csv` line 57 (EX-0012-0148)                                                                                                             |
| EX-0001-0122-07 | `business-flow-0001/user-story-0001-0122` | `df55ba0c2`   | DEC-0717; `step04-ex-provenance.csv` line 59 (EX-0012-0153)                                                                                                             |
| EX-0001-0122-08 | `business-flow-0001/user-story-0001-0122` | `df55ba0c2`   | `step05-step08-tc-disposition.csv` line 14 (TC-0012-0375)                                                                                                               |
| EX-0001-0124-04 | `business-flow-0001/user-story-0001-0124` | `df55ba0c2`   | DEC-0717; `step04-ex-provenance.csv` line 52 (EX-0012-0138); `manual-contract-rehome.md`                                                                                |
| EX-0001-0125-04 | `business-flow-0001/user-story-0001-0125` | `df55ba0c2`   | DEC-0717; `step04-ex-provenance.csv` line 53 (EX-0012-0140); `step05-step08-tc-disposition.csv` lines 16 (TC-0012-0397), 17 (TC-0012-0404), 19 (TC-0012-0410)           |
| EX-0001-0125-05 | `business-flow-0001/user-story-0001-0125` | `df55ba0c2`   | DEC-0717; `step04-ex-provenance.csv` line 54 (EX-0012-0143); `step05-step08-tc-disposition.csv` lines 15 (TC-0012-0390), 16 (TC-0012-0397); `manual-contract-rehome.md` |
| EX-0001-0126-01 | `business-flow-0001/user-story-0001-0126` | `df55ba0c2`   | `step04-ex-provenance.csv` line 55 (EX-0012-0144); `step05-step08-tc-disposition.csv` line 15 (TC-0012-0390); `manual-contract-rehome.md`                               |
| EX-0001-0127-01 | `business-flow-0001/user-story-0001-0127` | `df55ba0c2`   | `step04-ex-provenance.csv` line 48 (EX-0012-0124); `manual-contract-rehome.md`                                                                                          |
| EX-0001-0127-02 | `business-flow-0001/user-story-0001-0127` | `df55ba0c2`   | `step04-ex-provenance.csv` line 49 (EX-0012-0125); `manual-contract-rehome.md`                                                                                          |
| EX-0001-0127-03 | `business-flow-0001/user-story-0001-0127` | `df55ba0c2`   | `step04-ex-provenance.csv` line 49 (EX-0012-0125); `manual-contract-rehome.md`                                                                                          |
| EX-0001-0127-04 | `business-flow-0001/user-story-0001-0127` | `df55ba0c2`   | `step04-ex-provenance.csv` line 56 (EX-0012-0145); `manual-contract-rehome.md`                                                                                          |
| EX-0001-0147-01 | `business-flow-0001/user-story-0001-0147` | `df55ba0c2`   | `step04-ex-provenance.csv` line 60 (EX-0012-0181)                                                                                                                       |
| EX-0001-0147-02 | `business-flow-0001/user-story-0001-0147` | `df55ba0c2`   | `step04-ex-provenance.csv` line 60 (EX-0012-0181)                                                                                                                       |
| EX-0001-0148-01 | `business-flow-0001/user-story-0001-0148` | `df55ba0c2`   | `step04-ex-provenance.csv` line 61 (EX-0012-0182)                                                                                                                       |
| EX-0001-0148-02 | `business-flow-0001/user-story-0001-0148` | `df55ba0c2`   | `step04-ex-provenance.csv` line 61 (EX-0012-0182)                                                                                                                       |
| EX-0001-0149-01 | `business-flow-0001/user-story-0001-0149` | `df55ba0c2`   | `step04-ex-provenance.csv` line 62 (EX-0012-0183)                                                                                                                       |
| EX-0001-0149-02 | `business-flow-0001/user-story-0001-0149` | `df55ba0c2`   | `step04-ex-provenance.csv` line 62 (EX-0012-0183)                                                                                                                       |
| EX-0001-0150-01 | `business-flow-0001/user-story-0001-0150` | `df55ba0c2`   | `step04-ex-provenance.csv` line 63 (EX-0012-0184)                                                                                                                       |
| EX-0001-0150-02 | `business-flow-0001/user-story-0001-0150` | `df55ba0c2`   | `step04-ex-provenance.csv` line 63 (EX-0012-0184)                                                                                                                       |
| EX-0001-0151-01 | `business-flow-0001/user-story-0001-0151` | `df55ba0c2`   | `step04-ex-provenance.csv` line 64 (EX-0012-0185)                                                                                                                       |
| EX-0001-0151-02 | `business-flow-0001/user-story-0001-0151` | `df55ba0c2`   | `step04-ex-provenance.csv` line 64 (EX-0012-0185)                                                                                                                       |
| EX-0001-0155-03 | `business-flow-0001/user-story-0001-0155` | `df55ba0c2`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0156-02 | `business-flow-0001/user-story-0001-0156` | `d77a084a0`   | `story004-0156-ex-provenance.md`                                                                                                                                        |
| EX-0001-0167-07 | `business-flow-0001/user-story-0001-0167` | `df55ba0c2`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0168-01 | `business-flow-0001/user-story-0001-0168` | `df55ba0c2`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0169-03 | `business-flow-0001/user-story-0001-0169` | `df55ba0c2`   | `step04-ex-provenance.csv` line 74 (EX-0015-0001)                                                                                                                       |
| EX-0001-0170-02 | `business-flow-0001/user-story-0001-0170` | `df55ba0c2`   | `step04-ex-provenance.csv` line 75 (EX-0015-0002)                                                                                                                       |
| EX-0001-0171-01 | `business-flow-0001/user-story-0001-0171` | `df55ba0c2`   | `step04-ex-provenance.csv` line 76 (EX-0015-0004)                                                                                                                       |
| EX-0001-0171-02 | `business-flow-0001/user-story-0001-0171` | `df55ba0c2`   | `step04-ex-provenance.csv` line 76 (EX-0015-0004)                                                                                                                       |
| EX-0001-0172-01 | `business-flow-0001/user-story-0001-0172` | `d77a084a0`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0001-0187-03 | `business-flow-0001/user-story-0001-0187` | `df55ba0c2`   | `step04-ex-provenance.csv` line 77 (EX-0016-0014)                                                                                                                       |
| EX-0001-0187-04 | `business-flow-0001/user-story-0001-0187` | `df55ba0c2`   | DEC-0728 (new)                                                                                                                                                          |
| EX-0002-0002-04 | `business-flow-0002/user-story-0002-0002` | `df55ba0c2`   | `step04-ex-provenance.csv` line 21 (EX-0003-0028)                                                                                                                       |
| EX-0003-0014-03 | `business-flow-0003/user-story-0003-0014` | `239af3cd9`   | DEC-0730 (new)                                                                                                                                                          |
| BR-0515         | `cli/qfai-discussion.md`                  | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| BR-0516         | `cli/qfai-discussion.md`                  | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| BR-0517         | `cli/qfai-discussion.md`                  | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| BR-0518         | `cli/qfai-prototyping.md`                 | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| BR-0519         | `cli/qfai-prototyping.md`                 | `df55ba0c2`   | DEC-0721                                                                                                                                                                |
| BR-0520         | `cli/qfai-discussion.md`                  | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| BR-0521         | `cli/story-tree-authoring.md`             | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| BR-0522         | `cli/qfai-validate.md`                    | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| BR-0523         | `cli/qfai-init.md`                        | `df55ba0c2`   | DEC-0725 (new)                                                                                                                                                          |
| BR-0524         | `cli/qfai-prototyping-iterate.md`         | `d77a084a0`   | DEC-0729 (new)                                                                                                                                                          |
| BR-0525         | `cli/qfai-doctor.md`                      | `d77a084a0`   | DEC-0729 (new)                                                                                                                                                          |
| BR-0526         | `cli/qfai-doctor.md`                      | `d77a084a0`   | DEC-0729 (new)                                                                                                                                                          |
