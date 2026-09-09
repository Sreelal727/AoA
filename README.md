# Darcio Founders' Agreement — clause review page

A single-page review tool for the Darcio Labs Founders' Agreement. Each clause of the
agreement is shown with three decisions: **Include as drafted**, **Needs modification**
(explanation required) and **Cannot be implemented** (explanation required), plus free
comments. Every decision and comment is stamped with the server time and the reviewer's
name, and every signed-in reviewer sees the same shared history.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The whole page: sign-in screen, clause text, review controls, activity feed, CSV export |
| `api/login.js` | Checks username/password server-side and issues a signed session token |
| `api/state.js` | Reads and appends review entries (append-only, timestamped) |
| `api/_auth.js` | User table (salted password hashes) and token signing |
| `api/_store.js` | Storage adapter: Upstash Redis via the Vercel Storage tab, or none |

## Hosting on Vercel

1. Deploy this repository to Vercel (no build step, no dependencies).
2. In the Vercel project open **Storage → Create Database → Redis (Upstash)** and connect
   it to the project. Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Redeploy once. The page's status dot turns green ("Live") and the yellow
   "shared storage not connected" banner disappears.

Optional environment variables:

| Name | Purpose |
| --- | --- |
| `AUTH_SECRET` | Secret used to sign session tokens. Set your own random string in production. |
| `REVIEW_KEY` | Redis hash key for the entries (default `darcio:founders-agreement:entries`). |

Until the Redis store is connected the API reports `storage: false` and the page saves
entries in the viewer's own browser only, with a warning banner.

## Accounts

Usernames and salted password hashes live in `api/_auth.js`. Change a password by updating
the hash there (see the `sha256` helper) and redeploying.
