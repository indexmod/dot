// Local Pages-style fallback and the real Worker with an isolated, in-memory KV.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import worker from "../worker.js";
const root = new URL("../", import.meta.url);
const data = new Map();
const DOT_DB = {
  async get(key) { return data.get(key)?.value ?? null; },
  async put(key, value, options = {}) { data.set(key, { value, metadata: options.metadata }); },
  async delete(key) { data.delete(key); },
  async list({ prefix = "" } = {}) {
    return { keys: [...data].filter(([key]) => key.startsWith(prefix)).map(([name, value]) => ({ name, metadata: value.metadata })), list_complete: true };
  }
};
const publicFiles = new Set(["index.html", "index.js", "index.css", "topic.html", "topic.js", "topic.css", "404.html", "shared.js"]);
const mime = { html: "text/html", js: "text/javascript", css: "text/css" };
export function createDevServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const response = await worker.fetch(new Request(url, {
          method: req.method, headers: req.headers,
          ...(!["GET", "HEAD"].includes(req.method) ? { body: Buffer.concat(chunks) } : {})
        }), { DOT_DB });
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (url.pathname === "/" || url.pathname === "/dot") {
        res.writeHead(302, { Location: "/dot/" }); res.end(); return;
      }
      const name = url.pathname === "/dot/" ? "index.html" : url.pathname.slice(5);
      const found = url.pathname.startsWith("/dot/") && publicFiles.has(name);
      const file = found ? name : "404.html";
      res.writeHead(found ? 200 : 404, { "Content-Type": `${mime[file.split(".").pop()]}; charset=utf-8` });
      res.end(await readFile(new URL(file, root)));
    } catch (error) { res.writeHead(500); res.end(error.message); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createDevServer().listen(4173, "127.0.0.1", () => console.log("Open http://127.0.0.1:4173/dot/ — local data resets on restart."));
}
