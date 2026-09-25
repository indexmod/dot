import { API, HOME, topicUrl, routeSlug, readJson } from "./shared.js?v=4";
const slug = routeSlug(location.pathname);
const map = document.getElementById("map");
const titleInput = document.getElementById("topicTitle");
const deleteButton = document.getElementById("deleteTopic");
const telegramShare = document.getElementById("telegramShare");
const posts = document.getElementById("posts");
const composer = document.getElementById("composer");
const postInput = document.getElementById("postInput");
const composerAvatar = document.getElementById("composerAvatar");
const status = document.getElementById("status");
let topic = null;
const lineEmojis = ["😀", "😎", "🤠", "🤓", "🥳", "😺", "🐼", "🦊", "🐸", "🐙", "🦄", "🐝", "🌈", "⭐", "🔥", "🍀", "🌻", "🍉", "🚀", "🎈"];
function randomEmoji() { return lineEmojis[Math.floor(Math.random() * lineEmojis.length)]; }
composerAvatar.textContent = randomEmoji();

function updateTelegramShare() {
  const url = `https://indexmod.github.io${topicUrl(slug)}`;
  telegramShare.href = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(topic.title)}`;
  telegramShare.hidden = false;
}

function renderMap() {
  if (!topic || !Number.isFinite(topic.lat) || !Number.isFinite(topic.lng)) return;
  if (!window.L) { map.textContent = "Map unavailable. Please reload."; return; }
  const view = L.map(map).setView([topic.lat, topic.lng], 14);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(view);
  L.circleMarker([topic.lat, topic.lng], {
    radius: 9, color: "#7cff00", fillColor: "#7cff00", fillOpacity: 1, weight: 2
  }).addTo(view);
}
function resize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function renderPosts() {
  posts.innerHTML = "";
  (topic?.posts || []).forEach(post => {
    const row = document.createElement("div");
    row.className = "post";
    const avatar = document.createElement("span");
    avatar.className = "lineAvatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = post.emoji || "🙂";
    const textarea = document.createElement("textarea");
    textarea.className = "postText";
    textarea.rows = 1;
    textarea.value = post.text;
    textarea.setAttribute("aria-label", "Edit anonymous line");
    textarea.addEventListener("input", () => resize(textarea));
    textarea.addEventListener("change", async () => {
      const text = textarea.value.trim();
      if (!text) { textarea.value = post.text; return; }
      textarea.disabled = true;
      try {
        const result = await readJson(await fetch(`${API}/api/topic/post`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, id: post.id, text })
        }));
        post.text = result.post.text;
        textarea.value = post.text;
      } catch (error) { status.textContent = error.message; textarea.value = post.text; }
      finally { textarea.disabled = false; resize(textarea); }
    });
    row.append(avatar, textarea);
    posts.appendChild(row);
    resize(textarea);
  });
}

async function loadTopic() {
  if (!slug || slug === "topic.html") { status.textContent = "Topic not found."; return; }
  try {
    const result = await readJson(await fetch(`${API}/api/topic?slug=${encodeURIComponent(slug)}`));
    topic = result.topic;
    titleInput.disabled = deleteButton.disabled = postInput.disabled = false;
    titleInput.value = topic.title;
    document.title = `${topic.title} — Dot`;
    updateTelegramShare();
    renderMap();
    renderPosts();
  } catch (error) { status.textContent = error.message; }
}

titleInput.addEventListener("change", async () => {
  const title = titleInput.value.trim();
  if (!topic) return;
  if (!title) { titleInput.value = topic.title; return; }
  if (title === topic.title) return;
  titleInput.disabled = true;
  deleteButton.disabled = true;
  status.textContent = "Saving…";
  try {
    const result = await readJson(await fetch(`${API}/api/topic`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title })
    }));
    topic.title = result.topic.title;
    document.title = `${topic.title} — Dot`;
    updateTelegramShare();
    status.textContent = "";
  } catch (error) { status.textContent = error.message; titleInput.value = topic.title; }
  finally { titleInput.disabled = deleteButton.disabled = false; }
});

composer.addEventListener("submit", async event => {
  event.preventDefault();
  const text = postInput.value.trim();
  if (!text || !topic || postInput.disabled) return;
  postInput.disabled = true;
  try {
    const result = await readJson(await fetch(`${API}/api/topic/post`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, text })
    }));
    topic.posts.push(result.post);
    postInput.value = "";
    composerAvatar.textContent = randomEmoji();
    renderPosts();
  } catch (error) { status.textContent = error.message; }
  finally { postInput.disabled = false; postInput.focus(); }
});
postInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); composer.requestSubmit(); }
});

deleteButton.addEventListener("click", async () => {
  if (deleteButton.disabled || !topic || !confirm(`Delete ${topic.title}?`)) return;
  deleteButton.disabled = true;
  try {
    await readJson(await fetch(`${API}/api/topic`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug })
    }));
    window.location.href = HOME;
  } catch (error) { status.textContent = error.message; deleteButton.disabled = false; }
});

postInput.addEventListener("input", () => resize(postInput));
loadTopic();
