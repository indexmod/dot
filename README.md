# Dot

Public UI: https://indexmod.github.io/dot/ — Cloudflare Worker https://dot.wiki-self.workers.dev is API only.

## Use

HOME has one input: `Berlin Wall, 52.5163, 13.3777`. Press the green dot to create a topic. Below it are topic title links only.

The title determines the initial slug (`berlin-wall`). `/dot/berlin-wall` shows the map with a green point, editable title, fixed slug and anonymous lines. Title and line edits save when the field loses focus. Enter submits a new line; Shift+Enter inserts a newline. Delete on the topic page removes the entire topic, including its lines.

## GitHub Pages routing

Publish `main` / `(root)` in repository Settings → Pages. No per-topic files or commits are needed. GitHub serves the shared `404.html` for `/dot/<slug>`, retaining the requested address. Its assets use absolute `/dot/` paths, so direct links and reloads work. `404.html` and `topic.html` share the same shell; keep them identical (tests verify this). `.nojekyll` disables Jekyll processing. `dist` is an optional static build of the same public files.

GitHub still returns HTTP 404 for these fallback documents, although the browser renders the topic. This is a GitHub Pages limitation and matters to crawlers. Unknown topics display the API's not-found message with editing disabled.

## JSON / API

Existing `DOT_DB` namespace `dcc82b9ba1ef4f868b7163e079086bc3` is preserved. Each `topic:<slug>` stores `{ slug, title, lat, lng, createdAt, posts: [{ id, text }] }`. Deletion removes that single record and its embedded posts. Legacy coordinate records are left untouched.

- `GET /api/topics`: `{ ok, data }`, all topic metadata, with KV pagination handled internally.
- `POST /api/topic`: `{ title, coordinates: "52.5163, 13.3777" }` → `{ ok, topic }`.
- `GET /api/topic?slug=berlin-wall` → `{ ok, topic }`.
- `PUT /api/topic`: `{ slug, title }`; slug and coordinates stay fixed.
- `DELETE /api/topic`: `{ slug }`.
- `POST /api/topic/post`: `{ slug, text }` → `{ ok, post }`.
- `PUT /api/topic/post`: `{ slug, id, text }` → `{ ok, post }`.

CORS permits the Pages UI. Non-API Worker paths return JSON 404, never HTML. Duplicate slugs return 409. Latitude must be within ±90 and longitude within ±180.

KV remains eventually consistent: changes can take time to appear across locations. Concurrent writes to one topic can overwrite each other because the existing architecture stores the whole topic in one KV value. This implementation preserves that minimal storage model.

## Local checks and publication

Use Node.js 22+ for Wrangler. `npm test` checks Worker CRUD, deletion of lines, validation, CORS and Pages fallback routing. `npm run build` produces static `dist/`. `npm run dev` opens http://127.0.0.1:4173/dot/ and runs the real Worker against isolated in-memory data; restarting clears only this local data. Maps require network access to Leaflet and OpenStreetMap.

For Worker tooling, run `npm ci`; `npx wrangler deploy --dry-run` validates the deployment without publishing. `npm run deploy` publishes the API only. The existing GitHub workflow deploys Worker after a push to main using `CLOUDFLARE_API_TOKEN`. Pages publishes separately from the repository root. Both need the updated files for the final architecture.

Before your manual commit, check create → direct topic URL → reload → title edit (same slug) → add/edit line → Delete → HOME. Nothing is committed or pushed by the local scripts.
