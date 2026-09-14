const API = "";

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");
const topicTitle = document.getElementById("topicTitle");
const map = document.getElementById("map");
const posts = document.getElementById("posts");
const postInput = document.getElementById("postInput");

let topic = null;
let editingIndex = null;

function randomUserpic() {
  const colors = [
    "#7cff00",
    "#ff6b6b",
    "#6bcbff",
    "#ffd166",
    "#c77dff",
    "#ff9f1c",
    "#2ec4b6"
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

function mapEmbedUrl(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "";
  }

  const delta = 0.01;
  const bbox = [
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta
  ].join(",");

  return (
    "https://www.openstreetmap.org/export/embed.html" +
    `?bbox=${encodeURIComponent(bbox)}&layer=mapnik` +
    `&marker=${encodeURIComponent(`${lat},${lng}`)}`
  );
}

function showMapFallback() {
  const fallback = document.createElement("div");
  fallback.className = "mapFallback";

  if (topic?.map) {
    const link = document.createElement("a");
    link.href = topic.map;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open map";
    fallback.appendChild(link);
  } else {
    fallback.textContent = "No coordinates";
  }

  map.appendChild(fallback);
}

function renderMap() {
  map.replaceChildren();

  const embedUrl = mapEmbedUrl(Number(topic?.lat), Number(topic?.lng));

  if (!embedUrl) {
    showMapFallback();
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.title = `Map for ${topic.title || "topic"}`;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  map.appendChild(iframe);
}

async function readJson(response) {
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || `HTTP ${response.status}`);
  }

  return result;
}

function postRequest(method, body) {
  return fetch(`${API}/api/topic/post`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }).then(readJson);
}

function renderPosts() {
  posts.replaceChildren();

  if (!Array.isArray(topic?.posts)) {
    return;
  }

  topic.posts.forEach((post, index) => {
    const row = document.createElement("div");
    row.className = "post";

    const userpic = document.createElement("div");
    userpic.className = "userpic";
    userpic.style.background = post.userpic || "#7cff00";
    userpic.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = "postContent";

    if (editingIndex === index) {
      renderEditor(content, post, index);
    } else {
      const text = document.createElement("div");
      text.className = "postText";
      text.textContent = post.text || "";

      const actions = document.createElement("div");
      actions.className = "postActions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "edit";
      edit.addEventListener("click", () => {
        editingIndex = index;
        renderPosts();
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "delete";
      remove.addEventListener("click", () => deletePost(index, remove));

      actions.append(edit, remove);
      content.append(text, actions);
    }

    row.append(userpic, content);
    posts.appendChild(row);
  });
}

function renderEditor(content, post, index) {
  const input = document.createElement("input");
  input.className = "editInput";
  input.type = "text";
  input.value = post.text || "";

  const actions = document.createElement("div");
  actions.className = "postActions";

  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "save";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "cancel";

  async function submit() {
    const text = input.value.trim();

    if (!text) {
      input.focus();
      return;
    }

    save.disabled = true;

    try {
      await postRequest("PUT", { slug, index, text });
      editingIndex = null;
      await loadTopic(false);
    } catch (error) {
      console.error("Edit error:", error);
      alert(error.message || "Could not edit line.");
      save.disabled = false;
    }
  }

  save.addEventListener("click", submit);
  cancel.addEventListener("click", () => {
    editingIndex = null;
    renderPosts();
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      editingIndex = null;
      renderPosts();
    }
  });

  actions.append(save, cancel);
  content.append(input, actions);

  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

async function loadTopic(focusComposer = true) {
  if (!slug) {
    topicTitle.textContent = "Topic not found";
    postInput.disabled = true;
    return;
  }

  try {
    const response = await fetch(
      `${API}/api/topic?slug=${encodeURIComponent(slug)}`
    );
    const result = await readJson(response);

    topic = result.topic;
    document.title = topic.title || "Dot";
    topicTitle.textContent = topic.title || "";
    renderMap();
    renderPosts();

    if (focusComposer) {
      postInput.focus();
    }
  } catch (error) {
    console.error("Topic error:", error);
    topicTitle.textContent = error.message || "Topic not found";
    map.replaceChildren();
    posts.replaceChildren();
    postInput.disabled = true;
  }
}

async function addPost() {
  const text = postInput.value.trim();

  if (!text || !slug) {
    return;
  }

  postInput.disabled = true;

  try {
    await postRequest("POST", {
      slug,
      text,
      userpic: randomUserpic()
    });
    postInput.value = "";
    await loadTopic();
  } catch (error) {
    console.error("Post error:", error);
    alert(error.message || "Could not save line.");
  } finally {
    postInput.disabled = false;
    postInput.focus();
  }
}

async function deletePost(index, button) {
  button.disabled = true;

  try {
    await postRequest("DELETE", { slug, index });
    await loadTopic(false);
  } catch (error) {
    console.error("Delete error:", error);
    alert(error.message || "Could not delete line.");
    button.disabled = false;
  }
}

postInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    addPost();
  }
});

loadTopic();
