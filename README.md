# Dot

Enter `latitude, longitude`, press the green dot, then select a saved pair to view its map. Coordinates are shared and persisted in Cloudflare KV. Identical normalized pairs use the same key. KV is eventually consistent; a newly saved pair appears immediately in the submitting browser, but may take time to appear after a refresh or in another location.

## API

- `GET /api/coordinates` returns `{ ok: true, data: [{ lat, lng }], cursor: null }`. Pass a non-null cursor as `?cursor=...` to load the next page.
- `POST /api/coordinates` accepts `{ "coordinates": "55.7558, 37.6176" }` and returns `{ ok: true, data: { lat, lng } }` with status 201.
- `OPTIONS /api/coordinates` supports cross-origin requests from GitHub Pages.

Latitude must be between -90 and 90; longitude between -180 and 180. The separator is a comma. Other API paths return 404; unsupported methods return 405.

## Development and deployment

Use Node.js 22 or newer. Run `npm ci`, `npm test`, `npm run build`, then `npx wrangler dev`. For a deployment check, run `npx wrangler deploy --dry-run` after building.

Every push to `main` runs tests, builds the three public files into `dist`, and deploys Worker `dot` with the existing GitHub secret `CLOUDFLARE_API_TOKEN`. Manual runs are also available. Wrangler is pinned by package-lock.json. The token must permit Workers deployment and KV access for the account containing the configured namespace. GitHub Pages uses `https://dot.wiki-self.workers.dev`; the Worker-hosted page uses the same-origin API.

`DOT_DB` is bound to namespace `dcc82b9ba1ef4f868b7163e079086bc3`. New data uses `coordinate:<lat>,<lng>` keys with coordinate metadata. Legacy records are not deleted or migrated and do not appear in this list. The previous topic and post pages and routes have been removed.
