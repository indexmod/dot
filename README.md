# Dot

Dot is a small place on the map for anonymous lines.

- Public site: https://indexmod.github.io/dot/
- API: https://dot.wiki-self.workers.dev
- Share image: `assets/dot-share-banner.png`

The site uses GitHub Pages for the interface and a Cloudflare Worker with the existing `DOT_DB` KV namespace for JSON persistence. The Worker is API-only; it does not serve the public website.

## Features

### Home

Enter a topic name and coordinates in one field, for example:

```text
Berlin Wall, 52.5163, 13.3777
```

Press Enter to create the topic. The title is converted to a slug once (`Berlin Wall` becomes `berlin-wall`). The slug never changes, even when the title is edited later. The home page shows saved topic names with green dots and no delete controls.

### Topic pages

Every topic is available at `/dot/<slug>`, for example `/dot/berlin-wall`.

Each page contains:

- an OpenStreetMap map with a green location marker;
- an editable title and a fixed slug;
- anonymous lines for that topic;
- a random emoji user picture for every new line;
- inline editing for existing lines;
- Enter to submit a line and Shift+Enter for a new line;
- Delete, which removes the complete topic and its lines.

## GitHub Pages routing

No HTML file is created for an individual topic. GitHub Pages serves the shared `404.html` fallback for `/dot/<slug>`, while the browser keeps the requested URL and loads the common topic interface. `404.html` and `topic.html` use the same shell. `.nojekyll` disables Jekyll processing.

GitHub Pages returns an HTTP 404 status for this fallback even though the browser renders the topic. This is a platform limitation. Unknown slugs show a not-found state with editing disabled.

## JSON data and API

Each topic is stored under `topic:<slug>` in `DOT_DB`:

```json
{
  "slug": "berlin-wall",
  "title": "Berlin Wall",
  "lat": 52.5163,
  "lng": 13.3777,
  "createdAt": "2026-09-15T12:00:00.000Z",
  "posts": [
    { "id": "uuid", "text": "An anonymous line", "emoji": "🦊" }
  ]
}
```

Available endpoints:

- `GET /api/topics` — list topic metadata;
- `POST /api/topic` — create `{ "title", "coordinates" }`;
- `GET /api/topic?slug=<slug>` — read one topic;
- `PUT /api/topic` — edit `{ "slug", "title" }` without changing the slug;
- `DELETE /api/topic` — delete `{ "slug" }`;
- `POST /api/topic/post` — add `{ "slug", "text" }`;
- `PUT /api/topic/post` — edit `{ "slug", "id", "text" }`.

The API supports CORS for GitHub Pages. It validates coordinates, rejects duplicate slugs, and returns JSON errors. KV is eventually consistent, so a change can take a short time to appear in another location.

## Social previews

`index.html`, `topic.html`, and `404.html` include Open Graph and Twitter Card metadata. Telegram and Facebook use the shared banner at:

```text
https://indexmod.github.io/dot/assets/dot-share-banner.png
```

The description is: **A point on the map and a little anonymous chat.**

## Local development

Requirements: Node.js 22+.

```bash
npm ci
npm test
npm run build
npm run dev
```

The local site opens at http://127.0.0.1:4173/dot/. Local development uses an isolated in-memory KV store; restarting the server clears local data. Maps require network access to Leaflet and OpenStreetMap.

`npx wrangler deploy --dry-run` validates the Worker without publishing. `npm run deploy` publishes the API. The GitHub Actions workflow deploys the Worker after pushes to `main`; GitHub Pages publishes the repository root separately.
