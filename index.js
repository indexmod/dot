js
const API = "https://endless.wiki-self.workers.dev";

const titleInput =
  document.getElementById("titleInput");

const createButton =
  document.getElementById("createButton");

const topics =
  document.getElementById("topics");

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

    result.data
      .slice()
      .sort((a, b) => {
        return (
          new Date(b.created) -
          new Date(a.created)
        );
      })
      .forEach(topic => {

        const link =
          document.createElement("a");

        link.className = "topic";

        link.href =
          `./topic.html?id=${encodeURIComponent(
            topic.id
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

  if (!title) {
    titleInput.focus();
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
          title
        })
      });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const result =
      await response.json();

    if (
      !result.ok ||
      !result.topic
    ) {
      throw new Error(
        "Create failed"
      );
    }

    window.location.href =
      `./topic.html?id=${encodeURIComponent(
        result.topic.id
      )}`;

  } catch (error) {
    console.error(
      "Create topic error:",
      error
    );

    alert(
      "Не удалось создать тему."
    );

    createButton.disabled = false;
  }
}

createButton.addEventListener(
  "click",
  createTopic
);

titleInput.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      event.preventDefault();
      createTopic();
    }
  }
);

loadTopics();
