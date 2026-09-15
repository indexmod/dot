export const API = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? location.origin : "https://dot.wiki-self.workers.dev";
export const HOME = "/dot/";
export const topicUrl = slug => `${HOME}${encodeURIComponent(slug)}`;
export function routeSlug(pathname) {
  const match = pathname.match(/^\/dot\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    const slug = decodeURIComponent(match[1]);
    return /^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u.test(slug) ? slug : null;
  } catch { return null; }
}
export async function readJson(response) {
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || `HTTP ${response.status}`);
  return result;
}
