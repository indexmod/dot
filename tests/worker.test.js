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
  r = await worker.fetch(req("PUT", "/api/topic/post", { slug: "berlin-wall", id: post.id, text: "edited line" }), envFor(db));
  assert.equal((await r.json()).post.text, "edited line");
});

test("delete removes the whole topic", async () => {
  const db = storage(); await create(db);
  const r = await worker.fetch(req("DELETE", "/api/topic", { slug: "berlin-wall" }), envFor(db));
  assert.equal(r.status, 200);
  assert.equal(db.data.size, 0);
});

test("pretty topic path serves topic page", async () => {
  const db = storage();
  const r = await worker.fetch(req("GET", "/berlin-wall"), envFor(db));
  assert.equal(await r.text(), "/topic.html");
});
