import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

function storage() {
  const data = new Map();
  return {
    data,
    async get(key) { return data.get(key)?.value ?? null; },
    async put(key, value, options = {}) { data.set(key, { value, metadata: options.metadata }); },
    async delete(key) { data.delete(key); },
    async list({ prefix = "" } = {}) { return { keys: [...data].filter(([k]) => k.startsWith(prefix)).map(([name, v]) => ({ name, metadata: v.metadata })), list_complete: true }; }
  };
}
const req = (method, path, body) => new Request(`https://dot.test${path}`, { method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
const envFor = db => ({ DOT_DB: db, ASSETS: { fetch: request => new Response(new URL(request.url).pathname) } });

async function create(db, title = "Berlin Wall") {
  return worker.fetch(req("POST", "/api/topic", { title, coordinates: "52.5163, 13.3777" }), envFor(db));
}

test("creates topic with fixed slug and coordinates", async () => {
  const db = storage();
  const r = await create(db);
  assert.equal(r.status, 201);
  const { topic } = await r.json();
  assert.equal(topic.slug, "berlin-wall");
  assert.equal(topic.lat, 52.5163);
  assert.equal(topic.lng, 13.3777);
});

test("title can change without changing slug", async () => {
  const db = storage(); await create(db);
  const r = await worker.fetch(req("PUT", "/api/topic", { slug: "berlin-wall", title: "The Wall" }), envFor(db));
  const { topic } = await r.json();
  assert.equal(topic.title, "The Wall");
  assert.equal(topic.slug, "berlin-wall");
  assert.ok(db.data.has("topic:berlin-wall"));
});

test("anonymous lines persist and can be edited", async () => {
  const db = storage(); await create(db);
  let r = await worker.fetch(req("POST", "/api/topic/post", { slug: "berlin-wall", text: "first anonymous line" }), envFor(db));
  const post = (await r.json()).post;
  assert.match(post.emoji, /\S/);
  r = await worker.fetch(req("PUT", "/api/topic/post", { slug: "berlin-wall", id: post.id, text: "edited line" }), envFor(db));
  assert.equal((await r.json()).post.text, "edited line");
});

test("delete removes the whole topic", async () => {
  const db = storage(); await create(db);
  const r = await worker.fetch(req("DELETE", "/api/topic", { slug: "berlin-wall" }), envFor(db));
  assert.equal(r.status, 200);
  assert.equal(db.data.size, 0);
});

test("Worker exposes JSON only, including unknown public paths", async () => {
  for (const path of ["/", "/berlin-wall", "/topic", "/topic.html"]) {
    const response = await worker.fetch(req("GET", path), {});
    assert.equal(response.status, 404);
    assert.match(response.headers.get("content-type"), /application\/json/);
  }
});

test("delete removes lines and prevents further edits", async () => {
  const db = storage(); await create(db);
  const added = await worker.fetch(req("POST", "/api/topic/post", { slug: "berlin-wall", text: "line" }), envFor(db));
  const { post } = await added.json();
  await worker.fetch(req("DELETE", "/api/topic", { slug: "berlin-wall" }), envFor(db));
  assert.equal((await worker.fetch(req("GET", "/api/topic?slug=berlin-wall"), envFor(db))).status, 404);
  assert.equal((await worker.fetch(req("PUT", "/api/topic/post", { slug: "berlin-wall", id: post.id, text: "changed" }), envFor(db))).status, 404);
  assert.equal(db.data.size, 0);
});

test("duplicates, malformed coordinates and overlong slugs are rejected", async () => {
  const db = storage(); await create(db);
  assert.equal((await create(db)).status, 409);
  assert.equal((await create(db, "я".repeat(300))).status, 400);
  for (const coordinates of ["91, 0", "0, 181", "abc", ""]) {
    assert.equal((await worker.fetch(req("POST", "/api/topic", { title: "Other", coordinates }), envFor(db))).status, 400);
  }
});

test("listing follows KV pagination", async () => {
  let calls = 0;
  const response = await worker.fetch(req("GET", "/api/topics"), { DOT_DB: {
    async list(options) {
      calls++;
      if (!options.cursor) return { keys: [{ metadata: { slug: "first", title: "First" } }], cursor: "next", list_complete: false };
      assert.equal(options.cursor, "next");
      return { keys: [{ metadata: { slug: "second", title: "Second" } }], list_complete: true };
    }
  }});
  assert.equal(calls, 2);
  assert.equal((await response.json()).data.length, 2);
});

test("CORS preflight supports Pages writes", async () => {
  const response = await worker.fetch(req("OPTIONS", "/api/topic"), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.match(response.headers.get("access-control-allow-methods"), /PUT, DELETE/);
});
