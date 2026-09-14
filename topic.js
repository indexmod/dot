const API = "https://dot.wiki-self.workers.dev/";

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

const topicTitle = document.getElementById("topicTitle");
const map = document.getElementById("map");
const posts = document.getElementById("posts");
const postInput = document.getElementById("postInput");

let topic = null;

function randomUserpic() {
  const colors = [
    "#7cff00",
    "#ff6b6b",
    "#6bcBff",
    "#ffd166",
    "#c77dff",
    "#ff9f1c",
    "#2ec4b6"
  ];

  return colors[
    Math.floor(Math.random() * colors.length)
  ];
}

function mapEmbedUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (
      url.hostname.includes("google.") ||
      url.hostname.includes("maps.google.")
    ) {
      const match =
        url.href.match(
          /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/
        );

      if (match) {
        const lat = match[1];
        const lng = match[2];

        return `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng) - 0.01}%2C${Number(lat) - 0.01}%2C${Number(lng) + 0.01}%2C${Number(lat) + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
      }
    }

    if (
      url.hostname.includes("openstreetmap.org")
    ) {
      const match =
        url.hash.match(
          /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/
        );

      if (match) {
        const lat = Number(match[1]);
        const lng = Number(match[2]);

        return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
      }
    }

    if (
      url.hostname.includes("yandex.")
    ) {
      const match =
        url.href.match(
          /ll=(-?\d+(?:\.\d+))%2C(-?\d+(?:\.\d+))/
        );

      if (match) {
        const lng = Number(match[1]);
        const lat = Number(match[2]);

        return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
      }
    }

  } catch (error) {
    console.error("Map error:", error);
  }

  return "";
}

function renderMap(value) {
  map.innerHTML = "";

  const embed =
    mapEmbedUrl(value);

  if (embed) {
    const iframe =
      document.createElement("iframe");

    iframe.src = embed;

    iframe.loading = "lazy";

    iframe.referrerPolicy =
      "no-referrer-when-downgrade";

    map.appendChild(iframe);

    return;
  }

  const fallback =
    document.createElement("div");

  fallback.className =
    "mapFallback";

  const link =
    document.createElement("a");

  link.href = value || "#";
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  link.textContent =
    value
      ? "Open map"
      : "No map";

  fallback.appendChild(link);
  map.appendChild(fallback);
}

function renderPosts() {
  posts.innerHTML = "";

  if (
    !topic ||
    !Array.isArray(topic.posts)
  ) {
    return;
  }

  topic.posts.forEach(
    (post, index) => {
      const row =
        document.createElement("div");

      row.className = "post";

      const userpic =
        document.createElement("div");

      userpic.className = "userpic";

      userpic.style.background =
        post.userpic ||
        randomUserpic();

      const content =
        document.createElement("div");

      content.className =
        "postContent";

      const text =
        document.createElement("div");

      text.className = "postText";

      text.textContent =
        post.text || "";

      const actions =
        document.createElement("div");

      actions.className =
        "postActions";

      const edit =
        document.createElement("button");

      edit.type = "button";
      edit.textContent = "edit";

      edit.addEventListener(
        "click",
        () => editPost(index)
      );

      const remove =
        document.createElement("button");

      remove.type = "button";
      remove.textContent = "delete";

      remove.addEventListener(
        "click",
        () => deletePost(index)
      );

      actions.appendChild(edit);
      actions.appendChild(remove);

      content.appendChild(text);
      content.appendChild(actions);

      row.appendChild(userpic);
      row.appendChild(content);

      posts.appendChild(row);
    }
  );
}

async function loadTopic() {
  if (!slug) {
    topicTitle.textContent =
      "Topic not found";

    return;
  }

  try {
    const response =
      await fetch(
        `${API}/api/topic?slug=${encodeURIComponent(slug)}`
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
        "Topic not found"
      );
    }

    topic = result.topic;

    document.title =
      topic.title || "Dot";

    topicTitle.textContent =
      topic.title || "";

    renderMap(topic.map);

    renderPosts();

    postInput.focus();

  } catch (error) {
    console.error(
      "Topic error:",
      error
    );

    topicTitle.textContent =
      "Topic not found";
  }
}

async function addPost() {
  const text =
    postInput.value.trim();

  if (!text || !slug) {
    return;
  }

  postInput.disabled = true;

  try {
    const response =
      await fetch(
        `${API}/api/topic/post`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            slug,
            text,
            userpic:
              randomUserpic()
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

    postInput.value = "";

    await loadTopic();

  } catch (error) {
    console.error(
      "Post error:",
      error
    );

    alert(
      "Не удалось сохранить строку."
    );

  } finally {
    postInput.disabled = false;
    postInput.focus();
  }
}

async function editPost(index) {
  const row =
    posts.children[index];

  if (!row) {
    return;
  }

  const content =
    row.querySelector(
      ".postContent"
    );

  const current =
    topic.posts[index]?.text || "";

  content.innerHTML = "";

  const input =
    document.createElement("input");

  input.className =
    "editInput";

  input.type = "text";
  input.value = current;

  const actions =
    document.createElement("div");

  actions.className =
    "postActions";

  const save =
    document.createElement("button");

  save.type = "button";
  save.textContent = "save";

  const cancel =
    document.createElement("button");

  cancel.type = "button";
  cancel.textContent = "cancel";

  actions.appendChild(save);
  actions.appendChild(cancel);

  content.appendChild(input);
  content.appendChild(actions);

  input.focus();
  input.select();

  save.addEventListener(
    "click",
    async () => {
      const text =
        input.value.trim();

      if (!text) {
        return;
      }

      save.disabled = true;

      try {
        const response =
          await fetch(
            `${API}/api/topic/post`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                slug,
                index,
                text
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
            "Update failed"
          );
        }

        await loadTopic();

      } catch (error) {
        console.error(
          "Edit error:",
          error
        );

        alert(
          "Не удалось изменить строку."
        );

        save.disabled = false;
      }
    }
  );

  cancel.addEventListener(
    "click",
    () => {
      renderPosts();
    }
  );

  input.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        event.preventDefault();
        save.click();
      }

      if (event.key === "Escape") {
        cancel.click();
      }
    }
  );
}

async function deletePost(index) {
  try {
    const response =
      await fetch(
        `${API}/api/topic/post`,
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            slug,
            index
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
        "Delete failed"
      );
    }

    await loadTopic();

  } catch (error) {
    console.error(
      "Delete error:",
      error
    );

    alert(
      "Не удалось удалить строку."
    );
  }
}

postInput.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      addPost();
    }
  }
);

loadTopic();
