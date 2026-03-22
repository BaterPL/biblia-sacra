/**
 * api.js — Data fetching layer
 *
 * Responsibilities:
 *  - fetchESV(ref, apiKey)     → fetches ESV text from api.esv.org
 *  - fetchPolish(bookIdx, ch)  → fetches BNT text from biblia.info.pl
 *  - parseESVText(raw)         → parses the raw ESV passage string into verse objects
 *
 * Both public functions return:
 *   Promise<Array<{ num: number, text: string }>>
 *
 * Errors are thrown as plain Error objects with user-friendly Polish messages.
 */

'use strict';

/* ── ESV ──────────────────────────────────────────────────── */

/**
 * Fetch one chapter from the ESV API.
 *
 * @param {string} ref     - Passage reference, e.g. "John.3"
 * @param {string} apiKey  - ESV API token (Bearer)
 * @returns {Promise<Array<{num: number, text: string}>>}
 */
async function fetchESV(ref, apiKey) {
    const params = new URLSearchParams({
        q: ref,
        'include-headings': 'false',
        'include-footnotes': 'false',
        'include-verse-numbers': 'true',
        'include-short-copyright': 'false',
        'include-passage-references': 'false',
    });

    const url = `https://api.esv.org/v3/passage/text/?${params}`;

    let response;
    try {
        response = await fetch(url, {
            headers: { Authorization: `Token ${apiKey}` },
        });
    } catch (networkErr) {
        throw new Error(
            'Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.'
        );
    }

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error(
                'Nieprawidłowy klucz API ESV. Sprawdź klucz i zapisz go ponownie.'
            );
        }
        throw new Error(`Błąd serwera ESV (${response.status}). Spróbuj ponownie.`);
    }

    const data = await response.json();
    const raw = (data.passages && data.passages[0]) || '';

    if (!raw.trim()) {
        throw new Error('ESV API nie zwróciło tekstu dla tego fragmentu.');
    }

    return parseESVText(raw);
}

/**
 * Parse a raw ESV passage string into structured verses.
 * The API returns text like:  [1] In the beginning... [2] The earth was...
 *
 * @param {string} raw
 * @returns {Array<{num: number, text: string}>}
 */
function parseESVText(raw) {
    const verses = [];
    // Match [N] followed by text up to the next [N] or end of string
    const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\s*\[\d+\]|$)/g;
    let match;

    while ((match = regex.exec(raw)) !== null) {
        const text = match[2].replace(/\s+/g, ' ').trim();
        if (text) {
            verses.push({ num: parseInt(match[1], 10), text });
        }
    }

    return verses;
}


/* ── Polish BNT ───────────────────────────────────────────── */

/**
 * Fetch one chapter of Biblia Nowego Tysiąclecia from biblia.info.pl.
 * Falls back to a clear error message if the API is unavailable.
 *
 * @param {number} bookIdx  - Index into BOOKS / POLISH_BOOKS arrays
 * @param {number} chapter
 * @returns {Promise<Array<{num: number, text: string}>>}
 */
async function fetchPolish(bookIdx, chapter) {
    const translation = 'bt'; // Biblia Tysiąclecia
    const abbr = POLISH_BOOKS[bookIdx].abbr;
    const apiUrl = `https://biblia.info.pl/api/biblia/${translation}/${encodeURIComponent(abbr)}/${chapter}?escape=true`;

    // Use CORS proxy to bypass CORS restrictions on static sites
    const proxy = 'https://corsproxy.io/?url=';
    const url = proxy + encodeURIComponent(apiUrl);

    try {
        const response = await fetch(url);

        if (response.ok) {
            const data = await response.json();

            // Expected shape: { verses: { verse: string, text: string }[] }
            if (data && Array.isArray(data.verses) && data.verses.length > 0) {
                return data.verses.map((verse) => ({
                    num: parseInt(verse.verse, 10),
                    text: String(verse.text).trim(),
                }));
            }
        }
    } catch (_) {
        // Network error — fall through to fallback below
    }

    // Graceful fallback: show one informational verse
    const polishName = POLISH_BOOKS[bookIdx];
    return [{
        num: 1,
        text: `[Tekst BNT dla ${polishName} ${chapter} jest niedostępny. ` +
            `Upewnij się, że masz połączenie z internetem lub sprawdź biblia.info.pl.]`,
    }];
}
