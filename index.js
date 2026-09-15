import { API, topicUrl, readJson } from "./shared.js?v=3";

const form = document.getElementById("topicForm");
const titleInput = document.getElementById("titleInput");
const topics = document.getElementById("topics");
const status = document.getElementById("status");
const TOPICS_CACHE = "dot:topics:v1";

function renderTopics(items) {
  topics.innerHTML = "";
  items.forEach(topic => {
    const link = document.createElement("a");
    link.className = "topic";
    link.href = topicUrl(topic.slug);
    const dot = document.createElement("span");
    dot.className = "topicListDot";
    dot.setAttribute("aria-hidden", "true");
    link.textContent = topic.title;
    link.prepend(dot);
    topics.appendChild(link);
  });
}

async function loadTopics() {
  try {
    const cached = JSON.parse(localStorage.getItem(TOPICS_CACHE) || "null");
    if (Array.isArray(cached) && cached.length) renderTopics(cached);
  } catch { /* Ignore unavailable or corrupt browser storage. */ }
  try {
    const result = await readJson(await fetch(`${API}/api/topics`));
    const items = Array.isArray(result.data) ? result.data : [];
    if (items.length || !topics.children.length) renderTopics(items);
    if (items.length) localStorage.setItem(TOPICS_CACHE, JSON.stringify(items));
    status.textContent = items.length || topics.children.length ? "" : "No topics yet.";
  } catch (error) {
    if (!topics.children.length) status.textContent = error.message;
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  status.textContent = "Creating…";
  try {
    const match = titleInput.value.trim().match(/^(.+?)[,\s]+(-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?)$/);
    if (!match) throw new Error("Use Topic name, latitude, longitude (for example: Berlin Wall, 52.5163, 13.3777)");
    const result = await readJson(await fetch(`${API}/api/topic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: match[1].trim(),
        coordinates: match[2]
      })
    }));
    window.location.href = topicUrl(result.topic.slug);
  } catch (error) {
    status.textContent = error.message;
  }
});

titleInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    form.requestSubmit();
  }
});

loadTopics();
