const API = window.location.hostname.endsWith(".github.io")
  ? "https://dot.wiki-self.workers.dev"
  : "";
const form = document.getElementById("coordinateForm");
const input = document.getElementById("mapInput");
const submit = document.getElementById("createButton");
const list = document.getElementById("coordinates");
const status = document.getElementById("status");
const map = document.getElementById("map");
const more = document.getElementById("loadMore");
const seen = new Set();
let cursor = null;

async function readJson(response) {
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || `HTTP ${response.status}`);
  return result;
}

function showPoint({ lat, lng }) {
  const bbox = [Math.max(-180, lng - 0.01), Math.max(-90, lat - 0.01),
    Math.min(180, lng + 0.01), Math.min(90, lat + 0.01)].join(",");
  map.src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
  map.title = `Map: ${lat}, ${lng}`;
  map.hidden = false;
}

function addPoint(point, prepend = false) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
  const label = `${point.lat}, ${point.lng}`;
  if (seen.has(label)) return;
  seen.add(label);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "coordinate";
  button.textContent = label;
  button.addEventListener("click", () => showPoint(point));
  if (prepend) list.prepend(button);
  else list.append(button);
}

async function loadCoordinates() {
  more.disabled = true;
  list.setAttribute("aria-busy", "true");
  try {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const result = await readJson(await fetch(`${API}/api/coordinates${query}`));
    if (!Array.isArray(result.data)) throw new Error("Invalid response");
    result.data.forEach(point => addPoint(point));
    cursor = result.cursor;
    more.hidden = !cursor;
    more.textContent = "Load more";
    status.textContent = seen.size ? "" : "No saved coordinates yet.";
  } catch (error) {
    status.textContent = error.message;
    more.hidden = false;
    more.textContent = "Retry loading";
  } finally {
    more.disabled = false;
    list.removeAttribute("aria-busy");
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (submit.disabled) return;
  submit.disabled = true;
  status.textContent = "Saving…";
  try {
    const result = await readJson(await fetch(`${API}/api/coordinates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: input.value.trim() })
    }));
    addPoint(result.data, true);
    showPoint(result.data);
    status.textContent = "Saved.";
    input.value = "";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});
more.addEventListener("click", loadCoordinates);
loadCoordinates();
