# PT App — Architecture Roadmap

Decisions and rationale for the personal training app platform.
Last updated: 22 August 2026

---

## Current state

- **Hosting:** GitHub Pages, static site, one repo per person (`Henna-PTapp`, `joonatan-pt-app`)
- **Storage:** browser `localStorage` — data lives on the user's device only
- **Data retrieval:** manual (Copy / Backup & Restore panel)
- **Stack:** React, compiled with esbuild into `bundle.js` + `index.html` + `styles.css` (Tailwind, compiled)

### Known limitations of the current setup

1. Data lives only in one browser on one device. Lost phone or cleared browser data = lost history.
2. No automatic delivery of data — retrieval requires the user to copy/paste or export manually.
3. **iOS storage eviction risk:** Safari can clear PWA storage after periods of inactivity, and quotas
   are tighter than Chrome. A `localStorage`-only app can silently lose someone's training history.
4. Program changes require editing code and redeploying — every person, every time.

---

## Decisions made

### Hosting: GitHub Pages, not Claude-published artifacts

**Why:**
- Claude artifact persistent storage requires a paid plan (Pro/Max/Team/Enterprise) — free tier gets nothing persistent.
- Unpublishing a Claude artifact permanently deletes its storage data, and the same artifact cannot be
  re-published — a real data-loss trap on every code update.
- **Decisive:** Android wrapping (TWA) requires an `assetlinks.json` file at the domain root to prove
  the app/site trust relationship. You can't place files at the root of `claude.ai`. A Claude-published
  artifact therefore *cannot* be wrapped into an Android app — a permanent dead end.

### Web Share API: abandoned

Tried and rejected. `navigator.share()` with files fails with `NotAllowedError` on both Android Chrome
and desktop Chrome. MDN classifies the API as "not Baseline"; file sharing is its least-supported part.
There is a documented bug signature matching this exactly. Not fixable in application code.

---

## The path forward

### Step 1 — Now: Google Apps Script (interim)

**Purpose:** unblock data collection immediately. Deliberate throwaway.

- Submit button POSTs JSON to a Google Apps Script endpoint
- Endpoint appends rows to a Google Sheet you own; optional email alert
- Free, no caps, no third party, no account required from users
- ~20 lines of client code — cheap to discard later

**What it does NOT do:** no login, no cross-device sync, no two-way updates, no native SDK.
It's a mailbox, not a backend. It buys nothing toward the endgame.

### Step 2 — When it's more than one or two people: Supabase

**Free tier (verified July 2026):** 500 MB database, 1 GB file storage, 50,000 monthly active users,
500,000 edge function invocations, 200 concurrent realtime connections, 2 active projects.

**What it unlocks:**

1. **Identity** — each person logs in, sees only their own data. Row Level Security enforces this
   *inside the database*, not in app code.
2. **Two-way sync** — new phone, log in, everything's there. Also fixes the iOS eviction risk above.
3. **Push updates to users** — program stored as data, not code. Edit it, their app reflects it.
   No deploy, no upload, no version drift between people.
4. **Survives the jump to native** — Supabase has SDKs for Swift, Kotlin, Flutter, React Native.
   Apps Script has none. Build on Supabase and a native app talks to the same database on day one.

**Known catch:** free projects pause after 7 days of inactivity (one click to unpause, but users hit a
paused project until you notice). For an app people rely on daily, budget for Pro ($25/mo) eventually.

**Open question to decide before building:** do users log in, or is identity anonymous per-device?
Accounts unlock everything above but add friction (password resets land on you). This shapes the
database schema — decide before, not after.

### Step 3 — Stay PWA on both platforms

As long as manual habit ticking is acceptable, PWA covers it.

**Note:** Play Store presence does *not* require going native. Google Play accepts TWA-wrapped PWAs —
existing site, wrapped, listed. The App Store does not accept this.

### Step 4 — Native only when health-data integration is the actual goal

**The trigger is a feature decision, not a backend one.** Native is required for:

- **Health data** — HealthKit (iOS) / Health Connect (Android): step counts, heart rate, sleep,
  workout detection. Currently users tick "walked 10,000 steps" by hand; native reads it automatically.
  This is the strongest argument for native in a training app.
- **Bluetooth HR straps** — Web Bluetooth is blocked on iOS entirely.
- **Reliable background sync** — iOS has no Background Sync, Periodic Background Sync, or Background Fetch.
- **Notifications** — work on iOS 16.4+ but only for home-screen-installed PWAs. Native uses APNs/FCM.

**When you go, go both platforms via React Native** — the codebase is already React.

---

## Two corrections worth remembering

### Supabase and native are NOT coupled
Switching backends doesn't push you toward native. A PWA talks to Supabase fine. Android PWA is
already near-first-class.

### The "no Mac" constraint is largely outdated
Cloud build services (Expo EAS Build, Codemagic, Bitrise) compile iOS apps on real Macs in data centres.
Upload code from Windows, download a signed IPA. Codemagic and Bitrise have free tiers.

**The one unavoidable cost:** Apple Developer account, $99/year, required for code signing and
distribution regardless of method. (Google Play: ~$25 one-time.)

**Important inversion:** iPhone is where PWA is *weakest*, not strongest — no background sync, no
Bluetooth, no HealthKit, plus storage eviction. Android has nearly none of these problems.
So "native on Android, PWA on iPhone" applies each approach exactly where it's least needed.

---

## Summary sequence

| Step | When | What |
|---|---|---|
| 1 | Now | Apps Script — unblock data collection |
| 2 | More than 1–2 people | Supabase — login, sync, push updates, fixes iOS eviction risk |
| 3 | Ongoing | Stay PWA both platforms; TWA for Play Store if wanted |
| 4 | When health-data integration is the goal | React Native, both platforms |
