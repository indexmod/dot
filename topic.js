const API = window.location.hostname.endsWith(".github.io")\n  ? "https://dot.wiki-self.workers.dev"\n  : "";

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
  fallback.textContent = "No coordinates";
  map.appendChild(fallback);
}

