# Putting Sinker on the App Store / Google Play, later

Not needed yet — this is just the checklist for whenever you're ready
(you'll need to be 18, or have a parent/guardian set up the developer
account, since both Apple and Google require the account holder to be a
legal adult).

## Why this will be easy, not a rewrite

Sinker is already installable as a web app (see the PWA setup added
alongside this file). The standard way to turn an existing web app into a
real App Store / Play Store listing is **Capacitor** — it wraps your
*already-live* website in a thin native shell. You keep 100% of your
existing code; the native app just opens your real site
(`sinker-one.vercel.app`) inside a native window instead of a browser tab.
This matters for Sinker specifically because your login, funds, and
notifications all depend on your Next.js server (Supabase auth, API
routes) — a "static export" approach wouldn't work here, but pointing
Capacitor at your live URL sidesteps that entirely.

## The steps, when you're ready

1. **Developer accounts** (both require being a legal adult, or a
   parent/guardian enrolling): Apple Developer Program is $99/year,
   Google Play Console is a $25 one-time fee.
2. **Install Capacitor** in the project:
   ```
   npm install @capacitor/core @capacitor/cli
   npx cap init Sinker com.yourname.sinker
   npx cap add ios
   npx cap add android
   ```
3. **Point it at your live site** instead of bundling a static copy — in
   the generated `capacitor.config.json`, set:
   ```json
   { "server": { "url": "https://sinker-one.vercel.app", "cleartext": false } }
   ```
4. **Native icons/splash screens**: reuse the same coral "S" mark already
   in `public/icons/` at higher resolution via `@capacitor/assets`.
5. **Build and submit**: `npx cap open ios` (needs a Mac with Xcode) /
   `npx cap open android` (needs Android Studio) — then submit through App
   Store Connect / Google Play Console like any other app.

## One thing worth deciding ahead of time: payments

If you ever charge for Sinker (the $5–10/month idea from earlier), Apple
and Google both **require using their own in-app purchase system** for
anything unlocked inside the native app — they take a 15–30% cut, and you
can't just use Stripe inside the app binary. A common workaround indie
apps use: keep the *website/installed-PWA version* on Stripe (no cut,
full control), and either keep the native app free, or set it up with
their in-app purchase system separately if you want it there too. Nothing
to build now — just worth knowing before you commit to a plan later.
