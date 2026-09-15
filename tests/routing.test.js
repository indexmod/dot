import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDevServer } from "../scripts/dev.mjs";
globalThis.location = new URL("https://indexmod.github.io/dot/");
const { routeSlug, topicUrl, API } = await import("../shared.js");

test("Pages links and slug parsing preserve the project prefix", () => {
  assert.equal(API, "https://dot.wiki-self.workers.dev");
  assert.equal(topicUrl("berlin-wall"), "/dot/berlin-wall");
  for (const slug of ["berlin-wall", "берлин", "東京"]) {
    assert.equal(routeSlug(topicUrl(slug)), slug);
    assert.equal(routeSlug(topicUrl(slug) + "/"), slug);
  }
  for (const path of ["/dot/", "/berlin-wall", "/dot/topic/berlin-wall", "/dot/topic.html", "/dot/%ZZ", "/dot/a%2Fb"]) assert.equal(routeSlug(path), null);
});

test("direct topic loads use the shared 404 shell with working absolute assets", async t => {
  const server = createDevServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;
  const home = await fetch(`${origin}/dot/`);
  assert.equal(home.status, 200);
  assert.doesNotMatch(await home.text(), /Delete/);
  const response = await fetch(`${origin}/dot/berlin-wall`);
  assert.equal(response.status, 404);
  const html = await response.text();
  assert.match(html, /id="topicTitle"/);
  for (const asset of ["topic.js", "topic.css", "shared.js"]) assert.equal((await fetch(`${origin}/dot/${asset}`)).status, 200);
  assert.equal(html, await readFile(new URL("../topic.html", import.meta.url), "utf8"));
  const create = await fetch(`${origin}/api/topic`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Local Topic", coordinates: "1, 2" }) });
  assert.equal(create.status, 201);
  const saved = await (await fetch(`${origin}/api/topic?slug=local-topic`)).json();
  assert.equal(saved.topic.title, "Local Topic");
});
