const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function validCoordinates(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function parseCoordinates(value) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const patterns = [
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
    /[?&](?:ll|query|q|center)=(-?\d{1,2}(?:\.\d+)?)(?:%2C|,|%20)(-?\d{1,3}(?:\.\d+)?)/i,
    /#map=\d+(?:\.\d+)?\/(-?\d{1,2}(?:\.\d+)?)\/(-?\d{1,3}(?:\.\d+)?)/i,
    /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/
  ];

  let decoded = text;

  try {
    decoded = decodeURIComponent(text);
  } catch {
    // Keep the original text when it contains malformed escape sequences.
  }

  for (const pattern of patterns) {
    const match = decoded.match(pattern);

    if (!match) {
      continue;
    }

    const lat = Number(match[1]);
    const lng = Number(match[2]);

    if (validCoordinates(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function getTopics(env) {
  const raw = await env.DB.get("topics");

  if (!raw) {
    return [];
  }

  try {
    const topics = JSON.parse(raw);
    return Array.isArray(topics) ? topics : [];
  } catch {
    return [];
  }
}

async function saveTopics(env, topics) {
  await env.DB.put("topics", JSON.stringify(topics));
}

async function getTopic(env, slug) {
  const raw = await env.DB.get(`topic:${slug}`);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveTopic(env, topic) {
  await env.DB.put(`topic:${topic.slug}`, JSON.stringify(topic));
}

async function createTopic(request, env) {
  const body = await readBody(request);

  if (!body) {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const title = String(body.title || "").trim().slice(0, 160);
  const map = String(body.map || body.coordinates || "").trim().slice(0, 2048);
  const slug = slugify(String(body.slug || title)).slice(0, 160);

  if (!title) {
    return json({ ok: false, error: "Title required" }, 400);
  }

  if (!map) {
    return json({ ok: false, error: "Map link or coordinates required" }, 400);
  }

  if (!slug) {
    return json({ ok: false, error: "Invalid slug" }, 400);
  }

  if (await getTopic(env, slug)) {
    return json({ ok: false, error: "Topic already exists" }, 409);
  }

  const coordinates = parseCoordinates(map);
  const topic = {
    title,
    map,
    slug,
    lat: coordinates?.lat ?? null,
    lng: coordinates?.lng ?? null,
    posts: []
  };

  await saveTopic(env, topic);

  const topics = await getTopics(env);
  const filtered = topics.filter(item => item?.slug !== slug);
  filtered.unshift({
    title,
    map,
    slug,
    lat: topic.lat,
    lng: topic.lng
  });
  await saveTopics(env, filtered);

  return json({ ok: true, topic }, 201);
}

async function fetchTopic(url, env) {
  const slug = String(url.searchParams.get("slug") || "").trim();

  if (!slug) {
    return json({ ok: false, error: "Slug required" }, 400);
  }

  const topic = await getTopic(env, slug);

  if (!topic) {
    return json({ ok: false, error: "Topic not found" }, 404);
  }

  if (!validCoordinates(Number(topic.lat), Number(topic.lng))) {
    const coordinates = parseCoordinates(topic.map || topic.coordinates);

    if (coordinates) {
      topic.lat = coordinates.lat;
      topic.lng = coordinates.lng;
    }
  }

  return json({ ok: true, topic });
}

async function mutatePost(request, env) {
  const body = await readBody(request);

  if (!body) {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const slug = String(body.slug || "").trim();
  const topic = slug ? await getTopic(env, slug) : null;

  if (!slug) {
    return json({ ok: false, error: "Slug required" }, 400);
  }

  if (!topic) {
    return json({ ok: false, error: "Topic not found" }, 404);
  }

  if (!Array.isArray(topic.posts)) {
    topic.posts = [];
  }

  if (request.method === "POST") {
    const text = String(body.text || "").trim().slice(0, 5000);
    const userpic = String(body.userpic || "#7cff00").trim().slice(0, 32);

    if (!text) {
      return json({ ok: false, error: "Text required" }, 400);
    }

    topic.posts.push({ text, userpic });
  } else {
    const index = Number(body.index);

    if (!Number.isInteger(index) || index < 0 || index >= topic.posts.length) {
      return json({ ok: false, error: "Post not found" }, 404);
    }

    if (request.method === "PUT") {
      const text = String(body.text || "").trim().slice(0, 5000);

      if (!text) {
        return json({ ok: false, error: "Text required" }, 400);
      }

      topic.posts[index].text = text;
    } else if (request.method === "DELETE") {
      topic.posts.splice(index, 1);
    }
  }

  await saveTopic(env, topic);
  return json({ ok: true, topic });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (url.pathname.startsWith("/api/") && !env.DB) {
      return json({ ok: false, error: "DB NOT BOUND" }, 500);
    }

    try {
      if (url.pathname === "/api/topics" && request.method === "GET") {
        return json({ ok: true, data: await getTopics(env) });
      }

      if (url.pathname === "/api/topic" && request.method === "POST") {
        return await createTopic(request, env);
      }

      if (url.pathname === "/api/topic" && request.method === "GET") {
        return await fetchTopic(url, env);
      }

      if (
        url.pathname === "/api/topic/post" &&
        ["POST", "PUT", "DELETE"].includes(request.method)
      ) {
        return await mutatePost(request, env);
      }

      if (url.pathname.startsWith("/api/")) {
        return json({ ok: false, error: "Not found" }, 404);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("REQUEST ERROR:", error);
      return json({ ok: false, error: "Internal server error" }, 500);
    }
  }
};
