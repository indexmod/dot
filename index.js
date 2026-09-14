const API = window.location.hostname.endsWith(".github.io")\n  ? "https://dot.wiki-self.workers.dev"\n  : "";

const titleInput = document.getElementById("titleInput");
const mapInput = document.getElementById("mapInput");
const createButton = document.getElementById("createButton");
const topics = document.getElementById("topics");

function makeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

async function readJson(response) {
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || `HTTP ${response.status}`);
  }

  return result;
}

async function loadTopics() {
  topics.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(`${API}/api/topics`);
    const result = await readJson(response);

    if (!Array.isArray(result.data)) {
      throw new Error("Invalid response");
    }

    topics.replaceChildren();

    result.data.forEach(topic => {
      const link = document.createElement("a");
      link.className = "topic";
      link.href = `./topic.html?slug=${encodeURIComponent(topic.slug)}`;
      link.textContent = topic.title || "";
      topics.appendChild(link);
    });
  } catch (error) {
    console.error("Topics error:", error);
    topics.textContent = "Could not load topics.";
  } finally {
    topics.removeAttribute("aria-busy");
  }
}

async function createTopic() {
  const title = titleInput.value.trim();
  const map = mapInput.value.trim();

  if (!title) {
    titleInput.focus();
    return;
  }

  if (!map) {
    mapInput.focus();
    return;
  }

  const slug = makeSlug(title);

  if (!slug) {
    alert("Could not create a valid address for this topic.");
    return;
  }

  createButton.disabled = true;

  try {
    const response = await fetch(`${API}/api/topic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        map,
        slug
      })
    });

    const result = await readJson(response);
    window.location.assign(
      `./topic.html?slug=${encodeURIComponent(result.topic.slug)}`
    );
  } catch (error) {
    console.error("Create topic error:", error);
    alert(error.message || "Could not create topic.");
    createButton.disabled = false;
  }
}

createButton.addEventListener("click", createTopic);

mapInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    createTopic();
  }
});

titleInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    mapInput.focus();
  }
});

loadTopics();
