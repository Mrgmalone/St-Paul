# St. Paul Apostolic Church of Jesus Christ — Website (Preview Build)

A five‑page static website: **Home, About Us, Leadership & Ministry, Events, Contact & Prayer.**
It is plain HTML, CSS, and JavaScript, with no build step, so it uploads as‑is to GoDaddy cPanel, Netlify, or Cloudflare Pages.

> **This is a PREVIEW for the church to review.** Anything in `[square brackets]` is a placeholder waiting for real content. Placeholders are softly highlighted on the page so they are easy to spot.

---

## 1. Folder map

```
index.html          Home
about.html          About Us
leadership.html     Leadership & Ministry
events.html         Events (upcoming / month calendar / list)
contact.html        Contact & Prayer (forms, map, water pool)
content/site.json   ← ALL editable text lives here
css/styles.css      Design: colors, fonts, layout
js/site.js          Reads site.json and builds the pages (no need to edit)
api/send.php        Optional form mailer for cPanel hosting
assets/img/         Web-ready images (brand, photos, people, slots)
assets/video/       Place converted hero video here (optional)
assets/photo-manifest.md   What every source photo shows and where it is used
assets-source/      Original files (NOT part of the website; do not upload)
```

---

## 2. How to edit content

**All text is in one file: `content/site.json`.** Open it in any text editor (Notepad, TextEdit, or VS Code), change the words, save, and refresh the browser.

Rules that keep the file working:
- Change only the text **inside the quotes** on the right side of each colon.
- Keep every quote mark `"`, comma `,`, and bracket `{ } [ ]` in place.
- If the page shows "The page content could not be loaded," a comma or quote was probably removed. Paste the file into <https://jsonlint.com> to find the line.

| To change… | Look in `site.json` for… |
|---|---|
| Phone, email, ZIP, office hours | `"church"` |
| Service times (header, footer, home) | `"serviceTimes"` |
| Facebook / YouTube / Instagram links | `"social"`; paste the full URL into `"url"` |
| Home page wording | `"home"` |
| Mission, vision, beliefs, history, timeline | `"about"` |
| Pastor / Overseer names and bios | `"leadership"` › `"pastor"` / `"overseer"` |
| Ministry leaders | `"leadership"` › `"people"` (see below) |
| Events | `"events"` › `"items"` (see below) |
| Contact page wording, Scripture | `"contact"` |
| Form behavior | `"forms"` (see section 6) |

**Adding a ministry leader.** Copy one block in `"people"`, then edit it. `"categories"` decides which card(s) the person appears on. Use one or more of these ids: `ministers`, `deacons`, `deaconesses`, `trustees`, `mothers`, `missionaries`, `ushers`, `music`, `youth`, `christian-education`, `administration`, `dignitaries`.

```json
{
  "name": "Deacon [Full Name]",
  "role": "[Role or title]",
  "categories": ["deacons"],
  "photo": "assets/img/people/firstname-lastname-300.webp"
}
```

**Adding an event.** Copy one block in `"events"` › `"items"`. Dates must be written `YYYY-MM-DD`. Set `"featured": true` on the **one** event to show in the Featured card. The calendar, list, and home‑page cards update automatically. Past events drop off "Upcoming" by themselves.

---

## 3. How to swap or add images

Most image slots look for a **specific file name**. Drop a file with that exact name into the folder, and it replaces the placeholder automatically, with no code change. Each empty slot also shows its expected file path in small type.

| Slot | File to add |
|---|---|
| Pastor portrait | `assets/img/people/kevin-womack.webp` |
| Overseer portrait | `assets/img/people/leela-womack.webp` |
| Incorporation logo (footer) | `assets/img/slots/incorporation-logo.webp` |
| Church exterior (About page hero) | `assets/img/slots/church-exterior.webp` |
| History photos | `assets/img/history/founding-era.webp`, `historical-church.webp`, `community-ministry.webp` |
| Ministry card photos | `assets/img/ministries/<id>.webp` (ids listed in section 2) |
| Page backgrounds | change `"image"` / `"imageSmall"` under each page's `"hero"` in `site.json` |

**Recommended sizes:** portraits 800×1000 (4:5); ministry and history photos 1200×900; hero backgrounds 1920×1080 plus a 960‑wide copy for phones.

**Making WebP files:** use <https://squoosh.app> (free, runs in the browser). Choose **WebP**, quality about 75–80. JPG and PNG also work. If you use one, either name it exactly as the table shows with the different extension *and* update the path in `site.json`, or convert it to `.webp`.

---

## 4. Preview on your computer

Because the pages read `content/site.json`, browsers will not show the content if you simply double‑click `index.html`. Start a tiny local server instead.

**Mac** (Terminal) or **Windows** (Command Prompt / PowerShell, with Python installed):

```
cd path/to/St-Paul
python3 -m http.server 8080
```

Then open <http://localhost:8080> in your browser. On Windows, use `python` if `python3` is not found.

**Alternative:** in VS Code, install the "Live Server" extension, right‑click `index.html`, and choose **Open with Live Server**.

---

## 5. Put the site online

**Upload only the website files.** Do not upload the `assets-source` folder; it holds originals, including private text‑message screenshots.

Files to upload: `index.html, about.html, leadership.html, events.html, contact.html, favicon.png, content/, css/, js/, assets/` (and `api/` only if using the PHP mailer).

### Option A: Netlify Drop (fastest preview link)
1. Make a copy of the project folder **without** `assets-source`.
2. Go to <https://app.netlify.com/drop> and sign in (free).
3. Drag the folder onto the page. In under a minute you receive a link such as `https://something.netlify.app`.
4. Send that link to the church for review.
5. Optional: under **Site configuration › Change site name**, choose a friendlier name.

### Option B: GoDaddy cPanel
1. Log in to GoDaddy › **My Products** › **cPanel Admin** › **File Manager**.
2. Open `public_html` (or a subfolder such as `public_html/preview` to keep it separate from any existing site).
3. Click **Upload** and upload the files and folders listed above, keeping the same folder structure. Tip: zip them first, upload the zip, then right‑click › **Extract**.
4. Visit your domain (or `yourdomain.org/preview`).

### Option C: Cloudflare Pages
**Workers & Pages › Create › Pages › Upload assets**, then drag the same folder.

---

## 6. Forms (prayer request & praise report): setup required before going live

Right now `"forms" › "provider"` is `"none"`. Forms show a success message labeled **"Preview mode… nothing was actually sent."** Choose **one** option before launch:

| Host | Set in `site.json` | One‑time setup |
|---|---|---|
| **Netlify** | `"provider": "netlify"` | Forms are already tagged. After deploying, open **Netlify › Forms**, enable form detection, and redeploy. Add an email notification under **Forms › Settings & usage › Form notifications**. |
| **Any host (Formspree)** | `"provider": "formspree"`, `"endpoint": "https://formspree.io/f/XXXX"` | Create a free form at <https://formspree.io>, then paste its endpoint. Confirm the email Formspree sends you. |
| **GoDaddy cPanel (PHP)** | `"provider": "php"`, `"endpoint": "api/send.php"` | Edit `api/send.php`: set `$TO_EMAIL` (church inbox) and `$FROM_EMAIL` (an address on the website's own domain, created in cPanel › Email Accounts). Upload the `api` folder. |

**Always submit a test prayer request after setup and confirm it arrives (check spam).**

Privacy: the "Keep my request private" box is passed along in the email. The church decides how private requests are handled. Consider stating that policy on the page.

---

## 7. Videos

The two phone videos (`IMG_0816.MOV`, `IMG_4666.MOV`) could not be transferred into this build (Drive connector size limits). The home page is already wired for a muted, looping background video with a still‑image fallback. Visitors who prefer reduced motion always see the still image.

To add one:
1. Convert it (requires free `ffmpeg`, <https://ffmpeg.org>). Run these two commands in the project folder:

```
ffmpeg -i assets-source/IMG_4666.MOV -vf "scale=-2:720,fps=30" -an -c:v libx264 -crf 28 -preset slow -movflags +faststart -t 20 assets/video/home-hero.mp4
```

```
ffmpeg -i assets-source/IMG_4666.MOV -vf "scale=-2:720,fps=30" -an -c:v libvpx-vp9 -crf 38 -b:v 0 -t 20 assets/video/home-hero.webm
```

   (`-an` removes sound; `-t 20` keeps the first 20 seconds. Aim for under 4 MB.)
2. In `site.json` › `"video"` › `"home"`, change `"enabled": false` to `"enabled": true`.

A vertical phone video will be center‑cropped to fill the wide hero, so horizontal footage works best.

---

## 8. Design notes

- **Colors** (top of `css/styles.css`): navy `#0a1a48`, royal `#2849b8`, gold `#c9a24b`, ivory `#fbfaf6`, mist `#f1f5fc`.
- **Fonts:** Cormorant Garamond (headings) and Inter (body), loaded from Google Fonts.
- **Accessibility:** 18px base text, strong contrast (WCAG AA checked on key pairs), visible gold keyboard focus rings, skip link, labeled forms, keyboard‑operable tabs, menu, calendar, and dialog. All animation stops for visitors who set "reduce motion."
- **Performance:** WebP images in two sizes, lazy loading below the fold, no frameworks. Measured page weight (site files, fully scrolled, desktop): Contact 138 KB, Events 191 KB, Home 216 KB, About 299 KB, Leadership 534 KB, plus Google Fonts.

---

## 9. Questions to confirm before launch

1. **Overseer's first name:** the brief says **"Leela"**. The poster visible in photo `IMG_2008` reads **"Pastor Lelia M. W…"**. Which is correct?
2. **Titles:** the brief uses *Pastor* Kevin Brevard Womack and *Overseer* Leela Womack. The church's own graphics say **"Bishop Kevin Brevard Womack"** (crest) and **"Bishop Kevin B. Womack" / "Pastor Lelia M. W…"** (poster). Which titles should the website use?
3. **"Brevard":** the spelling appears on the church's crest graphic. Please confirm.
4. **Church name on the seals:**
   - The approved seal reads **"St. Paul Apostolic Churches of Jesus Christ Inc."** (plural "Churches").
   - A second seal (`04D3C5E4…PNG`) reads **"St. Paul Apostle Church of Jesus Christ, Inc." / "EST 1969"**.
   - The website uses **"St. Paul Apostolic Church of Jesus Christ."**
   - Is the second seal the incorporation logo intended for the footer slot?
5. **ZIP code** for 4800 Holt Rd, Greensboro.
6. **Psalm 118:1:** the KJV reads *"O give thanks unto the LORD; for he is good: because his mercy endureth for ever."* The site uses that exact KJV wording. The wording in the original brief (*"…for his mercy endureth for ever"*) matches Psalm 107:1 and 136:1.
7. **Deaconess Pam:** last name needed. Not assumed to be Min. Pamela Doggett.
