const API = "https://dot.wiki-self.workers.dev";

const titleInput =
  document.getElementById("titleInput");

const mapInput =
  document.getElementById("mapInput");

const createButton =
  document.getElementById("createButton");

const topics =
  document.getElementById("topics");

function makeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^\p{Letter}\p{Number}]+/gu,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

async function loadTopics() {
  try {
    const response =
      await fetch(`${API}/api/topics`);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const result =
      await response.json();

    if (
      !result.ok ||
      !Array.isArray(result.data)
    ) {
      throw new Error(
        "Invalid response"
      );
    }

    topics.innerHTML = "";

    result.data.forEach(topic => {
      const link =
        document.createElement("a");

      link.className = "topic";

      link.href =
        `./topic.html?slug=${encodeURIComponent(
          topic.slug
        )}`;

      link.textContent =
        topic.title || "";

      topics.appendChild(link);
    });

  } catch (error) {
    console.error(
      "Topics error:",
      error
    );

    topics.innerHTML = "";
  }
}

async function createTopic() {
  const title =
    titleInput.value.trim();

  const coordinates =
    mapInput.value.trim();

  if (!title) {
    titleInput.focus();
    return;
  }

  if (!coordinates) {
    mapInput.focus();
    return;
  }

  const slug =
    makeSlug(title);

  if (!slug) {
    alert(
      "Не удалось создать slug."
    );
    return;
  }

  createButton.disabled = true;

  try {
    const response =
      await fetch(`${API}/api/topic`, {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          title,
          coordinates,
          slug
        })
      });

    const result =
      await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(
        result.error ||
        `HTTP ${response.status}`
      );
    }

    window.location.href =
      `./topic.html?slug=${encodeURIComponent(
        result.topic.slug
      )}`;

  } catch (error) {
    console.error(
      "Create topic error:",
      error
    );

    alert(
      error.message ||
      "Не удалось создать тему."
    );

    createButton.disabled = false;
  }
}

createButton.addEventListener(
  "click",
  createTopic
);

mapInput.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      event.preventDefault();
      createTopic();
    }
  }
);

titleInput.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      event.preventDefault();
      mapInput.focus();
    }
  }
);

loadTopics();
