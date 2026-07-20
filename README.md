<div align="center">

<img src="assets/readme/hero.svg" width="100%" alt="Composerdle — a daily classical-composer guessing game, on web and iOS. Six clues, one dead genius, no pressure.">

<br>

**A daily guessing game for people who hear a piece and go "…wait, is that Brahms?"**

[**▶ Play it live**](https://composerdle.andypandy.org) &nbsp;·&nbsp; [**By Facts**](https://composerdle.andypandy.org) &nbsp;·&nbsp; [**By Ear**](https://composerdle.andypandy.org/listen.html) &nbsp;·&nbsp; [**Credits**](https://composerdle.andypandy.org/credits.html)

`59 composers` &nbsp;·&nbsp; `118 works` &nbsp;·&nbsp; `web + native iOS` &nbsp;·&nbsp; `no build step, no database`

</div>

---

Somewhere out there, a violinist screamed *"PRACTICE!"* into a webcam and, somewhere in the comments, an idea was born: what if Wordle, but you had to guess **composers**? That idea belongs to **[TwoSet Violin](https://www.youtube.com/@twosetviolin)**. This is a fan-made love-letter that drags their concept, kicking and powdered-wig askew, onto the web — and now onto your phone.

Composerdle plays two ways, both of them mildly humbling.

## 🎭 By Facts — *the one where trivia betrays you*

A mystery composer cowers behind six fun-fact clues that start cryptic and slowly lose their nerve. Guess early for bragging rights; stall for six and take the walk of shame anyway.

Pick your poison:
- **Easy** — clues your gran would get. *"He wrote the 'Nutcracker.'"*
- **Medium** — you'll need to have been paying attention.
- **Hard** — connoisseur mode. The famous-work giveaways **never** appear, so you're identifying Ravel from the fact that he refused to teach Gershwin. Good luck.

Every round is a fresh random composer with reshuffled clues, so it's gloriously endless.

![By Facts mode — four fun-fact clues about a mystery composer, a guess box, and the leaderboard](docs/screenshots/by-facts.png)

## 🎧 By Ear — *the one where you stare at a redacted score and sweat*

Here's a **real public-domain recording** and the **real engraved score** — except the composer's name has been dramatically inked out like a censored government document. The pages even turn along with the music. Name the composer *and* the piece in six tries; nail the piece and your points **double**.

There are Easy / Medium / Hard tiers, a scored daily puzzle, streaks, a leaderboard for your friends to lord over you, and "challenge a friend" links for petty rivalries. The catalogue keeps growing — **118 works** at last count, from Bach warhorses to Chopin deep cuts, and the game won't hand you the same piece twice.

![By Ear mode — a redacted orchestral score, an audio player, and composer + piece guess fields](docs/screenshots/by-ear.png)

Get it right (or spectacularly wrong) and the curtain falls with the full reveal — who it was, what it was, who played it, and which dusty 19th-century edition the score came from:

![The reveal card — Antonín Dvořák, Slavonic Dance, with performer and score-edition credits](docs/screenshots/reveal.png)

## 📱 Now a native iOS app, too

<img src="ios/Sources/Assets.xcassets/AppIcon.appiconset/icon-1024.png" width="104" align="right" alt="Composerdle iOS app icon">

The whole game is also a **native SwiftUI app** (`ios/`), not a webview in a trench coat. Same daily puzzles, same leaderboard, same redacted scores — talking to the exact same live `/api`, so new music shows up on the phone the moment it ships to the web.

- **iOS 17+**, built with [XcodeGen](https://github.com/yonaskolb/XcodeGen) — one `GameStore` the whole UI binds to.
- The score renders full-width and the recording **auto-plays** the moment a piece loads.
- A native `TabView` picks up the iOS 26 **Liquid Glass** tab bar for free.
- After a guess it goes straight to a centered *correct / not-this-time* verdict, then the reveal.

No App Store listing — it's built and side-loaded from source. Because the game logic lives server-side, the app is a thin, honest client: the answer isn't hiding in the bundle either.

## 🎻 Everything here is legitimately free

Every recording and score is public domain or Creative Commons — plundered lovingly from Wikimedia Commons, Musopen, the Internet Archive, BnF Gallica, and IMSLP. Some of the recordings are *magical*: Rachmaninoff playing his own Prelude in 1919, Gershwin at the piano on the 1924 *Rhapsody in Blue* disc, Holst conducting his own *Jupiter*. Full per-piece attribution lives on the in-game [**Credits**](https://composerdle.andypandy.org/credits.html) page — and every score is cropped so the composer's name never sneaks into view.

## 🔧 How the sausage is made

- **Front end:** plain HTML/CSS/JS. No framework, no build step, no 400 MB of `node_modules` shipped to your browser. Distinctive engraved-concert-programme look (Cormorant Garamond + Spectral, on faux manuscript paper). The iOS client re-creates the same look in SwiftUI.
- **Back end:** Vercel serverless functions in `/api`. The answers, the facts, and the scoring all live server-side — you can dig through the page source all you like; the composer isn't in there.
- **State:** in-progress game state rides in an **HMAC-signed token** rather than a database, which (after a memorable bout with read-after-write staleness) means no race conditions and no way to forge your way onto the leaderboard.
- **Storage:** score pages and audio live on **Cloudflare R2** (zero egress) under opaque ids, so the filenames don't spoil the answer and a `git push` deploy never has to ship the heavy assets. Profiles and the leaderboard sit there too.

```
api/          serverless endpoints + server-only game logic (_game, _pieces, _engine…)
index.html    By Facts          listen.html   By Ear
lb.js         shared client (leaderboard, stats, profile, sound effects)
ios/          native SwiftUI app (XcodeGen project + Sources/)
tools/        asset-localization pipeline  →  render scores, strip audio tags, sync to R2
test.js       logic self-check             →  node test.js
```

The public-domain score images and audio are **not** committed (they're chunky, and they live on R2); `tools/localize-assets.js` regenerates them from their sources and syncs them up.

## 🙇 Credit where it's due
The **idea** is [TwoSet Violin](https://www.youtube.com/@twosetviolin)'s. The bugs are mine.
*Now go practice. 🎻*
