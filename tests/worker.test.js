import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
const request = (method = 'GET', body, path = '/api/coordinates') => new Request(`https://dot.test${path}`, {
  method, ...(body !== undefined ? { body, headers: { 'Content-Type': 'application/json' } } : {})
});
function storage() {
  const data = new Map();
  return {
    data,
    async put(key, value, options) { data.set(key, { value, metadata: options.metadata }); },
    async list() { return { keys: [...data].map(([name, entry]) => ({ name, metadata: entry.metadata })), list_complete: true }; }
  };
}
test('coordinates persist and simultaneous additions do not overwrite each other', async () => {
  const DOT_DB = storage();
  const env = { DOT_DB };
  const values = ['55.7558, 37.6176', '-90, 180', '0, 0'];
  const responses = await Promise.all(values.map(coordinates => worker.fetch(request('POST', JSON.stringify({ coordinates })), env)));
  assert.ok(responses.every(response => response.status === 201));
  const response = await worker.fetch(request(), env);
  assert.deepEqual(await response.json(), { ok: true, data: [{ lat: 55.7558, lng: 37.6176 }, { lat: -90, lng: 180 }, { lat: 0, lng: 0 }], cursor: null });
  await worker.fetch(request('POST', '{"coordinates":"0.0, 0.0"}'), env);
  assert.equal(DOT_DB.data.size, 3);
});
test('invalid input never writes to storage', async () => {
  const DOT_DB = storage();
  for (const coordinates of ['91, 0', '0, -181', '1x5, 2', '1;2', '', null, {}, 'Infinity, 0']) {
    assert.equal((await worker.fetch(request('POST', JSON.stringify({ coordinates })), { DOT_DB })).status, 400);
  }
  for (const body of ['{', 'null', '[]']) {
    assert.equal((await worker.fetch(request('POST', body), { DOT_DB })).status, 400);
  }
  assert.equal(DOT_DB.data.size, 0);
});
test('routing, preflight and missing binding', async () => {
  assert.equal((await worker.fetch(request('OPTIONS'), {})).status, 204);
  assert.equal((await worker.fetch(request(), {})).status, 500);
  for (const method of ['PUT', 'DELETE']) assert.equal((await worker.fetch(request(method), {})).status, 405);
  for (const path of ['/api/topics', '/api/topic', '/api/topic/post', '/api/unknown']) {
    assert.equal((await worker.fetch(request('GET', undefined, path), {})).status, 404);
  }
  assert.equal(await (await worker.fetch(request('GET', undefined, '/'), { ASSETS: { fetch: () => new Response('page') } })).text(), 'page');
});
test('KV cursor is passed through, including empty pages', async () => {
  const response = await worker.fetch(request('GET', undefined, '/api/coordinates?cursor=previous'), {
    DOT_DB: { async list(options) {
      assert.equal(options.cursor, 'previous');
      assert.equal(options.prefix, 'coordinate:');
      return { keys: [], list_complete: false, cursor: 'next' };
    } }
  });
  assert.deepEqual(await response.json(), { ok: true, data: [], cursor: 'next' });
});
test('storage failures return JSON and CORS headers', async () => {
  const response = await worker.fetch(request(), { DOT_DB: { async list() { throw new Error('Unavailable'); } } });
  assert.equal(response.status, 500);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal((await response.json()).ok, false);
});
