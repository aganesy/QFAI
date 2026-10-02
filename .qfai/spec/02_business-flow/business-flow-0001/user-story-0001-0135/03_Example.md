# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                          | Expected                                                                                                                                                                                                           |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX-0001-0135-01 | AC-0001-0135-01 | A converged iter with declared `screens[].id = ["home_page", "settings_panel"]`, when `iterate` mirrors accepted-iter content. | `.qfai/evidence/prototyping/screenshots/home_page.png`, `screenshots/settings_panel.png`, `html/home_page.html`, `html/settings_panel.html` all exist. Hyphen-form (`home-page.png`) is rejected at validate time. |
