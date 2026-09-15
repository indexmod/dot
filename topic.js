const API = window.location.hostname.endsWith(".github.io")
  ? "https://dot.wiki-self.workers.dev"
  : "";
const querySlug = new URLSearchParams(location.search).get("slug");
const pathSlug = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, ""));
const slug = querySlug || pathSlug;
const map = document.getElementById("map");
const titleInput = document.getElementById("topicTitle");
const slugLabel = document.getElementById("topicSlug");
const deleteButton = document.getElementById("deleteTopic");
const posts = document.getElementById("posts");
const composer = document.getElementById("composer");
const postInput = document.getElementById("postInput");
const status = document.getElementById("status");
let topic = null;

async function readJson(response) {
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || `HTTP ${response.status}`);
  return result;
}

function mapEmbedUrl(lat, lng) {
  const d = 0.01;
  const bbox = [lng - d, lat - d, lng + d, lat + d].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
}

function renderMap() {
  map.innerHTML = "";
  if (!topic || !Number.isFinite(topic.lat) || !Number.isFinite(topic.lng)) return;
  const iframe = document.createElement("iframe");
  iframe.src = mapEmbedUrl(topic.lat, topic.lng);
  iframe.loading = "lazy";
  iframe.title = `Map: ${topic.title}`;
  map.appendChild(iframe);
}

function renderPosts() {
  posts.innerHTML = "";
  (topic?.posts || []).forEach(post => {
    const row = document.createElement("div");
    row.className = "post";
    const dot = document.createElement("span");
    dot.className = "anonymousDot";
    const textarea = document.createElement("textarea");
    textarea.className = "postText";
    textarea.rows = 1;
    textarea.value = post.text;
    textarea.addEventListener("change", async () => {
      const text = textarea.value.trim();
      if (!text) { textarea.value = post.text; return; }
      try {
        const result = await readJson(await fetch(`${API}/api/topic/post`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, id: post.id, text })
        }));
        post.text = result.post.text;
        textarea.value = post.text;
      } catch (error) { status.textContent = error.message; textarea.value = post.text; }
    });
    row.append(dot, textarea);
    posts.appendChild(row);
  });
}

async function loadTopic() {
  if (!slug || slug === "topic.html") { status.textContent = "Topic not found."; return; }
  try {
    const result = await readJson(await fetch(`${API}/api/topic?slug=${encodeURIComponent(slug)}`));
    topic = result.topic;
    titleInput.value = topic.title;
    slugLabel.textContent = topic.slug;
    document.title = `${topic.title} — Dot`;
    renderMap();
    renderPosts();
  } catch (error) { status.textContent = error.message; }
}

let titleTimer;
titleInput.addEventListener("input", () => {
  clearTimeout(titleTimer);
  titleTimer = setTimeout(async () => {
    const title = titleInput.value.trim();
    if (!title || !topic || title === topic.title) return;
    try {
      const result = await readJson(await fetch(`${API}/api/topic`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title })
      }));
      topic.title = result.topic.title;
      document.title = `${topic.title} — Dot`;
      status.textContent = "";
    } catch (error) { status.textContent = error.message; }
  }, 450);
});

composer.addEventListener("submit", async event => {
  event.preventDefault();
  const text = postInput.value.trim();
  if (!text) return;
  postInput.disabled = true;
  try {
    const result = await readJson(await fetch(`${API}/api/topic/post`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, text })
    }));
    topic.posts.push(result.post);
    postInput.value = "";
    renderPosts();
  } catch (error) { status.textContent = error.message; }
  finally { postInput.disabled = false; postInput.focus(); }
});
postInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); composer.requestSubmit(); }
});

deleteButton.addEventListener("click", async () => {
  if (!topic || !confirm(`Delete ${topic.title}?`)) return;
  deleteButton.disabled = true;
  try {
    await readJson(await fetch(`${API}/api/topic`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug })
    }));
    window.location.href = API || "/";
  } catch (error) { status.textContent = error.message; deleteButton.disabled = false; }
});

loadTopic();
