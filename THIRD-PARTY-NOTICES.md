# Third-party notices

Asphodel Reverie includes code from the following projects.

## Moonlit Echoes Theme

- Author: Rivelle <rivelle.days@gmail.com>
- Source: https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme
- Version taken: 3.1.1, commit 5336f368a41871275317c60a5bc9a806d59f4000 (16 September 2026)
- Licence: GNU Affero General Public License v3.0 (AGPL-3.0), full text in `LICENSE`

What is included, and what was changed (14 November 2026):

| File here | From | Changes |
| --- | --- | --- |
| `components/moonlit-base.css` | `style.css` | the chat styles Bubble, Document, Echo, Hush, Ripple and Tide and the Visual Novel mode rules are left out (a comment marks each place); the page-wide rules for headings, `hr`, links, `code`, lists, checkboxes, radio buttons and sliders are limited to SillyTavern's own menus, panels and popups with a `:where(...)` prefix, and the link, blockquote, list and code styling for chat messages is left out, so chat messages and other extensions' windows keep their own look; everything else is copied as it is |
| `components/moonlit-base.css` | `extension.css` | none (appended as it is) |
| `components/moonlit-base.css` | `src/config/theme-settings.js` | the CSS of six options is appended, always on: Lock AI Response & Character Menu Height, Expand Entry Input Width, Compact Worlds/Lorebooks Top Bar, Enable Mobile Hidden Scrollbar, Enable New Mobile Input Field, Move QRs Bar Below Input on Mobile. "Hide Avatar Border" is appended behind the body class `ar-no-avatar-border`. The other options are left out. A `:root` block at the top fixes the values Moonlit kept in its settings panel |
| `index.js` (avatar addresses for Whisper, `--formSheldHeight`) | `src/core/observers.js` | rewritten and shortened: the avatar picture element is no longer changed, only the CSS variables are set |

Not included: Moonlit's own `index.js`, its settings panel, preset manager,
slash commands, translation files and UI theme files. Asphodel Reverie has its
own, smaller preset system; it keeps Moonlit's setting names for the ten values
it has, so a Moonlit preset file can be imported.

## Chat Completion Tabs

- Author: Rivelle <rivelle.days@gmail.com>
- Source: https://github.com/RivelleDays/SillyTavern-ChatCompletionTabs
- Version taken: 1.0.0, commit a427446a7625ca19606fedfdc39891e2e3f8f3d1 (10 October 2025)
- Licence: GNU Affero General Public License v3.0 (AGPL-3.0), full text in `LICENSE`

What is included, and what was changed (14 November 2026):

| File here | From | Changes |
| --- | --- | --- |
| `components/tab-manager.js` | `components/tab-manager.js` | none (identical copy) |
| `components/openai-tab-manager.js` | `components/openai-tab-manager.js` | none (identical copy) |
| `style.css`, section 11 | `style.css` | the tab rules are copied as they are; the rule for that extension's own settings drawer is left out |

Not included: the original `index.js` and its `i18n/` translation files (the tab labels are English only here). Asphodel Reverie's own `index.js` loads the
tab manager and switches it with the theme's single "Enable" switch, in place of
the original's separate settings drawer.

Because this code is AGPL-3.0, Asphodel Reverie as a whole is distributed under
AGPL-3.0 as well.
