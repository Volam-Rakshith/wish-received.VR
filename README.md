# Wish_Received.VR

A premium, personalised, cinematic **birthday thank-you experience**.
Send one link to each family member after they wish you — the site detects
*who they are* and plays a journey made just for them.

> Crafted by **Volam Rakshith · VR Developments** · Birthday Protocol `30.09`

---

## ✨ What it does

1. **Cinematic boot** — `Wish_Received.VR` flickers to life with an RGB-split chromatic glitch, like a VR system starting up.
2. **Personal greeting** — *"Hey, [NAME] 👋 — I've got something for you."* Letters cascade in one-by-one (the name glows cyan), inside a **holographic ring** that spins around the **TAP TO OPEN** button.
3. **Warp transition** — every scene change blasts the starfield into warp streaks and crossfades the ambient colour wash (cyan → violet → rose).
4. **Access terminal** — a screen **flash + micro-shake** as `ACCESS GRANTED` decodes matrix-style, a live **percentage counter** ticks while the wish signature verifies, then **RELATIONSHIP DETECTED: [RELATION]** decodes letter-by-letter, ending with *"This isn't a normal birthday message. 👀"* (tap anywhere to fast-forward).
5. **Main message** — *"[NAME], you're officially part of my birthday. 🎂"* — every letter flips in with blur, soft energy rings bloom behind the title.
6. **Branded finale** — triple confetti cannons + **fireworks** (rockets that burst into twinkling gold sparks), an animated VR wax-seal, the thank-you title in a letter cascade, a gradient flourish that draws itself under the signature, and the **VR DEVELOPMENTS** mark.

**Extras:** letter-by-letter text reveals, RGB-split glitch decodes, warp-speed star streaks, scene-tinted ambience, impact flash + micro shake, cursor sparkle trail (desktop), button ripples + sheen sweeps + holographic ring, a **tap-to-make-a-wish candle cake**, an optional **ambient music bed + synth chimes** (**OFF by default**), progress dots (tap to revisit scenes), pointer parallax, full `prefers-reduced-motion` support, and a built-in **Link Builder**.

---

## 📁 Project structure

```
wish-received-vr/
├── index.html            ← the experience (4 scenes)
├── link-builder.html     ← sender tool: generate personal links
├── css/
│   ├── style.css         ← full design system + v2 effects layers
│   └── builder.css       ← link-builder-only styles
└── js/
    ├── personalize.js    ← URLSearchParams → fills every [data-slot]
    ├── audio.js          ← tiny WebAudio synth (sound OFF by default)
    ├── effects.js        ← canvas: dust, warp streaks, confetti, fireworks,
    │                        spark trails, rings, parallax
    ├── textfx.js         ← emoji-safe letter splitting + matrix decodes
    ├── scenes.js         ← scene manager, ACCESS GRANTED sequence, event bus
    ├── main.js           ← wiring, keyboard support, boot gate
    ├── enhance.js        ← big-moment choreography (flash, shake, ripples…)
    └── link-builder.js   ← link generation + copy to clipboard
```

No backend · no database · no login · no paid APIs · **zero dependencies**
(only optional Google Fonts, with graceful system-font fallback).

---

## 🔗 URL personalisation

```
.../index.html?name=NAME&relation=RELATION
```

| Link | Result |
|---|---|
| `?name=Vijay&relation=Uncle` | Hey, **Vijay** 👋 · RELATIONSHIP DETECTED: **Uncle** |
| `?name=Amma&relation=Mother` | Hey, **Amma** 👋 · RELATIONSHIP DETECTED: **Mother** |
| `?name=Nanna&relation=Father` | Hey, **Nanna** 👋 · RELATIONSHIP DETECTED: **Father** |
| *(no parameters)* | Graceful fallback: "Hey there" · "Family" — nothing breaks |

Notes
- Values are URL-decoded automatically and sanitised (length-capped, XSS-safe).
- Spaces can be sent as `%20` or `+`: `?name=Chitti%20Thatha&relation=Grandfather`.
- The **same deployment serves unlimited people** — just change the parameters.

### Link Builder (recommended)

Open `link-builder.html` on your deployed site. Type a name + relation (or tap a
preset like *Amma · Mother*), hit **COPY LINK**, and paste it into WhatsApp.
It auto-URL-encodes everything and derives the deployed base URL by itself —
no repository name or username is ever hardcoded.

---

## 🚀 Run locally

Any static server works:

```bash
cd wish-received-vr
python3 -m http.server 8080
# → http://localhost:8080/?name=Amma&relation=Mother
```

(Or VS Code → *Live Server*, or `npx serve`.) Double-clicking `index.html`
also works — all scripts are plain, deferred, non-module files.

## 🌍 Deploy to GitHub Pages (free)

1. Create a new repository on GitHub (any name you like).
2. Upload the **contents** of this folder (`index.html` must sit at the repo root).
3. Repository **Settings → Pages** → Source: *Deploy from a branch* →
   Branch: `main` / Folder: `/ (root)` → **Save**.
4. Your site goes live at `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`.
5. Share links like
   `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/?name=Amma&relation=Mother`
   (generate them easily with `link-builder.html`).

---

## 🎨 Customisation cheat-sheet

| What | Where |
|---|---|
| Colours / palette | `:root` variables at the top of `css/style.css` |
| All copy & wording | `index.html` (each scene is a labelled `<section>`) |
| Particle density | `buildDust()` in `js/effects.js` (`/24000`, caps `24–80`) |
| Confetti amount | `celebrate()` in `js/effects.js` |
| Sounds & volume | `js/audio.js` (master gain `0.32`; remove `sound-btn` in `index.html` to drop sound entirely) |
| Sequence timings | `runAccess()` in `js/scenes.js` |

## ♿ Accessibility & performance

- `prefers-reduced-motion`: particles freeze to a calm static frame, confetti,
  typewriter, rings and parallax are disabled, transitions become instant.
- Sound is **opt-in** (WebAudio, synthesised — no audio files) and stays off
  until the visitor enables it.
- Real `<button>` elements, visible focus rings, keyboard shortcuts
  (`Enter` / `Space` / `→` advance, any key skips the terminal sequence).
- Text scales fluidly via `clamp()`, safe-area insets for notched phones,
  no horizontal overflow, layout-space reserved during sequences (no jumping).
- Canvas is DPR-capped at 2, particle count scales with screen area and is
  hard-capped; the loop pauses when the tab is hidden. No `shadowBlur` —
  pre-rendered glow sprites only.

## 📄 License

Free to host, use and modify for personal use. Made with ❤️ by VR Developments.
