import { API, topicUrl, readJson } from "./shared.js";

const form = document.getElementById("topicForm");
const titleInput = document.getElementById("titleInput");
const createButton = document.getElementById("createButton");
const topics = document.getElementById("topics");
const status = document.getElementById("status");

function renderTopics(items) {
  topics.innerHTML = "";
  items.forEach(topic => {
    const link = document.createElement("a");
    link.className = "topic";
    link.href = topicUrl(topic.slug);
    link.textContent = topic.title;
    topics.appendChild(link);
  });
}

async function loadTopics() {
  try {
    const result = await readJson(await fetch(`${API}/api/topics`));
    renderTopics(Array.isArray(result.data) ? result.data : []);
    status.textContent = result.data?.length ? "" : "No topics yet.";
  } catch (error) {
    status.textContent = error.message;
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (createButton.disabled) return;
  createButton.disabled = true;
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
    createButton.disabled = false;
  }
});

loadTopics();
