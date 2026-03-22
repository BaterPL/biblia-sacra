# Biblia Sacra

Personal Bible study web app — **ESV** (English Standard Version) alongside
**Biblia Nowego Tysiąclecia** (BNT), optimised for iPhone 17 and modern mobile browsers.

---

## Features

- Side-by-side ESV + Polish (BNT) reading
- Three modes: bilingual, ESV only, Polish only
- Tap any verse to highlight it
- Previous / Next chapter navigation
- Remembers your last position across sessions (book, chapter, mode)
- Works as a home-screen PWA on iPhone — no App Store needed
- Dark mode automatic (follows system preference)
- Accessible: ARIA roles, keyboard navigation

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|-----------------|-------|
| Any static web server | — | See hosting options below |
| ESV API key | — | Free at [api.esv.org](https://api.esv.org) |

No build step, no npm, no bundler required — pure HTML/CSS/JS.

---

## Project Structure

```
biblia-sacra/
├── index.html          # App shell & markup
├── manifest.json       # PWA manifest (home screen icon, splash)
├── icons/              # App icons — add your own PNGs here
│   ├── icon-192.png    # 192×192 px
│   └── icon-512.png    # 512×512 px
└── src/
    ├── styles.css      # All styles (light + dark mode)
    ├── books.js        # Bible book metadata (names, abbreviations, chapter counts)
    ├── api.js          # Data fetching: ESV API + Polish biblia.info.pl
    ├── render.js       # DOM rendering helpers (pure functions)
    └── app.js          # Application controller (state + wiring)
```

---

## Getting a free ESV API key

1. Go to [api.esv.org](https://api.esv.org)
2. Create a free account
3. Create an application — select "Personal use"
4. Copy the API token shown in your dashboard
5. Paste it into the app on first launch and tap **Zapisz**

Your key is stored in `localStorage` only (conscious security trade off — not stored in sessionStorage so it survives tab and browser restarts).
It is **never** sent anywhere except Crossway's own `api.esv.org` servers.

---

## Hosting options

### Option A — Vercel (recommended, free)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. No build configuration needed — Vercel serves static files automatically
4. Your app will be live at `https://your-project.vercel.app`

### Option B — Netlify (free)

1. Drag-and-drop the `biblia-sacra/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop)
2. Done — you get a live URL instantly

### Option C — GitHub Pages (free)

1. Push to a GitHub repo
2. Go to repo **Settings → Pages → Source: main branch / root**
3. Your app will be at `https://yourusername.github.io/biblia-sacra/`

### Option D — Self-hosted VPS / NAS

Any web server works. Example with `nginx`:

```nginx
server {
    listen 443 ssl;
    server_name bible.yourdomain.com;

    root /var/www/biblia-sacra;
    index index.html;

    # Security headers
    add_header X-Frame-Options           "SAMEORIGIN";
    add_header X-Content-Type-Options    "nosniff";
    add_header Referrer-Policy           "strict-origin-when-cross-origin";
    add_header Content-Security-Policy   "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src https://api.esv.org https://biblia.info.pl; img-src 'self' data:;";

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> **HTTPS is required** for PWA home-screen installation on iPhone.
> Use [Let's Encrypt](https://letsencrypt.org) for a free TLS certificate.

---

## Adding to iPhone home screen

1. Open your hosted URL in **Safari** on iPhone
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add** — the app icon will appear on your home screen
5. Launch it from there — it opens full-screen, without Safari's address bar

---

## App icons

The `icons/` directory expects two PNG files:

| File | Size | Used for |
|------|------|----------|
| `icon-192.png` | 192×192 px | Android / PWA standard |
| `icon-512.png` | 512×512 px | High-resolution displays |

You can generate both sizes from any image using:
- [realfavicongenerator.net](https://realfavicongenerator.net)
- [pwabuilder.com](https://pwabuilder.com)
- macOS Preview or any image editor

A simple gold cross or open book on a parchment background works well.

---

## Security notes

| Concern | How it is handled |
|---------|------------------|
| ESV API key storage | `localStorage` - convenience over security trade off |
| ESV API key transmission | Sent only to `api.esv.org` over HTTPS |
| No backend / no database | All state is client-side — no server sees your reading habits |
| No analytics | Zero tracking scripts |
| Content Security Policy | Nginx example above restricts all external connections to known origins |
| Input sanitisation | All verse text is HTML-escaped before insertion into the DOM |

---

## Polish Bible (BNT) data

Polish verses are fetched live from **[biblia.info.pl](https://biblia.info.pl)** — a free,
publicly accessible Polish Bible API. If the service is unavailable (no internet, server down),
the app shows a clear message in place of the Polish text and the ESV text still loads normally.

If you want fully offline Polish text, download the BNT XML from an open-source Bible repository
(e.g. [github.com/thiagobodruk/bible](https://github.com/thiagobodruk/bible)) and convert it to
a `bnt.json` file served locally. You would then update `fetchPolish()` in `src/api.js` to read
from that file instead.

---

## Customisation

| What | Where |
|------|-------|
| Default book & chapter on first launch | `state.bookIdx` and `state.chapter` at top of `src/app.js` |
| Colours, fonts, spacing | CSS variables in `:root` block in `src/styles.css` |
| Add bookmarks / notes | Extend `src/app.js` — store in `localStorage` keyed by `bookIdx:chapter:verseNum` |
| Add a search bar | Add an `<input>` to `index.html` and filter `BOOKS` + call the ESV search endpoint |

---

## Licence

Personal use. ESV text © Crossway — subject to their
[API terms of service](https://api.esv.org/docs/terms-of-service/).
Polish BNT text © Pallottinum — used via biblia.info.pl API.
