/**
 * render.js — DOM rendering helpers
 *
 * All functions in this module are pure in the sense that they receive data
 * and return / mutate only the DOM nodes they are responsible for.
 * No app state is read directly — everything is passed as arguments.
 */

'use strict';

/* ── Helpers ──────────────────────────────────────────────── */

/** Safely escape text for use in innerHTML. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Return the Polish verse object for ESV verse number `num`, or a dash. */
function matchPolish(plVerses, num, fallbackIndex) {
  const byNum = plVerses.find(v => v.num === num);
  if (byNum) return byNum;
  return plVerses[fallbackIndex] || { num, text: '—' };
}

/* ── Loading state ────────────────────────────────────────── */

function renderLoading(contentEl) {
  contentEl.innerHTML = `
    <div class="state-box">
      <span class="ornament" aria-hidden="true">✦</span>
      Ładowanie tekstu…
      <div class="loading-dots" aria-hidden="true">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>`;
}

/* ── Error state ──────────────────────────────────────────── */

function renderError(errorEl, message) {
  if (!message) {
    errorEl.innerHTML = '';
    return;
  }
  errorEl.innerHTML = `<div class="error-box">${escapeHtml(message)}</div>`;
}

/* ── Verse rendering ──────────────────────────────────────── */

/**
 * Render verses into `contentEl` according to the current display mode.
 *
 * @param {HTMLElement}                       contentEl
 * @param {Array<{num:number, text:string}>}  esvVerses
 * @param {Array<{num:number, text:string}>}  plVerses
 * @param {'both'|'esv'|'pl'}                 mode
 */
function renderVerses(contentEl, esvVerses, plVerses, mode) {
  if (!esvVerses || esvVerses.length === 0) return;

  const header = '<div class="divider" aria-hidden="true">✦ ✦ ✦</div>';
  let   body   = '';

  if (mode === 'both') {
    body = esvVerses.map((v, i) => {
      const pv = matchPolish(plVerses, v.num, i);
      return `
        <div class="verse-both" role="listitem" onclick="this.classList.toggle('highlighted')" title="Kliknij, aby zaznaczyć">
          <span class="verse-num">${v.num}</span>
          <p class="verse-esv">${escapeHtml(v.text)}</p>
          <p class="verse-pl">${escapeHtml(pv.text)}</p>
        </div>`;
    }).join('');
    contentEl.innerHTML = `${header}<div class="verse-list" role="list">${body}</div>`;

  } else if (mode === 'esv') {
    body = esvVerses.map(v => `
      <div class="verse-item" role="listitem" onclick="this.classList.toggle('highlighted')" title="Kliknij, aby zaznaczyć">
        <span class="verse-num">${v.num}</span>
        <p class="verse-text">${escapeHtml(v.text)}</p>
      </div>`).join('');
    contentEl.innerHTML = `${header}<div class="verse-list" role="list">${body}</div>`;

  } else { /* mode === 'pl' */
    const source = plVerses.length > 0 ? plVerses : esvVerses;
    body = source.map(v => `
      <div class="verse-item" role="listitem" onclick="this.classList.toggle('highlighted')" title="Kliknij, aby zaznaczyć">
        <span class="verse-num">${v.num}</span>
        <p class="verse-text polish">${escapeHtml(v.text)}</p>
      </div>`).join('');
    contentEl.innerHTML = `${header}<div class="verse-list" role="list">${body}</div>`;
  }
}

/* ── Reference bar ────────────────────────────────────────── */

function renderRefBar(refLabelEl, refVersesEl, refBarEl, bookName, chapter, verseCount) {
  refLabelEl.textContent  = `${bookName} ${chapter}`;
  refVersesEl.textContent = `${verseCount} wersetów`;
  refBarEl.hidden = false;
}

/* ── Chapter navigation ───────────────────────────────────── */

function renderChapNav(chapNavEl, chapNavInfoEl, prevBtn, nextBtn, bookName, chapter, maxChapters) {
  chapNavEl.hidden        = false;
  chapNavInfoEl.textContent = `${bookName} ${chapter}`;
  prevBtn.disabled        = chapter <= 1;
  nextBtn.disabled        = chapter >= maxChapters;
}

/* ── Book select ──────────────────────────────────────────── */

function renderBookSelect(selectEl, books, selectedIdx) {
  selectEl.innerHTML = '';
  books.forEach((book, i) => {
    const opt      = document.createElement('option');
    opt.value      = i;
    opt.textContent = book.name;
    if (i === selectedIdx) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

/* ── Chapter select ───────────────────────────────────────── */

function renderChapSelect(selectEl, maxChapters, selectedChapter) {
  selectEl.innerHTML = '';
  for (let c = 1; c <= maxChapters; c++) {
    const opt      = document.createElement('option');
    opt.value      = c;
    opt.textContent = c;
    if (c === selectedChapter) opt.selected = true;
    selectEl.appendChild(opt);
  }
}
