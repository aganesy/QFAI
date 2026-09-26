# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                | Expected                                                                                                                                                                                                                |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0139-01 | AC-0001-0139-01 | Given a converged iter with declared `screens[].id = ["home_page", "settings_panel"]`, When `iterate` mirrors accepted-iter content, | Then `.qfai/evidence/prototyping/screenshots/home_page.png`, `screenshots/settings_panel.png`, `html/home_page.html`, `html/settings_panel.html` all exist. Hyphen-form (`home-page.png`) is rejected at validate time. |
