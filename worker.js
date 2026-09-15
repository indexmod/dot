const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

function slugify(value) {
  return String(value || "").trim().toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
function parseCoordinates(value) {
  const m = String(value || "").trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
const topicKey = slug => `topic:${slug}`;
async function getTopic(env, slug) {
  const raw = await env.DOT_DB.get(topicKey(slug));
  return raw ? JSON.parse(raw) : null;
}
async function saveTopic(env, topic) {
  await env.DOT_DB.put(topicKey(topic.slug), JSON.stringify(topic), {
    metadata: { slug: topic.slug, title: topic.title, lat: topic.lat, lng: topic.lng, createdAt: topic.createdAt }
  });
}
async function bodyOf(request) {
  try { return await request.json(); } catch { return null; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    if (!url.pathname.startsWith("/api/")) {
      if (url.pathname === "/" || /\.[a-z0-9]+$/i.test(url.pathname)) return env.ASSETS.fetch(request);
      const asset = new URL("/topic.html", url);
      return env.ASSETS.fetch(new Request(asset, request));
    }
    if (!env.DOT_DB) return json({ ok: false, error: "DOT_DB NOT BOUND" }, 500);

    try {
      if (url.pathname === "/api/topics" && request.method === "GET") {
        const page = await env.DOT_DB.list({ prefix: "topic:", limit: 1000 });
        const data = page.keys.map(k => k.metadata).filter(Boolean)
          .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        return json({ ok: true, data });
      }

      if (url.pathname === "/api/topic" && request.method === "POST") {
        const body = await bodyOf(request);
        if (!body) return json({ ok: false, error: "Invalid JSON" }, 400);
        const title = String(body.title || "").trim();
        const point = parseCoordinates(body.coordinates);
        const slug = slugify(title);
        if (!title) return json({ ok: false, error: "Topic name required" }, 400);
        if (!point) return json({ ok: false, error: "Use latitude, longitude (for example: 55.7558, 37.6176)" }, 400);
        if (!slug) return json({ ok: false, error: "Invalid topic name" }, 400);
        if (await getTopic(env, slug)) return json({ ok: false, error: "This slug already exists" }, 409);
        const topic = { slug, title, ...point, createdAt: new Date().toISOString(), posts: [] };
        await saveTopic(env, topic);
        return json({ ok: true, topic }, 201);
      }

      if (url.pathname === "/api/topic" && request.method === "GET") {
        const slug = String(url.searchParams.get("slug") || "").trim();
        const topic = slug && await getTopic(env, slug);
        return topic ? json({ ok: true, topic }) : json({ ok: false, error: "Topic not found" }, 404);
      }

      if (url.pathname === "/api/topic" && request.method === "PUT") {
        const body = await bodyOf(request);
        const slug = String(body?.slug || "").trim();
        const title = String(body?.title || "").trim();
        if (!slug || !title) return json({ ok: false, error: "Slug and title required" }, 400);
        const topic = await getTopic(env, slug);
        if (!topic) return json({ ok: false, error: "Topic not found" }, 404);
        topic.title = title;
        await saveTopic(env, topic);
        return json({ ok: true, topic });
      }

      if (url.pathname === "/api/topic" && request.method === "DELETE") {
        const body = await bodyOf(request);
        const slug = String(body?.slug || "").trim();
        if (!slug) return json({ ok: false, error: "Slug required" }, 400);
        if (!await getTopic(env, slug)) return json({ ok: false, error: "Topic not found" }, 404);
        await env.DOT_DB.delete(topicKey(slug));
        return json({ ok: true });
      }

      if (url.pathname === "/api/topic/post" && request.method === "POST") {
        const body = await bodyOf(request);
        const slug = String(body?.slug || "").trim(), text = String(body?.text || "").trim();
        if (!slug || !text) return json({ ok: false, error: "Slug and text required" }, 400);
        const topic = await getTopic(env, slug);
        if (!topic) return json({ ok: false, error: "Topic not found" }, 404);
        const post = { id: crypto.randomUUID(), text };
        topic.posts = Array.isArray(topic.posts) ? topic.posts : [];
        topic.posts.push(post);
        await saveTopic(env, topic);
        return json({ ok: true, post }, 201);
      }

      if (url.pathname === "/api/topic/post" && request.method === "PUT") {
        const body = await bodyOf(request);
        const slug = String(body?.slug || "").trim(), id = String(body?.id || "").trim(), text = String(body?.text || "").trim();
        if (!slug || !id || !text) return json({ ok: false, error: "Slug, id and text required" }, 400);
        const topic = await getTopic(env, slug);
        if (!topic) return json({ ok: false, error: "Topic not found" }, 404);
        const post = (topic.posts || []).find(item => item.id === id);
        if (!post) return json({ ok: false, error: "Line not found" }, 404);
        post.text = text;
        await saveTopic(env, topic);
        return json({ ok: true, post });
      }

      return json({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      console.error(error);
      return json({ ok: false, error: "Storage request failed" }, 500);
    }
  }
};
