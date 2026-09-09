# Darcio Founders' Agreement — clause review page

A single-page review tool (shared storage: Convex) for the Darcio Labs Founders' Agreement. Each clause of the
agreement is shown with three decisions: **Include as drafted**, **Needs modification**
(explanation required) and **Cannot be implemented** (explanation required), plus free
comments. Every decision and comment is stamped with the server time and the reviewer's
name, and every signed-in reviewer sees the same shared history.

Either account can also **propose a new clause** (in an existing section or a new one), edit
its text or withdraw it; every version is kept. A guided **tour** starts on each account's
first sign-in and can be replayed from the "Take a tour" button.

## Files

| Path | Purpose |
| --- | --- |
| `public/index.html` | The whole page: sign-in screen, clause text, review controls, activity feed, CSV export |
| `api/login.js` | Checks username/password server-side and issues a signed session token |
| `api/state.js` | Reads and appends review entries (append-only, timestamped) |
| `api/_auth.js` | User table (salted password hashes) and token signing |
| `api/_store.js` | Storage adapter: Convex, Upstash Redis, or none |
| `convex/` | Convex schema and the two internal functions (list, add) |

## Hosting on Vercel

The project deploys straight from this repository with no build step of its own. Shared
storage uses [Convex](https://convex.dev) (free tier, no card needed):

1. Create a Convex project at dashboard.convex.dev. Open its **Settings**: copy the
   **Deployment URL** (`https://….convex.cloud`) and generate a **Production deploy key**.
2. In the Vercel project open **Settings → Environment Variables** and add both:
   `CONVEX_DEPLOY_KEY` = the deploy key. (`CONVEX_URL` is only needed if the deployment URL in `api/_store.js` changes.)
3. Redeploy. The Vercel build runs `npx convex deploy`, which publishes the functions in
   `convex/` to your Convex deployment. The page's status dot turns green ("Live") and the
   yellow "shared storage not connected" banner disappears.

The API talks to Convex with the deploy key as an admin credential, so the functions are
`internal` and cannot be called from a browser. The deploy key is also used to derive the
session-token signing secret when `AUTH_SECRET` is not set.

Alternative store: Upstash Redis from the Vercel Storage tab (`KV_REST_API_URL` and
`KV_REST_API_TOKEN` are picked up automatically).

Optional environment variables:

| Name | Purpose |
| --- | --- |
| `AUTH_SECRET` | Overrides the token signing secret. |
| `CA_PASSWORD_HASH`, `MD_PASSWORD_HASH` | Override a user's password hash without editing code. |
| `REVIEW_KEY` | Redis hash key for the entries (Redis backend only). |

Until a store is connected the API reports `storage: false` and the page saves entries in
the viewer's own browser only, with a warning banner.

## Accounts

Usernames and PBKDF2 password hashes live in `api/_auth.js`. To change a password, generate
a new hash and either paste it into that file or set it as the matching environment variable:

```
node -e "console.log(require('./api/_auth').hashPassword('NewPassword'))"
```
