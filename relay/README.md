# Itqan push relay (ADR-037)

A tiny Cloudflare Worker that lets the **hosted** Itqan (GitHub Pages, opened in any browser, e.g.
Edge on Windows) send the end of a focus session or break to your other devices, such as an iPhone.

A web page cannot send a push to Apple or Google itself: their push services refuse requests from
web pages (no CORS). The Linux laptop app has the desktop helper for this; a browser install has
nothing, until this relay exists.

**What it sees:** the phone's push address and a message that is already encrypted for that
phone. It can't read the message. It stores nothing.

**What it allows:** requests only from the app's own address (`ALLOWED_ORIGINS`), and only to
Apple's, Google's, Mozilla's and Microsoft's push services, with the same checks as the desktop
helper (`guard.ts`, tested in `src/lib/__tests__/relay.test.ts`).

**Cost:** Cloudflare's free plan (100,000 requests a day, no card needed).

## Deploy (once)

1. Create a free Cloudflare account at https://dash.cloudflare.com/sign-up (skip adding a domain).
2. From the repository:
   ```bash
   relay/deploy.sh
   ```
   The first run opens a browser to sign in to Cloudflare and asks you to pick a `workers.dev`
   subdomain. It then prints the relay's address: `https://itqan-push-relay.<subdomain>.workers.dev`.
3. Give the hosted app that address, as a repository variable:
   ```bash
   gh variable set PUSH_RELAY_URL --body "https://itqan-push-relay.<subdomain>.workers.dev"
   ```
4. Re-run the deploy workflow (or push anything). The published app then sends through the relay.

Re-running `relay/deploy.sh` updates the Worker in place. To test it from `npm run dev`, deploy
with `ITQAN_RELAY_EXTRA_ORIGINS=http://localhost:5181 relay/deploy.sh` and start the dev server
with `VITE_PUSH_RELAY=<address>`.
