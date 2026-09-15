const API = window.location.hostname.endsWith(".github.io")
  ? "https://dot.wiki-self.workers.dev"
  : "";

const form = document.getElementById("topicForm");
const titleInput = document.getElementById("titleInput");
const mapInput = document.getElementById("mapInput");
const createButton = document.getElementById("createButton");
const topics = document.getElementById("topics");
const status = document.getElementById("status");

async function readJson(response) {
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || `HTTP ${response.status}`);
  return result;
}

function topicUrl(slug) {
  if (API) return `${API}/${encodeURIComponent(slug)}`;
  return `/${encodeURIComponent(slug)}`;
}

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
    const result = await readJson(await fetch(`${API}/api/topic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: titleInput.value.trim(),
        coordinates: mapInput.value.trim()
      })
    }));
    window.location.href = topicUrl(result.topic.slug);
  } catch (error) {
    status.textContent = error.message;
    createButton.disabled = false;
  }
});

loadTopics();
