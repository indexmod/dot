js
const API = "https://endless.wiki-self.workers.dev";

const params = new URLSearchParams(
  window.location.search
);

const topicId = params.get("id");

const mapElement =
  document.getElementById("map");

const titleElement =
  document.getElementById("topicTitle");

const textInput =
  document.getElementById("textInput");

const postsElement =
  document.getElementById("posts");

const userpics = [
  "😀", "😎", "🙂", "😏", "🤓",
  "😶", "🙃", "😌", "🫥", "🤔",
  "👽", "🤖", "👻", "🐱", "🐶",
  "🦊", "🐸", "🐵", "🦄", "🐼"
];

let map = null;

function randomUserpic() {
  return userpics[
    Math.floor(
      Math.random() * userpics.length
    )
  ];
}

function autoGrow() {
  textInput.style.height = "auto";

  textInput.style.height =
    `${textInput.scrollHeight}px`;
}

function createMap(lat, lng, zoom = 15) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    mapElement.style.display = "none";
    return;
  }

  map = L.map(mapElement).setView(
    [lat, lng],
    zoom
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  L.marker([
    lat,
    lng
  ]).addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

function renderPosts(posts) {
  postsElement.innerHTML = "";

  if (!Array.isArray(posts)) {
    return;
  }

  posts
    .slice()
    .sort((a, b) => {
      return (
        new Date(a.created) -
        new Date(b.created)
      );
    })
    .forEach(post => {
      const item =
        document.createElement("div");

      item.className = "post";

      const userpic =
        document.createElement("div");

      userpic.className = "userpic";

      userpic.textContent =
        post.userpic || "🙂";

      const text =
        document.createElement("div");

      text.className = "postText";

      text.textContent =
        post.text || "";

      item.appendChild(userpic);
      item.appendChild(text);

      postsElement.appendChild(item);
    });
}

async function loadTopic() {
  if (!topicId) {
    titleElement.textContent =
      "Topic not found";

    textInput.disabled = true;

    return;
  }

  try {
    const response = await fetch(
      `${API}/api/topic?id=${encodeURIComponent(
        topicId
      )}`
    );

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
        "Invalid topic response"
      );
    }

    const topic = result.topic;

    titleElement.textContent =
      topic.title || "";

    createMap(
      Number(topic.lat),
      Number(topic.lng),
      Number(topic.zoom) || 15
    );

    renderPosts(topic.posts);

  } catch (error) {
    console.error(
      "Topic error:",
      error
    );

    titleElement.textContent =
      "Не удалось загрузить тему.";

    textInput.disabled = true;
  }
}

async function addPost(text) {
  if (
    !topicId ||
    !text.trim()
  ) {
    return;
  }

  try {
    const response = await fetch(
      `${API}/api/topic/post`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          topicId,
          text: text.trim(),
          userpic: randomUserpic()
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const result =
      await response.json();

    if (!result.ok) {
      throw new Error(
        "Post failed"
      );
    }

    await loadTopic();

  } catch (error) {
    console.error(
      "Post error:",
      error
    );

    alert(
      "Не удалось добавить текст."
    );
  }
}

textInput.addEventListener(
  "input",
  autoGrow
);

textInput.addEventListener(
  "keydown",
  event => {

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const text =
      textInput.value.trim();

    if (!text) {
      return;
    }

    textInput.value = "";

    autoGrow();

    addPost(text);
  }
);

loadTopic();

autoGrow();
