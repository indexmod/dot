const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function parseCoordinates(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (url.pathname !== "/api/coordinates") {
      return json({ ok: false, error: "Not found" }, 404);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (!["GET", "POST"].includes(request.method)) {
      const response = json({ ok: false, error: "Method not allowed" }, 405);
      response.headers.set("Allow", "GET, POST, OPTIONS");
      return response;
    }
    if (!env.DOT_DB) return json({ ok: false, error: "DOT_DB NOT BOUND" }, 500);
    try {
      if (request.method === "GET") {
        const page = await env.DOT_DB.list({
          prefix: "coordinate:",
          limit: 100,
          cursor: url.searchParams.get("cursor") || undefined
        });
        return json({
          ok: true,
          data: page.keys.map(key => key.metadata),
          cursor: page.list_complete ? null : page.cursor
        });
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
      }
      const point = parseCoordinates(body?.coordinates);
      if (!point) {
        return json({ ok: false, error: "Use latitude, longitude (for example: 55.7558, 37.6176)" }, 400);
      }
      // Separate keys prevent concurrent additions from overwriting the list.
      await env.DOT_DB.put(`coordinate:${point.lat},${point.lng}`, JSON.stringify(point), {
        metadata: point
      });
      return json({ ok: true, data: point }, 201);
    } catch (error) {
      console.error("Coordinates request failed:", error);
      return json({ ok: false, error: "Storage request failed" }, 500);
    }
  }
};
