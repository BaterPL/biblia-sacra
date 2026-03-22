/**
 * app.js — Application controller
 *
 * Manages application state and wires together the data (api.js)
 * and view (render.js) layers.
 *
 * Exposed as a single global `App` object — all onclick handlers in
 * index.html call methods on this object.
 */

'use strict';

const App = (() => {

  /* ── State ──────────────────────────────────────────────── */

  const state = {
    bookIdx:  42,       // Default: John (index 42)
    chapter:  3,        // Default: John 3
    mode:     'both',   // 'both' | 'esv' | 'pl'
    apiKey:   '',
    esvData:  null,     // Array<{num, text}>
    plData:   null,     // Array<{num, text}>
    loading:  false,
  };

  /* ── DOM references ─────────────────────────────────────── */

  const el = {
    bookSel:     () => document.getElementById('book-sel'),
    chapSel:     () => document.getElementById('chap-sel'),
    apiPanel:    () => document.getElementById('api-panel'),
    apiKeyInput: () => document.getElementById('api-key-input'),
    errorArea:   () => document.getElementById('error-area'),
    refBar:      () => document.getElementById('ref-bar'),
    refLabel:    () => document.getElementById('ref-label'),
    refVerses:   () => document.getElementById('ref-verses'),
    content:     () => document.getElementById('content'),
    chapNav:     () => document.getElementById('chap-nav'),
    chapNavInfo: () => document.getElementById('chap-nav-info'),
    prevBtn:     () => document.getElementById('prev-btn'),
    nextBtn:     () => document.getElementById('next-btn'),
    langTabs:    () => document.querySelectorAll('.lang-tab'),
  };

  /* ── Initialisation ─────────────────────────────────────── */

  function init() {
    // Restore persisted API key (session-only via sessionStorage — never persisted to disk)
    const savedKey = sessionStorage.getItem('esv_api_key');
    if (savedKey) {
      state.apiKey = savedKey;
      el.apiPanel().hidden = true;
    }

    // Restore last position (localStorage — survives app restarts, key-free)
    const savedPos = _loadPosition();
    if (savedPos) {
      state.bookIdx = savedPos.bookIdx;
      state.chapter = savedPos.chapter;
      state.mode    = savedPos.mode || 'both';
    }

    // Build selects
    renderBookSelect(el.bookSel(), BOOKS, state.bookIdx);
    _buildChapSelect();

    // Activate correct mode tab
    _updateTabs();

    // Wire up book change → rebuild chapter select
    el.bookSel().addEventListener('change', () => {
      state.bookIdx = Number(el.bookSel().value);
      state.chapter = 1;
      _buildChapSelect();
    });

    // Wire up chapter change
    el.chapSel().addEventListener('change', () => {
      state.chapter = Number(el.chapSel().value);
    });

    // Auto-load if we have a key and a saved position
    if (state.apiKey && savedPos) {
      loadChapter();
    }
  }

  /* ── Public API ─────────────────────────────────────────── */

  /**
   * Save the ESV API key.
   * The key is held in sessionStorage (cleared when tab closes) —
   * it is never written to localStorage or sent anywhere except api.esv.org.
   */
  function saveKey() {
    const raw = el.apiKeyInput().value.trim();
    if (!raw) return;

    state.apiKey = raw;
    sessionStorage.setItem('esv_api_key', raw);

    // Mask the input visually
    el.apiKeyInput().value = '•'.repeat(Math.min(raw.length, 24));
    el.apiPanel().hidden   = true;

    renderError(el.errorArea(), '');
  }

  /** Load ESV + Polish for the currently selected book and chapter. */
  async function loadChapter() {
    // Read current selector values
    state.bookIdx = Number(el.bookSel().value);
    state.chapter = Number(el.chapSel().value);

    if (!state.apiKey) {
      el.apiPanel().hidden = false;
      renderError(el.errorArea(), 'Wprowadź klucz API ESV, aby załadować tekst angielski.');
      return;
    }

    if (state.loading) return;
    state.loading = true;

    renderError(el.errorArea(), '');
    renderLoading(el.content());

    const book = BOOKS[state.bookIdx];
    const ref  = `${book.abbr}.${state.chapter}`;

    try {
      const [esv, pl] = await Promise.all([
        fetchESV(ref, state.apiKey),
        fetchPolish(state.bookIdx, state.chapter),
      ]);

      state.esvData = esv;
      state.plData  = pl;

      _render();
      _savePosition();

    } catch (err) {
      renderError(el.errorArea(), err.message || 'Nieznany błąd. Spróbuj ponownie.');
      el.content().innerHTML = `
        <div class="state-box">
          <span class="ornament" aria-hidden="true">✦</span>
          Nie udało się załadować tekstu.
        </div>`;
    }

    state.loading = false;
  }

  /** Switch display mode between 'both', 'esv', 'pl'. */
  function setMode(mode) {
    state.mode = mode;
    _updateTabs();
    if (state.esvData) {
      _render();
      _savePosition();
    }
  }

  /** Navigate to the previous or next chapter (delta = -1 or +1). */
  function changeChapter(delta) {
    const maxChapters = BOOKS[state.bookIdx].chapters;
    const next        = state.chapter + delta;
    if (next < 1 || next > maxChapters) return;

    state.chapter = next;

    // Keep chapter select in sync
    el.chapSel().value = next;

    loadChapter();

    // Scroll back to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Private helpers ────────────────────────────────────── */

  function _buildChapSelect() {
    const book = BOOKS[state.bookIdx];
    renderChapSelect(el.chapSel(), book.chapters, state.chapter);
  }

  function _updateTabs() {
    el.langTabs().forEach(tab => {
      const active = tab.dataset.mode === state.mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function _render() {
    const book = BOOKS[state.bookIdx];

    renderVerses(
      el.content(),
      state.esvData,
      state.plData,
      state.mode
    );

    renderRefBar(
      el.refLabel(),
      el.refVerses(),
      el.refBar(),
      book.name,
      state.chapter,
      state.esvData.length
    );

    renderChapNav(
      el.chapNav(),
      el.chapNavInfo(),
      el.prevBtn(),
      el.nextBtn(),
      book.name,
      state.chapter,
      book.chapters
    );
  }

  /** Persist book/chapter/mode to localStorage (no sensitive data). */
  function _savePosition() {
    try {
      localStorage.setItem('biblia_pos', JSON.stringify({
        bookIdx: state.bookIdx,
        chapter: state.chapter,
        mode:    state.mode,
      }));
    } catch (_) { /* localStorage unavailable — silently ignore */ }
  }

  /** Restore book/chapter/mode from localStorage. */
  function _loadPosition() {
    try {
      const raw = localStorage.getItem('biblia_pos');
      if (!raw) return null;
      const pos = JSON.parse(raw);
      // Validate before trusting
      if (
        typeof pos.bookIdx === 'number' && pos.bookIdx >= 0 && pos.bookIdx < BOOKS.length &&
        typeof pos.chapter === 'number' && pos.chapter >= 1 &&
        ['both', 'esv', 'pl'].includes(pos.mode)
      ) {
        return pos;
      }
    } catch (_) { /* malformed JSON — ignore */ }
    return null;
  }

  /* ── Boot ───────────────────────────────────────────────── */

  // Run after all scripts have loaded
  document.addEventListener('DOMContentLoaded', init);

  // Return only the methods that index.html onclick handlers need
  return { saveKey, loadChapter, setMode, changeChapter };

})();
