/* Asphodel Reverie — standalone theme extension for SillyTavern.
   One master switch turns the whole theme on or off.
   Styling lives in components/moonlit-base.css (the base layer, from Moonlit Echoes) and
   style.css (Asphodel Reverie's own pages, which win where the two overlap).
   This file handles the settings panel, loads the base layer, locks the chat
   to the Whisper style, keeps the theme presets (colours, Whisper, avatar
   border), moves two library toolbar buttons, adds persona pinning, loads the
   chosen notification style, and on phones moves the Custom CSS editor up
   below Theme Colors.

   Licence: AGPL-3.0 (see LICENSE). Includes parts of Moonlit Echoes Theme and
   Chat Completion Tabs, both by Rivelle — see THIRD-PARTY-NOTICES.md. */

const MODULE = 'asphodel_reverie';
const NAME = 'Asphodel Reverie';

const DEFAULTS = {
    enabled: true,   // master switch for the whole theme
    gridCols: 3,     // grid columns (library + persona)
    pinned: [],      // pinned persona avatar ids
    toastTheme: 'basic', // 'none', a built-in id, or a custom id
    customToasts: {},    // id -> { name, css } (made or imported by the user)
    presetTabs: true,    // Parameters / Prompts tabs in the preset panel
    look: {},            // the theme values in use right now (see DEFAULT_LOOK)
    presets: {},         // name -> saved theme values (made or imported by the user)
    activePreset: 'Default',
};

/* The values a theme preset holds. The names are the same ones Moonlit Echoes
   uses, so a Moonlit preset file can be imported as it is.
   "Default" is built in: it can't be overwritten or deleted. */
const DEFAULT_PRESET = 'Default';
const DEFAULT_LOOK = {
    customThemeColor: 'rgba(122, 35, 35, 1)',
    customThemeColor2: 'rgba(210, 139, 181, 1)',
    customBgColor1: 'rgba(110, 43, 38, 0.73)',
    customBgColor2: 'rgba(255, 255, 255, 0.05)',
    customTopBarColor: 'rgba(20, 20, 20, 0.83)',
    'Drawer-iconColor': 'rgba(255, 255, 255, 0.8)',
    SmartThemeBodyColor: 'rgba(220, 220, 210, 1)',
    arChatTextColor: 'rgba(220, 220, 210, 1)',
    SmartThemeEmColor: 'rgba(145, 145, 145, 1)',
    SmartThemeQuoteColor: 'rgba(146, 151, 196, 1)',
    SmartThemeUserMesBlurTintColor: 'rgba(30, 30, 30, 0.9)',
    SmartThemeBotMesBlurTintColor: 'rgba(30, 30, 30, 0.9)',
    customWhisperAvatarWidth: '50%',
    customWhisperAvatarAlign: 'top',
    hideAvatarBorder: false,
};
/* [key, label, hint, settings tab]. The SmartTheme* keys replace the same
   colours in SillyTavern's Theme Colors while the theme is on (those rows are
   hidden there). arChatTextColor is the chat's own copy of the main text colour. */
const LOOK_COLORS = [
    ['customThemeColor', 'Primary Theme Color', 'Highlights and accents across the interface', 'ui'],
    ['customThemeColor2', 'Secondary Theme Color', 'A second accent for special highlights', 'ui'],
    ['customBgColor1', 'Main Background Color', 'Menus and buttons', 'ui'],
    ['customBgColor2', 'Secondary Background Color', 'Quieter menus and buttons', 'ui'],
    ['customTopBarColor', 'Top Bar Color', 'The bar of icons at the top', 'ui'],
    ['Drawer-iconColor', 'Icon Color', 'Top bar and message box icons that have no picture', 'ui'],
    ['SmartThemeBodyColor', 'Interface Text', 'Text in menus, panels and popups', 'ui'],
    ['arChatTextColor', 'Chat Text', 'Normal text in chat messages', 'chat'],
    ['SmartThemeEmColor', 'Italic Text', '*Actions* and other italic text', 'chat'],
    ['SmartThemeQuoteColor', 'Quote Text', '"Speech" in quotation marks', 'chat'],
    ['SmartThemeUserMesBlurTintColor', 'User Message', 'The box behind your messages', 'chat'],
    ['SmartThemeBotMesBlurTintColor', 'AI Message', "The box behind the character's messages", 'chat'],
];
/* These colours used to come from SillyTavern's Theme Colors. When a preset
   has no value for one (first run after updating, or an older preset), the
   user's own SillyTavern colour is used instead of the built-in default. */
const FROM_ST = {
    SmartThemeBodyColor: 'main_text_color',
    arChatTextColor: 'main_text_color',
    SmartThemeEmColor: 'italics_text_color',
    SmartThemeQuoteColor: 'quote_text_color',
    SmartThemeUserMesBlurTintColor: 'user_mes_blur_tint_color',
    SmartThemeBotMesBlurTintColor: 'bot_mes_blur_tint_color',
};
const WHISPER_ALIGN = ['top', 'center', 'bottom'];
const PRESET_FILE_PREFIX = '[AR] ';

/* Built-in notification styles. The CSS is kept right here (not in a separate
   file) so it can never fail to load. They can't be edited or deleted from the
   panel; "+" makes an editable copy. */
const BUILTIN_TOASTS = {
    basic: { name: 'Basic', css: BASIC_TOAST_CSS() },
};
const DEFAULT_TOAST = 'basic';
const MAX_TOAST_CSS = 200000;


/* Every part of the theme hangs off one of these body classes. */
const THEME_CLASSES = ['mg-lib', 'mg-persona', 'mg-tools', 'mg-home', 'mg-font'];

/* Always returns the one stored settings object (never a copy),
   so a reference taken earlier stays valid. */
function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    let s = extensionSettings[MODULE];
    if (!s || typeof s !== 'object') s = extensionSettings[MODULE] = {};
    for (const [key, value] of Object.entries(DEFAULTS)) {
        if (s[key] === undefined) s[key] = Array.isArray(value) ? [] : (value && typeof value === 'object' ? {} : value);
    }
    if (!Array.isArray(s.pinned)) s.pinned = [];
    if (!s.customToasts || typeof s.customToasts !== 'object') s.customToasts = {};
    if (!s.presets || typeof s.presets !== 'object' || Array.isArray(s.presets)) s.presets = {};
    delete s.presets[DEFAULT_PRESET]; // the built-in one always comes from the code
    if (s.activePreset !== DEFAULT_PRESET && !Object.hasOwn(s.presets, s.activePreset)) s.activePreset = DEFAULT_PRESET;
    s.look = cleanLook(s.look, lookBase());
    return s;
}

function save() {
    SillyTavern.getContext().saveSettingsDebounced();
}

/* ---------- small helpers ---------- */

function esc(text) {
    return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function slug(text) {
    return String(text || 'style').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'style';
}

function toast(type, message) {
    if (window.toastr && toastr[type]) toastr[type](message, NAME);
    else console.log(`[${NAME}]`, message);
}

async function confirmBox(text) {
    const c = SillyTavern.getContext();
    if (typeof c.callGenericPopup === 'function' && c.POPUP_TYPE) {
        const OK = c.POPUP_RESULT ? c.POPUP_RESULT.AFFIRMATIVE : 1;
        return (await c.callGenericPopup(esc(text), c.POPUP_TYPE.CONFIRM)) === OK;
    }
    return window.confirm(text);
}

function downloadText(text, filename, type = 'text/css') {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- library toolbar ---------- */

/* Move the grid toggle + bulk edit buttons up onto the filter-icon row,
   or put them back where SillyTavern had them. */
function placeLibraryTools(on) {
    const controls = document.querySelector('#charListFixedTop .rm_tag_controls');
    const pagination = document.getElementById('rm_print_characters_pagination');
    if (!controls || !pagination) return;

    const buttons = ['charListGridToggle', 'bulkEditButton']
        .map(id => document.getElementById(id))
        .filter(Boolean);

    let box = controls.querySelector('.mg-lib-tools');

    if (on) {
        if (!box) {
            box = document.createElement('div');
            box.className = 'mg-lib-tools';
            controls.appendChild(box);
        }
        for (const button of buttons) {
            if (button.parentElement !== box) box.appendChild(button);
        }
    } else if (box) {
        for (const button of buttons.slice().reverse()) pagination.prepend(button);
        box.remove();
    }
}

/* ---------- persona pinning ---------- */

function markPins() {
    const block = document.getElementById('user_avatar_block');
    if (!block) return;
    const s = getSettings();
    const pinned = new Set(s.pinned);
    for (const card of block.querySelectorAll(':scope > .avatar-container')) {
        card.classList.toggle('mg-pinned', s.enabled && pinned.has(card.dataset.avatarId));
    }
}

function setPinMode(on) {
    document.body.classList.toggle('mg-pin-mode', on);
    document.getElementById('mg_persona_pin')?.classList.toggle('mg-active', on);
}

function setupPersonaPins() {
    const block = document.getElementById('user_avatar_block');
    const gridToggle = document.getElementById('persona_grid_toggle');
    if (!block || !gridToggle || document.getElementById('mg_persona_pin')) return;

    // The pin button takes the grid toggle's place (the theme hides that toggle).
    const pin = document.createElement('i');
    pin.id = 'mg_persona_pin';
    pin.className = 'fa-solid fa-thumbtack menu_button';
    pin.title = 'Pin personas: tap this, then tap the personas to pin or unpin. Tap again when done.';
    gridToggle.after(pin);

    pin.addEventListener('click', () => {
        const on = !document.body.classList.contains('mg-pin-mode');
        setPinMode(on);
        if (on) toast('info', 'Tap a persona to pin or unpin it. Tap the pin button again when done.');
    });

    // While pin mode is on, a tap pins instead of switching persona.
    block.addEventListener('click', (event) => {
        if (!document.body.classList.contains('mg-pin-mode')) return;
        const card = event.target.closest('.avatar-container');
        if (!card || !block.contains(card)) return;

        event.preventDefault();
        event.stopPropagation();

        const id = card.dataset.avatarId;
        if (!id) return;
        const s = getSettings();
        const index = s.pinned.indexOf(id);
        if (index === -1) s.pinned.push(id);
        else s.pinned.splice(index, 1);
        save();
        markPins();
    }, true);

    // SillyTavern rebuilds the persona list often; re-apply pins each time.
    new MutationObserver(markPins).observe(block, { childList: true });
}

/* ---------- user settings: Custom CSS editor ---------- */

/* On phones, move SillyTavern's own Custom CSS editor up to just below
   Theme Colors, so reaching it does not mean scrolling past the sliders.
   The editor itself is moved, never copied; a marker remembers its home. */
const MOBILE_QUERY = '(max-width: 760px)';
const cssMove = { marker: null, observer: null, panel: null, queued: false };

function findThemeColorsDrawer() {
    const elements = document.querySelector('#UI-Theme-Block [name="themeElements"]');
    if (!elements) return null;
    return Array.from(elements.querySelectorAll('.inline-drawer'))
        .find(node => node.querySelector('[data-i18n="Theme Colors"]')) || null;
}

function restoreCustomCss() {
    const block = document.getElementById('CustomCSS-block');
    const marker = cssMove.marker;
    if (block && marker?.parentNode && block.nextSibling !== marker) {
        marker.parentNode.insertBefore(block, marker);
    }
    block?.removeAttribute('data-mg-relocated');
}

function placeCustomCss() {
    const block = document.getElementById('CustomCSS-block');
    if (!block || !block.querySelector('#customCSS')) return;

    const wanted = getSettings().enabled && window.matchMedia(MOBILE_QUERY).matches;
    if (!wanted) {
        restoreCustomCss();
        return;
    }

    const colors = findThemeColorsDrawer();
    if (!colors) return;

    if (!cssMove.marker?.isConnected) {
        if (block.hasAttribute('data-mg-relocated')) return; // home position unknown; leave it
        cssMove.marker = document.createComment('Custom CSS original position');
        block.parentNode.insertBefore(cssMove.marker, block);
    }
    if (colors.nextElementSibling !== block) colors.after(block);
    block.setAttribute('data-mg-relocated', 'true');
}

function queuePlaceCustomCss() {
    if (cssMove.queued) return;
    cssMove.queued = true;
    requestAnimationFrame(() => {
        cssMove.queued = false;
        placeCustomCss();
    });
}

function setupCustomCssMove() {
    const panel = document.getElementById('user-settings-block-content');
    if (!panel || cssMove.panel === panel) return;
    cssMove.panel = panel;

    // Re-check if something rebuilds the settings panel, or the screen changes size.
    cssMove.observer = new MutationObserver(queuePlaceCustomCss);
    cssMove.observer.observe(panel, { childList: true, subtree: true });
    window.matchMedia(MOBILE_QUERY).addEventListener('change', queuePlaceCustomCss);
}

/* ---------- notification (toast) styles ---------- */

function allToastStyles() {
    return Object.assign({}, BUILTIN_TOASTS, getSettings().customToasts);
}

function uniqueToastId(base) {
    const taken = allToastStyles();
    let id = base === 'none' || BUILTIN_TOASTS[base] ? `${base}-custom` : base;
    for (let n = 2; taken[id]; n++) id = `${base}-${n}`;
    return id;
}

/* One <style> element holds whichever notification style is chosen. */
function applyToastTheme() {
    const s = getSettings();
    const chosen = s.enabled ? allToastStyles()[s.toastTheme] : null;
    let style = document.getElementById('mg-toast-style');

    if (!chosen) {
        style?.remove();
        return;
    }
    if (!style) {
        style = document.createElement('style');
        style.id = 'mg-toast-style';
    }
    // keep it last in <head> so it wins ties against styles loaded earlier
    if (style !== document.head.lastElementChild) document.head.appendChild(style);
    if (style.textContent !== chosen.css) style.textContent = chosen.css;
}

/** id = null -> create new (starts empty); otherwise edit that custom style. */
async function openToastEditor(id) {
    const s = getSettings();
    const editing = id ? s.customToasts[id] : null;
    const startCss = editing ? editing.css : '';

    const wrap = document.createElement('div');
    wrap.className = 'mg-css-editor';
    wrap.innerHTML = `
        <h3>${editing ? `Edit "${esc(editing.name)}"` : 'New notification style'}</h3>
        <p class="mg-css-hint">Plain CSS, written the same way as in Custom CSS. For a full example, choose Basic and export it.</p>
        <input type="text" class="text_pole mg-css-name" maxlength="40" placeholder="Style name">
        <textarea class="text_pole mg-css-text" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder=".toast { border-radius: 12px; }&#10;.toast-success { background-color: #1f3d2b; }"></textarea>
        <div class="mg-css-error" hidden></div>`;
    const nameInput = wrap.querySelector('.mg-css-name');
    const textarea = wrap.querySelector('.mg-css-text');
    const errorBox = wrap.querySelector('.mg-css-error');
    nameInput.value = editing ? editing.name : '';
    textarea.value = startCss;
    const showError = (message) => { errorBox.textContent = message; errorBox.hidden = !message; };

    const commit = () => {
        const name = nameInput.value.trim();
        const css = textarea.value;
        if (!name) { showError('Give the style a name.'); return false; }
        if (!css.trim()) { showError('The CSS is empty.'); return false; }
        if (css.length > MAX_TOAST_CSS) { showError('That CSS is too long to save here.'); return false; }
        const settings = getSettings();
        const newId = editing ? id : uniqueToastId(slug(name));
        settings.customToasts[newId] = { name, css };
        settings.toastTheme = newId;
        save();
        apply();
        syncSettingsUI();
        toast('success', editing ? `Saved "${name}".` : `Created "${name}".`);
        return true;
    };

    const c = SillyTavern.getContext();
    if (typeof c.callGenericPopup === 'function' && c.POPUP_TYPE) {
        const OK = c.POPUP_RESULT ? c.POPUP_RESULT.AFFIRMATIVE : 1;
        let saved = false;
        const result = await c.callGenericPopup(wrap, c.POPUP_TYPE.CONFIRM, '', {
            okButton: 'Save', cancelButton: 'Cancel', wide: true, large: true, allowVerticalScrolling: true,
            onClosing: (popup) => {
                if (popup.result !== OK) return true;
                saved = commit();
                return saved; // keep the window open while something is missing
            },
        });
        if (result === OK && !saved) commit(); // older ST without onClosing
        return;
    }

    // fallback: our own simple window
    const box = document.createElement('div');
    box.className = 'mg-css-modal';
    box.innerHTML = '<div class="mg-css-card"></div>';
    box.firstChild.appendChild(wrap);
    const bar = document.createElement('div');
    bar.className = 'mg-css-actions';
    bar.innerHTML = '<div class="menu_button" data-x="cancel">Cancel</div><div class="menu_button" data-x="save">Save</div>';
    box.firstChild.appendChild(bar);
    bar.addEventListener('click', (event) => {
        const button = event.target.closest('[data-x]');
        if (!button) return;
        if (button.dataset.x === 'cancel' || commit()) box.remove();
    });
    document.body.appendChild(box);
    nameInput.focus();
}

async function importToastFile(file) {
    const css = await file.text();
    if (!css.trim() || css.length > MAX_TOAST_CSS) throw new Error('bad file');
    const name = file.name.replace(/\.css$/i, '').slice(0, 40) || 'Imported style';
    const s = getSettings();
    const id = uniqueToastId(slug(name));
    s.customToasts[id] = { name, css };
    s.toastTheme = id;
    save();
    apply();
    syncSettingsUI();
    toast('success', `Added "${name}".`);
}

async function exportToastStyle() {
    const s = getSettings();
    const id = s.toastTheme;
    const chosen = allToastStyles()[id];
    if (chosen) {
        downloadText(chosen.css, `${slug(chosen.name)}.css`);
    } else {
        toast('info', 'Pick a notification style to export first.');
    }
}

/* ---------- pictures supplied by Custom CSS ---------- */

/* The theme never ships pictures. Custom CSS provides them as variables on
   :root, and each part switches on only when its picture is there:

     --function-bg            panel background picture
     --function-control-icon  checked checkbox + slider thumb (one picture for both)
     --function-slider-icon   slider thumb only    (wins over the shared one)
     --function-checkbox-icon checked checkbox only (wins over the shared one)
     --function-slider-track  slider track colour (white if unset)
     --input-icon-gap         space between message box buttons (12px if unset)
     --topbar-icon-*          the nine top-bar icons
     --input-icon-*           the buttons around the message box

   Anything left unset keeps its normal SillyTavern / Moonlit look. */
const ICONS = [
    // top bar, left to right
    ['#leftNavDrawerIcon', '--topbar-icon-preset'],
    ['#API-status-top', '--topbar-icon-api'],
    ['#advanced-formatting-button > .drawer-toggle > .drawer-icon', '--topbar-icon-formatting'],
    ['#WIDrawerIcon', '--topbar-icon-worldinfo'],
    ['#user-settings-button > .drawer-toggle > .drawer-icon', '--topbar-icon-settings'],
    ['#backgrounds-drawer-toggle > .drawer-icon', '--topbar-icon-backgrounds'],
    ['#extensions-settings-button > .drawer-toggle > .drawer-icon', '--topbar-icon-extensions'],
    ['#persona-management-button > .drawer-toggle > .drawer-icon', '--topbar-icon-persona'],
    ['#rightNavDrawerIcon', '--topbar-icon-characters'],
    // message box
    ['#options_button', '--input-icon-options'],
    ['#extensionsMenuButton', '--input-icon-extensions'],
    ['#mes_impersonate', '--input-icon-impersonate'],
    ['#send_but', '--input-icon-send'],
    ['#mes_stop', '--input-icon-stop'],
];

const customVars = { queued: false, observer: null };

function syncCustomVars() {
    const root = getComputedStyle(document.documentElement);
    const has = (name) => {
        const value = root.getPropertyValue(name).trim();
        return value !== '' && value !== 'none';
    };
    const on = !!getSettings().enabled;

    document.body.classList.toggle('mg-panel-bg', on && has('--function-bg'));
    // slider and checkbox each take their own picture, or the shared one
    const shared = has('--function-control-icon');
    for (const [cls, own, target] of [
        ['mg-panel-slider', '--function-slider-icon', '--mg-slider-icon'],
        ['mg-panel-check', '--function-checkbox-icon', '--mg-check-icon'],
    ]) {
        const source = has(own) ? own : (shared ? '--function-control-icon' : '');
        document.body.classList.toggle(cls, on && !!source);
        const wanted = on && source ? `var(${source})` : '';
        if (document.body.style.getPropertyValue(target) !== wanted) {
            if (wanted) document.body.style.setProperty(target, wanted);
            else document.body.style.removeProperty(target);
        }
    }

    // slider track colour + message box button gap: only when set and not "none"
    for (const [own, target] of [
        ['--function-slider-track', '--mg-slider-track'],
        ['--input-icon-gap', '--mg-input-gap'],
    ]) {
        const wanted = on && has(own) ? `var(${own})` : '';
        if (document.body.style.getPropertyValue(target) !== wanted) {
            if (wanted) document.body.style.setProperty(target, wanted);
            else document.body.style.removeProperty(target);
        }
    }

    let anyTopbarIcon = false;
    for (const [selector, variable] of ICONS) {
        const set = on && has(variable);
        if (set && variable.startsWith('--topbar-')) anyTopbarIcon = true;
        const el = document.querySelector(selector);
        if (!el) continue; // some buttons are added later; the observer below re-runs this
        if (el.classList.contains('mg-icon') !== set) el.classList.toggle('mg-icon', set);
        const wanted = set ? `var(${variable})` : '';
        if (el.style.getPropertyValue('--mg-icon') !== wanted) {
            if (set) el.style.setProperty('--mg-icon', wanted);
            else el.style.removeProperty('--mg-icon');
        }
    }
    document.body.classList.toggle('mg-topbar', anyTopbarIcon);
}

function queueSyncCustomVars() {
    if (customVars.queued) return;
    customVars.queued = true;
    requestAnimationFrame(() => {
        customVars.queued = false;
        syncCustomVars();
    });
}

/* Custom CSS lives in a <style> in <head>: re-check whenever it is edited or a
   theme loads. Also re-check when buttons are added around the message box. */
function watchCustomVars() {
    if (customVars.observer) return;
    customVars.observer = new MutationObserver(queueSyncCustomVars);
    customVars.observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    const form = document.getElementById('send_form');
    if (form) customVars.observer.observe(form, { childList: true, subtree: true });
}

/* ---------- preset panel: Parameters / Prompts tabs ---------- */

/* The tabs are Chat Completion Tabs by Rivelle (AGPL-3.0), bundled unchanged in
   components/ — see THIRD-PARTY-NOTICES.md. It is loaded on demand, so if a
   future SillyTavern breaks it, the rest of the theme still works. */
const presetTabs = { manager: null, loading: null, error: null };

/* True only when the separate Chat Completion Tabs extension is installed AND
   switched on in its own settings. Installed-but-switched-off does not count. */
function originalTabsActive() {
    if (!window.ChatCompletionTabs) return false;
    const theirs = SillyTavern.getContext().extensionSettings?.ChatCompletionTabs;
    return !theirs || theirs.enabled !== false;
}

async function applyPresetTabs() {
    try {
        const s = getSettings();
        const want = !!s.enabled && !!s.presetTabs && !originalTabsActive();

        if (!presetTabs.manager && want && !presetTabs.error) {
            presetTabs.loading ??= import('./components/openai-tab-manager.js')
                .then((module) => { presetTabs.manager = new module.OpenAITabManager(); })
                .catch((error) => {
                    presetTabs.error = String(error?.message || error);
                    console.error(`[${NAME}] preset tabs could not be loaded`, error);
                });
            await presetTabs.loading;
        }

        // settings may have changed while the module was loading: read them again
        const now = getSettings();
        presetTabs.manager?.setEnabled(!!now.enabled && !!now.presetTabs && !originalTabsActive());
    } catch (error) {
        presetTabs.error = String(error?.message || error);
        console.error(`[${NAME}] preset tabs`, error);
    }
}

/* ---------- API key fields: coloured dots instead of the tick / cross ---------- */

/* SillyTavern builds the "Key saved" / "Missing key" placeholder from two
   attributes on #viewSecrets, so swapping the symbol there covers every key field. */
const KEY_MARKS = [
    [/\u2714\uFE0F?|\u2705/g, '\u{1F7E2}', '\u2714\uFE0F'],   // tick  -> green circle
    [/\u274C/g, '\u{1F534}', '\u274C'],                        // cross -> red circle
];
const keyMarks = { observer: null };

function swapKeyMarkText(text, on) {
    let result = text;
    for (const [original, dot, restore] of KEY_MARKS) {
        result = on ? result.replace(original, dot) : result.split(dot).join(restore);
    }
    return result;
}

function applyKeyMarks() {
    const on = !!getSettings().enabled;
    const source = document.getElementById('viewSecrets');
    if (source) {
        for (const name of ['key_saved_text', 'missing_key_text']) {
            const current = source.getAttribute(name);
            if (current === null) continue;
            const wanted = swapKeyMarkText(current, on);
            if (wanted !== current) source.setAttribute(name, wanted);
        }
        if (!keyMarks.observer) {
            // a language change rewrites these attributes; put the dots back
            keyMarks.observer = new MutationObserver(applyKeyMarks);
            keyMarks.observer.observe(source, { attributes: true, attributeFilter: ['key_saved_text', 'missing_key_text'] });
        }
    }
    // placeholders that were already filled in
    for (const input of document.querySelectorAll('input[placeholder]')) {
        const current = input.getAttribute('placeholder');
        const wanted = swapKeyMarkText(current, on);
        if (wanted !== current) input.setAttribute('placeholder', wanted);
    }
}

/* ---------- base layer (from Moonlit Echoes) ---------- */

/* components/moonlit-base.css is switched on and off with the theme. It has to sit just
   before our own style.css so that our rules win where the two overlap. */
const BASE_LINK_ID = 'mg-base-style';

function ownStyleLink() {
    const wanted = new URL('style.css', import.meta.url).pathname;
    return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((link) => {
        try { return new URL(link.href, location.href).pathname === wanted; } catch { return false; }
    }) || null;
}

function applyBase(on) {
    let link = document.getElementById(BASE_LINK_ID);
    if (!on) {
        link?.remove();
        return;
    }
    if (!link) {
        link = document.createElement('link');
        link.id = BASE_LINK_ID;
        link.rel = 'stylesheet';
        link.href = new URL('components/moonlit-base.css', import.meta.url).href;
    }
    const own = ownStyleLink();
    if (own) {
        if (own.previousElementSibling !== link) own.before(link);
    } else if (!link.isConnected) {
        document.head.appendChild(link); // put in place by the later re-check
    }
}

/* Moonlit Echoes itself must be off: two copies of the same rules fight. */
let moonlitWarned = false;
function warnIfMoonlitActive() {
    if (moonlitWarned || !getSettings().enabled) return;
    if (!document.getElementById('MoonlitEchosTheme-style')) return;
    moonlitWarned = true;
    toast('warning', 'Moonlit Echoes is still switched on. Turn it off in its own settings: Asphodel Reverie now includes what it needs from it.');
}

/* ---------- chat style: locked to Whisper ---------- */

const OTHER_CHAT_STYLES = ['flatchat', 'bubblechat', 'documentstyle', 'echostyle', 'hushstyle', 'ripplestyle', 'tidestyle'];
const whisper = { observer: null, wasOn: false };

function applyWhisper() {
    const on = !!getSettings().enabled;
    const body = document.body;
    const select = document.getElementById('chat_display');

    if (on) {
        for (const name of OTHER_CHAT_STYLES) if (body.classList.contains(name)) body.classList.remove(name);
        if (!body.classList.contains('whisperstyle')) body.classList.add('whisperstyle');
        if (select && !select.dataset.mgLocked) {
            select.dataset.mgLocked = 'true';
            select.dataset.mgTitle = select.title || '';
            select.disabled = true;
            select.title = `${NAME} keeps the chat in the Whisper style.`;
        }
        if (!whisper.observer) {
            // SillyTavern puts its own chat-style class back at times; undo that
            whisper.observer = new MutationObserver(applyWhisper);
            whisper.observer.observe(body, { attributes: true, attributeFilter: ['class'] });
        }
    } else {
        whisper.observer?.disconnect();
        whisper.observer = null;
        if (select?.dataset.mgLocked) {
            select.disabled = false;
            select.title = select.dataset.mgTitle || '';
            delete select.dataset.mgLocked;
            delete select.dataset.mgTitle;
        }
        if (whisper.wasOn) {
            body.classList.remove('whisperstyle');
            // hand the chat back to SillyTavern's own style
            if (select?.value === '1') body.classList.add('bubblechat');
            if (select?.value === '2') body.classList.add('documentstyle');
        }
    }
    whisper.wasOn = on;
}

/* Whisper paints each message's avatar as its background, so every message
   needs its avatar address as a CSS variable. (After Moonlit Echoes' avatar
   injector; the <img> itself is left alone.) */
const avatars = { observer: null, timer: 0 };

function avatarUrls(rawSrc) {
    if (!rawSrc) return null;
    const path = rawSrc.startsWith(location.origin) ? rawSrc.slice(location.origin.length) : rawSrc;
    const trimmed = path.replace(/^\//, '');
    const abs = (p) => (p.startsWith('/') || /^[a-z]+:/i.test(p) ? p : `/${p}`);
    let type = null;
    let file = trimmed;

    try {
        const parsed = new URL(path, location.origin);
        if (parsed.pathname.endsWith('thumbnail') && parsed.searchParams.get('type') && parsed.searchParams.get('file')) {
            type = parsed.searchParams.get('type');
            file = parsed.searchParams.get('file');
        }
    } catch { /* fall through to the path checks */ }

    if (!type && trimmed.startsWith('characters/')) { type = 'avatar'; file = decodeURIComponent(trimmed.slice('characters/'.length)); }
    if (!type && trimmed.startsWith('User%20Avatars/')) { type = 'persona'; file = decodeURIComponent(trimmed.slice('User%20Avatars/'.length)); }
    if (!type && trimmed.startsWith('User Avatars/')) { type = 'persona'; file = trimmed.slice('User Avatars/'.length); }

    if (type === 'avatar' || type === 'persona') {
        const folder = type === 'avatar' ? 'characters' : 'User Avatars';
        return {
            thumb: `/thumbnail?type=${type}&file=${encodeURIComponent(file)}`,
            original: `/${encodeURI(folder)}/${encodeURIComponent(file)}`,
        };
    }
    return { thumb: abs(path), original: abs(path) };
}

function updateAvatars() {
    if (!getSettings().enabled) return;
    for (const mes of document.querySelectorAll('#chat .mes')) {
        const img = mes.querySelector('.avatar img');
        const src = img?.getAttribute('src') || img?.getAttribute('data-src');
        if (!src || mes.dataset.mgAvatar === src) continue;
        const urls = avatarUrls(src);
        if (!urls) continue;
        const css = (url) => `url("${url.replace(/["\\\n]/g, encodeURIComponent)}")`;
        mes.dataset.mgAvatar = src;
        mes.style.setProperty('--mes-avatar-thumb-url', css(urls.thumb));
        mes.style.setProperty('--mes-avatar-original-url', css(urls.original));
        mes.style.setProperty('--mes-avatar-url', css(urls.thumb));
    }
}

function watchAvatars() {
    const chat = document.getElementById('chat');
    if (!chat || avatars.observer) return;
    avatars.observer = new MutationObserver(() => {
        clearTimeout(avatars.timer);
        avatars.timer = setTimeout(updateAvatars, 100);
    });
    avatars.observer.observe(chat, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
}

/* The open menus are sized against the message box, so its height is kept in
   --formSheldHeight (as Moonlit Echoes does). */
function watchFormHeight() {
    const form = document.getElementById('form_sheld');
    if (!form || form.dataset.mgWatched) return;
    form.dataset.mgWatched = 'true';
    const update = () => {
        const height = form.getBoundingClientRect().height;
        if (height > 0) document.documentElement.style.setProperty('--formSheldHeight', `${height}px`);
    };
    if (typeof ResizeObserver === 'function') new ResizeObserver(update).observe(form);
    window.addEventListener('resize', update);
    update();
}

/* ---------- theme presets (colours, Whisper, avatar border) ---------- */

/* Colours are kept as "rgba(r, g, b, a)". These read and write that form
   (and #hex, for the text box). null = some other kind of CSS colour. */
function parseColor(value) {
    const text = String(value ?? '').trim();
    let m = text.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i);
    if (m) {
        const [r, g, b] = [m[1], m[2], m[3]].map(n => Math.min(255, Math.round(Number(n))));
        return { r, g, b, a: m[4] === undefined ? 1 : Math.min(1, Number(m[4])) };
    }
    m = text.match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (!m) return null;
    let hex = m[1];
    if (hex.length === 3) hex = hex.replace(/./g, ch => ch + ch);
    const part = (i) => parseInt(hex.slice(i, i + 2), 16);
    return { r: part(0), g: part(2), b: part(4), a: hex.length === 8 ? Math.round(part(6) / 255 * 100) / 100 : null };
}

function toRgba(c) {
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.round(c.a * 100) / 100})`;
}

function toHex(c) {
    return '#' + [c.r, c.g, c.b].map(n => n.toString(16).padStart(2, '0')).join('');
}

/* Values end up inside a <style>, so only plain CSS values get through. */
function safeCssValue(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const text = value.trim();
    if (!text || text.length > 120 || /[;{}<>\\@]|\/\*|url\s*\(/i.test(text)) return fallback;
    return text;
}

function cleanLook(source, base) {
    const from = source && typeof source === 'object' ? source : {};
    const look = {};
    for (const [key] of LOOK_COLORS) look[key] = safeCssValue(from[key], base[key]);
    const width = safeCssValue(from.customWhisperAvatarWidth, base.customWhisperAvatarWidth);
    look.customWhisperAvatarWidth = /^\d+(\.\d+)?(%|px|em|rem|vw|dvw)$/.test(width) ? width : base.customWhisperAvatarWidth;
    look.customWhisperAvatarAlign = WHISPER_ALIGN.includes(from.customWhisperAvatarAlign) ? from.customWhisperAvatarAlign : base.customWhisperAvatarAlign;
    look.hideAvatarBorder = typeof from.hideAvatarBorder === 'boolean' ? from.hideAvatarBorder : base.hideAvatarBorder;
    return look;
}

/* Where a missing value comes from: the built-in default, or for the FROM_ST
   colours the user's own SillyTavern colour. */
function lookBase() {
    const base = Object.assign({}, DEFAULT_LOOK);
    const power = SillyTavern.getContext().powerUserSettings;
    if (!power) return base;
    for (const [key, name] of Object.entries(FROM_ST)) {
        const value = safeCssValue(power[name], null);
        if (value) base[key] = value;
    }
    return base;
}

function allPresets() {
    return Object.assign({ [DEFAULT_PRESET]: DEFAULT_LOOK }, getSettings().presets);
}

/* "rgba(1,2,3,1)" and "rgba(1, 2, 3, 1.0)" are the same colour. */
function normalValue(value) {
    if (typeof value !== 'string') return value;
    return value.toLowerCase().replace(/\s+/g, '').replace(/\d*\.?\d+/g, n => String(Math.round(Number(n) * 100) / 100));
}

function sameLook(a, b) {
    return Object.keys(DEFAULT_LOOK).every(key => normalValue(a[key]) === normalValue(b[key]));
}

function applyLook() {
    const s = getSettings();
    let style = document.getElementById('mg-look-style');

    document.body.classList.toggle('ar-no-avatar-border', !!s.enabled && !!s.look.hideAvatarBorder);

    if (!s.enabled) {
        style?.remove();
        return;
    }
    if (!style) {
        style = document.createElement('style');
        style.id = 'mg-look-style';
        document.head.appendChild(style);
    }
    const lines = Object.entries(s.look)
        .filter(([, value]) => typeof value === 'string')
        .map(([key, value]) => `  --${key}: ${value} !important;`);
    const css = `:root {\n${lines.join('\n')}\n}`;
    if (style.textContent !== css) style.textContent = css;
}

function setLook(key, value) {
    const s = getSettings();
    const next = cleanLook(Object.assign({}, s.look, { [key]: value }), s.look);
    if (sameLook(next, s.look)) return;
    s.look = next;
    save();
    applyLook();
    syncLookState();
}

function loadPreset(name, quiet) {
    const presets = allPresets();
    if (!Object.hasOwn(presets, name)) return false;
    const s = getSettings();
    s.activePreset = name;
    s.look = cleanLook(presets[name], lookBase());
    save();
    applyLook();
    syncSettingsUI();
    if (!quiet) toast('info', `Theme preset: ${name}`);
    return true;
}

function storePreset(name) {
    const s = getSettings();
    s.presets[name] = Object.assign({}, s.look);
    s.activePreset = name;
    save();
    syncSettingsUI();
}

async function askText(title, value) {
    const c = SillyTavern.getContext();
    if (typeof c.callGenericPopup === 'function' && c.POPUP_TYPE?.INPUT !== undefined) {
        const result = await c.callGenericPopup(esc(title), c.POPUP_TYPE.INPUT, value || '');
        return typeof result === 'string' ? result : null;
    }
    return window.prompt(title, value || '');
}

function cleanPresetName(name) {
    return String(name ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80);
}

async function savePresetAs() {
    const s = getSettings();
    const themeName = document.getElementById('themes')?.value || '';
    const suggestion = s.activePreset === DEFAULT_PRESET ? themeName : s.activePreset;
    const answer = await askText('Name for the new theme preset. Give it the same name as a UI Theme and it is picked automatically whenever that theme is chosen.', suggestion);
    if (answer === null) return;
    const name = cleanPresetName(answer);
    if (!name) { toast('info', 'The preset needs a name.'); return; }
    if (name.toLowerCase() === DEFAULT_PRESET.toLowerCase()) { toast('info', `"${DEFAULT_PRESET}" is the built-in preset. Pick another name.`); return; }
    if (Object.hasOwn(getSettings().presets, name) && !(await confirmBox(`A preset named "${name}" already exists. Replace it?`))) return;
    storePreset(name);
    toast('success', `Saved preset "${name}".`);
}

function presetFileName(name) {
    return `${PRESET_FILE_PREFIX}${name.replace(/[\\/:*?"<>|]+/g, '_')}.json`;
}

function exportPreset() {
    const s = getSettings();
    const data = {
        asphodelReveriePreset: true,
        presetVersion: 1,
        presetName: s.activePreset,
        settings: Object.assign({}, s.look),
    };
    downloadText(JSON.stringify(data, null, 2), presetFileName(s.activePreset), 'application/json');
}

/* Takes our own preset files and Moonlit Echoes preset files (only the values
   Asphodel Reverie has a control for are read from those). */
async function importPresetFile(file) {
    if (file.size > 200000) throw new Error('too big');
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== 'object' || !data.settings || typeof data.settings !== 'object') throw new Error('not a preset');
    if (!data.asphodelReveriePreset && !data.moonlitEchoesPreset) throw new Error('not a preset');

    const fromFile = file.name.replace(/\.json$/i, '').replace(/^\[(AR|Moonlit)\]\s*/i, '');
    let name = cleanPresetName(data.presetName);
    if (!name || name.toLowerCase() === DEFAULT_PRESET.toLowerCase()) name = cleanPresetName(fromFile) || 'Imported preset';
    if (name.toLowerCase() === DEFAULT_PRESET.toLowerCase()) name = 'Imported preset';
    if (Object.hasOwn(getSettings().presets, name) && !(await confirmBox(`A preset named "${name}" already exists. Replace it?`))) return;

    const s = getSettings();
    s.presets[name] = cleanLook(data.settings, lookBase());
    save();
    loadPreset(name, true);
    toast('success', `Added preset "${name}".`);
}

/* A preset named like a UI Theme follows that theme. */
function watchThemePicker() {
    document.addEventListener('change', (event) => {
        if (event.target?.id !== 'themes') return;
        const s = getSettings();
        const name = event.target.value;
        if (!s.enabled || !name || name === s.activePreset) return;
        if (Object.hasOwn(s.presets, name)) loadPreset(name);
    });
}

/* ---------- checkboxes on touch screens: only the box itself toggles ---------- */

/* A tap on the text beside a checkbox does nothing on a phone, so a finger
   that lands on it while scrolling can't flip the setting. Checkboxes whose
   box is hidden (the label is the only thing to tap) are left alone. */
const TOUCH_QUERY = '(pointer: coarse), (max-width: 1000px)';
/* SillyTavern's own menus, panels and popups — the same list as in moonlit-base.css.
   Chat messages and other extensions' windows are outside it and left alone. */
const UI_ZONES = '#top-bar, #top-settings-holder, .drawer-content, #form_sheld, dialog, .popup, #dialogue_popup, #character_popup, #select_chat_popup, #floatingPrompt, #cfgConfig, #logprobsViewer, #completion_prompt_manager_popup, #options, #extensionsMenu';

function watchCheckboxLabels() {
    document.addEventListener('click', (event) => {
        if (!getSettings().enabled || !window.matchMedia(TOUCH_QUERY).matches) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const label = target.closest('label');
        const box = label?.control;
        if (!box || box.type !== 'checkbox' || target === box) return;
        if (!label.closest(UI_ZONES)) return;
        if (target.closest('a, button, input, select, textarea, .menu_button')) return;
        const size = box.getBoundingClientRect();
        if (size.width < 8 || size.height < 8 || getComputedStyle(box).visibility === 'hidden') return;
        event.preventDefault();
    }, true);
}

/* ---------- apply ---------- */

function apply() {
    const s = getSettings();
    const on = !!s.enabled;
    const cols = Math.min(6, Math.max(2, Number(s.gridCols) || DEFAULTS.gridCols));

    for (const name of THEME_CLASSES) document.body.classList.toggle(name, on);
    document.body.style.setProperty('--mg-grid-cols', String(cols));

    applyBase(on);
    applyLook();
    applyWhisper();
    updateAvatars();

    placeLibraryTools(on);
    if (!on) setPinMode(false);
    markPins();
    placeCustomCss();
    applyToastTheme();
    syncCustomVars();
    applyKeyMarks();
    applyPresetTabs();
}

/* ---------- settings panel ---------- */

function addSettingsPanel() {
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!host || document.getElementById('mg_settings')) return;

    host.insertAdjacentHTML('beforeend', `
        <div id="mg_settings" class="mg-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>${NAME}</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="mg-set-body">
                    <div class="styled_description_block" style="text-align:center;">
                        <small>
                            Created by <a href="https://bio.site/deMors" target="_blank" rel="noopener noreferrer">Mors</a>
                            with help of Friends<br>
                            Hopefully, you guys enjoy it. Have fun:)
                        </small>
                    </div>

                    <hr>

                    <label class="checkbox_label" for="mg_enabled"><input type="checkbox" id="mg_enabled"> <span>Enable ${NAME}</span></label>

                    <label class="checkbox_label" for="mg_preset_tabs"><input type="checkbox" id="mg_preset_tabs"> <span>Preset tabs (Parameters / Prompts)</span></label>

                    <div class="mg-set-row">
                        <label for="mg_grid_cols">Grid columns</label>
                        <select id="mg_grid_cols" class="text_pole">
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                        </select>
                    </div>

                    <div class="mg-set-row">
                        <label for="mg_toast_theme">Notifications</label>
                        <select id="mg_toast_theme" class="text_pole"></select>
                    </div>
                    <div class="mg-set-row mg-set-tools">
                        <div id="mg_toast_new" class="menu_button fa-solid fa-plus" role="button" tabindex="0" title="Create a new notification style"></div>
                        <div id="mg_toast_edit" class="menu_button fa-solid fa-pencil" role="button" tabindex="0" title="Edit this style"></div>
                        <div id="mg_toast_import" class="menu_button fa-solid fa-file-import" role="button" tabindex="0" title="Import style (.css)"></div>
                        <div id="mg_toast_export" class="menu_button fa-solid fa-file-export" role="button" tabindex="0" title="Export this style"></div>
                        <div id="mg_toast_delete" class="menu_button fa-solid fa-skull" role="button" tabindex="0" title="Delete this style"></div>
                    </div>
                    <input type="file" id="mg_toast_file" accept=".css,text/css" hidden>

                    <hr>

                    <div class="mg-set-row">
                        <label for="mg_preset">Theme preset</label>
                        <select id="mg_preset" class="text_pole"></select>
                    </div>
                    <div class="mg-set-row mg-set-tools">
                        <div id="mg_preset_save" class="menu_button fa-solid fa-floppy-disk" role="button" tabindex="0" title="Save the changes to this preset"></div>
                        <div id="mg_preset_new" class="menu_button fa-solid fa-plus" role="button" tabindex="0" title="Save as a new preset"></div>
                        <div id="mg_preset_import" class="menu_button fa-solid fa-file-import" role="button" tabindex="0" title="Import preset (.json)"></div>
                        <div id="mg_preset_export" class="menu_button fa-solid fa-file-export" role="button" tabindex="0" title="Export this preset"></div>
                        <div id="mg_preset_delete" class="menu_button fa-solid fa-skull" role="button" tabindex="0" title="Delete this preset"></div>
                    </div>
                    <input type="file" id="mg_preset_file" accept=".json,application/json" hidden>
                    <div id="mg_preset_state" class="mg-set-state" hidden></div>

                    <div class="mg-tabs" role="tablist">
                        <div class="mg-tab menu_button" data-tab="ui" role="tab" tabindex="0">Interface</div>
                        <div class="mg-tab menu_button" data-tab="chat" role="tab" tabindex="0">Chat</div>
                    </div>

                    <div class="mg-tab-panel" data-panel="ui">
                        <div class="mg-set-colors">${colorRows('ui')}</div>
                    </div>

                    <div class="mg-tab-panel" data-panel="chat">
                        <div class="mg-set-row mg-set-avatar">
                            <label for="mg_whisper_width">Avatar width</label>
                            <input type="text" id="mg_whisper_width" class="text_pole" placeholder="50%" autocomplete="off">
                            <label for="mg_whisper_align">Position</label>
                            <select id="mg_whisper_align" class="text_pole">
                                <option value="top">Top</option>
                                <option value="center">Center</option>
                                <option value="bottom">Bottom</option>
                            </select>
                        </div>
                        <label class="checkbox_label" for="mg_avatar_border"><input type="checkbox" id="mg_avatar_border"> <span>Hide avatar border</span></label>
                        <div class="mg-set-colors">${colorRows('chat')}</div>
                    </div>

                    <div class="mg-set-note">
                        Base styling: <a href="https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme" target="_blank" rel="noopener noreferrer">Moonlit Echoes Theme</a> by Rivelle.<br>
                        Preset tabs: <a href="https://github.com/RivelleDays/SillyTavern-ChatCompletionTabs" target="_blank" rel="noopener noreferrer">Chat Completion Tabs</a> by Rivelle.
                    </div>
                    </div>
                </div>
            </div>
        </div>`);

    const $ = (id) => document.getElementById(id);

    $('mg_enabled').addEventListener('change', (event) => {
        getSettings().enabled = event.target.checked;
        save();
        apply();
    });

    $('mg_preset_tabs').addEventListener('change', (event) => {
        getSettings().presetTabs = event.target.checked;
        save();
        apply();
    });

    $('mg_grid_cols').addEventListener('change', (event) => {
        getSettings().gridCols = Number(event.target.value);
        save();
        apply();
    });

    $('mg_toast_theme').addEventListener('change', (event) => {
        getSettings().toastTheme = event.target.value;
        save();
        apply();
        syncSettingsUI();
        toast('info', 'This is how notifications look now.');
    });

    const onTap = (target, fn) => {
        const el = typeof target === 'string' ? $(target) : target;
        el.addEventListener('click', fn);
        el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fn(); }
        });
    };

    onTap('mg_toast_new', () => openToastEditor(null));
    onTap('mg_toast_edit', () => {
        const s = getSettings();
        if (!s.customToasts[s.toastTheme]) { toast('info', "Built-in styles can't be edited. Tap + to make a new one."); return; }
        openToastEditor(s.toastTheme);
    });
    onTap('mg_toast_delete', async () => {
        const s = getSettings();
        const current = s.customToasts[s.toastTheme];
        if (!current) { toast('info', "Built-in styles can't be deleted."); return; }
        if (!(await confirmBox(`Delete the notification style "${current.name}"?`))) return;
        const settings = getSettings();
        delete settings.customToasts[settings.toastTheme];
        settings.toastTheme = DEFAULT_TOAST;
        save();
        apply();
        syncSettingsUI();
        toast('success', `Deleted "${current.name}".`);
    });
    onTap('mg_toast_import', () => $('mg_toast_file').click());
    onTap('mg_toast_export', () => {
        exportToastStyle().catch(() => toast('error', "Couldn't export that style."));
    });
    $('mg_toast_file').addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try {
            await importToastFile(file);
        } catch (error) {
            toast('error', "That file couldn't be used as a notification style.");
        }
        event.target.value = '';
    });

    /* theme presets */
    $('mg_preset').addEventListener('change', (event) => loadPreset(event.target.value, true));

    onTap('mg_preset_save', () => {
        const s = getSettings();
        if (s.activePreset === DEFAULT_PRESET) { toast('info', `"${DEFAULT_PRESET}" can't be changed. Tap + to save these values as a new preset.`); return; }
        storePreset(s.activePreset);
        toast('success', `Saved preset "${s.activePreset}".`);
    });
    onTap('mg_preset_new', () => { savePresetAs().catch(() => toast('error', "Couldn't save that preset.")); });
    onTap('mg_preset_import', () => $('mg_preset_file').click());
    onTap('mg_preset_export', () => {
        try { exportPreset(); } catch (error) { toast('error', "Couldn't export that preset."); }
    });
    onTap('mg_preset_delete', async () => {
        const name = getSettings().activePreset;
        if (name === DEFAULT_PRESET) { toast('info', `"${DEFAULT_PRESET}" can't be deleted.`); return; }
        if (!(await confirmBox(`Delete the theme preset "${name}"?`))) return;
        delete getSettings().presets[name];
        loadPreset(DEFAULT_PRESET, true);
        toast('success', `Deleted "${name}".`);
    });
    $('mg_preset_file').addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try {
            await importPresetFile(file);
        } catch (error) {
            toast('error', "That file isn't a theme preset.");
        }
        event.target.value = '';
    });

    for (const row of document.querySelectorAll('#mg_settings .mg-color')) {
        const key = row.dataset.look;
        const current = () => parseColor(getSettings().look[key]);

        // the swatch: SillyTavern's own colour picker
        row.querySelector('.mg-color-pick').addEventListener('change', (event) => {
            if (lookSync.busy) return;
            const rgba = event.detail?.rgba;
            if (!rgba) return;
            setLook(key, rgba);
            syncColorRow(row, false);
        });
        // the text box: #hex (keeps the opacity) or any rgba(...)
        row.querySelector('.mg-color-hex').addEventListener('change', (event) => {
            const typed = parseColor(event.target.value);
            if (typed) {
                if (typed.a === null) typed.a = current()?.a ?? 1;
                setLook(key, toRgba(typed));
            } else {
                setLook(key, event.target.value); // other CSS colours are kept as typed, if safe
            }
            syncColorRow(row, true);
        });
        row.querySelector('.mg-color-alpha input').addEventListener('input', (event) => {
            const colour = current();
            if (!colour) return;
            colour.a = Number(event.target.value) / 100;
            setLook(key, toRgba(colour));
            syncColorRow(row, true);
        });
    }
    $('mg_whisper_width').addEventListener('change', (event) => {
        const value = event.target.value.trim();
        setLook('customWhisperAvatarWidth', /^\d+(\.\d+)?$/.test(value) ? `${value}%` : value);
        event.target.value = getSettings().look.customWhisperAvatarWidth; // shows what was kept
    });
    $('mg_whisper_align').addEventListener('change', (event) => setLook('customWhisperAvatarAlign', event.target.value));
    $('mg_avatar_border').addEventListener('change', (event) => setLook('hideAvatarBorder', event.target.checked));

    for (const el of document.querySelectorAll('#mg_settings .mg-tab')) onTap(el, () => showTab(el.dataset.tab));
    showTab(openTab);

    syncSettingsUI();
}

/* The colour rows of one settings tab. */
function colorRows(tab) {
    return LOOK_COLORS.filter(([, , , t]) => t === tab).map(([key, label, hint]) => `
                        <div class="mg-color" data-look="${key}">
                            <b>${label}</b>
                            <small>${esc(hint)}</small>
                            <div class="mg-color-row">
                                <toolcool-color-picker class="mg-color-pick" button-width="2.4rem" button-height="2.4rem" button-padding="0" color="${esc(DEFAULT_LOOK[key])}"></toolcool-color-picker>
                                <input type="text" class="text_pole mg-color-hex" maxlength="60" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="${label}">
                                <label class="mg-color-alpha"><span>Opacity</span><input type="range" min="0" max="100" step="1"></label>
                                <span class="mg-color-num"></span>
                            </div>
                        </div>`).join('');
}

/* Interface / Chat tabs in the settings panel. The open tab is kept until reload. */
let openTab = 'ui';
function showTab(tab) {
    openTab = tab;
    for (const el of document.querySelectorAll('#mg_settings .mg-tab')) {
        const on = el.dataset.tab === tab;
        el.classList.toggle('mg-tab-on', on);
        el.setAttribute('aria-selected', String(on));
    }
    for (const el of document.querySelectorAll('#mg_settings .mg-tab-panel')) el.hidden = el.dataset.panel !== tab;
}

const lookSync = { busy: false, timer: 0 };

/* Fill one colour row from the settings. withPicker = also move the swatch
   (not wanted while the picker itself is the thing being dragged). */
function syncColorRow(row, withPicker) {
    const value = getSettings().look[row.dataset.look];
    const colour = parseColor(value);
    const hex = row.querySelector('.mg-color-hex');
    const slider = row.querySelector('.mg-color-alpha input');
    const percent = colour ? Math.round((colour.a ?? 1) * 100) : 100;

    if (document.activeElement !== hex || withPicker) hex.value = colour ? toHex(colour) : value;
    slider.disabled = !colour;
    if (Number(slider.value) !== percent) slider.value = String(percent);
    row.querySelector('.mg-color-num').textContent = String(percent);

    if (!withPicker) return;
    const picker = row.querySelector('.mg-color-pick');
    if (picker.getAttribute('color') === value) return;
    lookSync.busy = true; // setting the swatch makes it report a change; ignore that one
    picker.setAttribute('color', value);
    clearTimeout(lookSync.timer);
    lookSync.timer = setTimeout(() => { lookSync.busy = false; }, 200);
}

/* "Unsaved changes" line + the dimmed Save / Delete buttons. */
function syncLookState() {
    const $ = (id) => document.getElementById(id);
    if (!$('mg_settings')) return;
    const s = getSettings();
    const isDefault = s.activePreset === DEFAULT_PRESET;
    const dirty = !sameLook(s.look, cleanLook(allPresets()[s.activePreset], lookBase())); // presets saved before a value existed get its default

    $('mg_preset_save').classList.toggle('mg-locked', isDefault || !dirty);
    $('mg_preset_delete').classList.toggle('mg-locked', isDefault);
    const state = $('mg_preset_state');
    state.hidden = !dirty;
    state.textContent = dirty
        ? (isDefault ? 'Changed from Default — tap + to keep it as your own preset.' : 'Unsaved changes — tap the disk to save.')
        : '';
}

function syncSettingsUI() {
    const $ = (id) => document.getElementById(id);
    if (!$('mg_settings')) return;
    const s = getSettings();

    const presetNames = Object.keys(allPresets());
    $('mg_preset').innerHTML = presetNames.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
    $('mg_preset').value = s.activePreset;

    for (const row of document.querySelectorAll('#mg_settings .mg-color')) syncColorRow(row, true);
    $('mg_whisper_width').value = s.look.customWhisperAvatarWidth;
    $('mg_whisper_align').value = s.look.customWhisperAvatarAlign;
    $('mg_avatar_border').checked = !!s.look.hideAvatarBorder;
    syncLookState();

    $('mg_enabled').checked = !!s.enabled;
    $('mg_preset_tabs').checked = !!s.presetTabs;
    $('mg_grid_cols').value = String(s.gridCols);

    const styles = allToastStyles();
    $('mg_toast_theme').innerHTML = '<option value="none">None</option>' + Object.keys(styles)
        .map(id => `<option value="${esc(id)}">${esc(styles[id].name)}${BUILTIN_TOASTS[id] ? '' : ' ★'}</option>`)
        .join('');
    $('mg_toast_theme').value = styles[s.toastTheme] ? s.toastTheme : 'none';

    const locked = !s.customToasts[$('mg_toast_theme').value];
    $('mg_toast_edit').classList.toggle('mg-locked', locked);
    $('mg_toast_delete').classList.toggle('mg-locked', locked);
}

jQuery(() => {
    try {
        addSettingsPanel();
        setupPersonaPins();
        setupCustomCssMove();
        watchCustomVars();
        watchThemePicker();
        watchCheckboxLabels();
        watchAvatars();
        watchFormHeight();
        apply();
        setTimeout(applyPresetTabs, 3000);
        // things that may only exist a moment after start-up
        for (const delay of [1000, 4000]) {
            setTimeout(() => {
                const on = !!getSettings().enabled;
                applyBase(on);
                applyWhisper();
                watchAvatars();
                watchFormHeight();
                updateAvatars();
            }, delay);
        }
        setTimeout(warnIfMoonlitActive, 5000);
    } catch (error) {
        console.error("[Asphodel Reverie] failed to start", error);
    }
});

/* ---------- built-in notification style: Basic ---------- */

function BASIC_TOAST_CSS() {
    return `
/* =========================================
   SOLID TOAST NOTIFICATIONS
========================================= */

#toast-container.toast-top-center {
    top: 14px;
}

#toast-container.toast-bottom-center {
    bottom: 14px;
}

/* container */
#toast-container > .toast {
    --toast-accent: #9a9aa5;

    box-sizing: border-box;
    position: relative;

    width: min(420px, calc(100vw - 24px));
    min-height: 62px;
    max-height: min(60vh, 420px);

    margin: 0 auto 10px;
    padding: 15px 18px;

    color: #f4f4f6;

    /* Solid BG */
    background-color: #18181d !important;
    background-image: none !important;

    border: 1px solid #34343c;
    border-left: 4px solid var(--toast-accent);
    border-radius: 12px;

    box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.55),
        0 2px 6px rgba(0, 0, 0, 0.35);

    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;

    opacity: 1 !important;

    font-size: 15px;
    line-height: 1.5;

    /* X Error or Text overflow */
    overflow-x: hidden;
    overflow-y: auto;
    overflow-wrap: anywhere;
    word-break: normal;

    cursor: pointer;

    transition:
        transform 160ms ease,
        background-color 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease;
}

/* Hover */
#toast-container > .toast:hover {
    background-color: #202027 !important;

    transform: translateY(-2px);

    border-top-color: #44444f;
    border-right-color: #44444f;
    border-bottom-color: #44444f;
    border-left-color: var(--toast-accent);

    box-shadow:
        0 12px 30px rgba(0, 0, 0, 0.62),
        0 3px 8px rgba(0, 0, 0, 0.4);

    opacity: 1 !important;
}

/* colour for each type */
#toast-container > .toast-success {
    --toast-accent: #55c985;
}

#toast-container > .toast-info {
    --toast-accent: #5ba7e8;
}

#toast-container > .toast-warning {
    --toast-accent: #e5b94f;
}

#toast-container > .toast-error {
    --toast-accent: #e65f6b;
}

/* Noti: Subject */
#toast-container .toast-title {
    margin: 0 0 5px;

    color: #ffffff;

    font-size: 16px;
    font-weight: 700;
    line-height: 1.4;
    letter-spacing: 0.015em;

    overflow-wrap: anywhere;
}

/* Noti: Content */
#toast-container .toast-message {
    color: #c9c9d0;

    font-size: 15px;
    font-weight: 400;
    line-height: 1.55;

    white-space: normal;
    overflow-wrap: anywhere;
}

/* close button */
#toast-container .toast-close-button {
    position: absolute;
    top: 8px;
    right: 10px;

    margin: 0;
    padding: 2px;

    color: #b8b8c0;
    background: transparent;

    border: 0;

    font-size: 19px;
    line-height: 1;

    text-shadow: none;
    opacity: 1;
}

#toast-container .toast-close-button:hover {
    color: #ffffff;
}

#toast-container > .toast:has(.toast-close-button) {
    padding-right: 42px;
}

/* Progress bar */
#toast-container .toast-progress {
    height: 3px;

    background-color: var(--toast-accent);

    opacity: 1;
}

/* Non intractale Toast */
#toast-container > .toast.toast-non-interactable {
    cursor: default;
}

/* Mobile */
@media screen and (max-width: 600px) {
    #toast-container {
        box-sizing: border-box;

        width: 100%;
        padding-inline: 10px;
    }

    #toast-container > .toast {
        width: 100%;
        min-height: 58px;
        max-height: 55vh;

        margin-bottom: 8px;
        padding: 13px 15px;

        border-radius: 10px;
    }

    #toast-container > .toast:has(.toast-close-button) {
        padding-right: 40px;
    }

    #toast-container .toast-title {
        font-size: 15px;
    }

    #toast-container .toast-message {
        font-size: 14px;
    }

    #toast-container .toast-close-button {
        font-size: 18px;
    }
}
`;
}
