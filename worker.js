```js
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS
    }
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS
      });
    }

    if (!env.DB) {
      return json(
        {
          ok: false,
          error: "DB NOT BOUND"
        },
        500
      );
    }

    async function getTopics() {
      try {
        const raw = await env.DB.get("topics");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    async function saveTopics(topics) {
      await env.DB.put(
        "topics",
        JSON.stringify(topics)
      );
    }

    async function getTopic(id) {
      try {
        const raw = await env.DB.get(`topic:${id}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    async function saveTopic(topic) {
      await env.DB.put(
        `topic:${topic.id}`,
        JSON.stringify(topic)
      );
    }

    async function geocode(title) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(title)}`,
          {
            headers: {
              "User-Agent": "Dot Indexmod"
            }
          }
        );

        if (!response.ok) {
          return null;
        }

        const results = await response.json();

        if (!Array.isArray(results) || !results.length) {
          return null;
        }

        const result = results[0];

        return {
          lat: Number(result.lat),
          lng: Number(result.lon),
          zoom: 15
        };

      } catch {
        return null;
      }
    }

    /*
     * LIST TOPICS
     */

    if (
      req.method === "GET" &&
      url.pathname === "/api/topics"
    ) {
      const topics = await getTopics();

      topics.sort(
        (a, b) =>
          new Date(b.created) -
          new Date(a.created)
      );

      return json({
        ok: true,
        data: topics
      });
    }

    /*
     * CREATE TOPIC
     */

    if (
      req.method === "POST" &&
      url.pathname === "/api/topic"
    ) {
      try {
        const body = await req.json();

        const title =
          String(body.title || "").trim();

        if (!title) {
          return json(
            {
              ok: false,
              error: "TITLE REQUIRED"
            },
            400
          );
        }

        const id =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

        const created =
          new Date().toISOString();

        const location =
          await geocode(title);

        const topic = {
          id,
          title,
          created,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          zoom: location?.zoom ?? 15,
          posts: []
        };

        await saveTopic(topic);

        const topics =
          await getTopics();

        topics.unshift({
          id,
          title,
          created,
          lat: topic.lat,
          lng: topic.lng,
          zoom: topic.zoom
        });

        await saveTopics(topics);

        return json({
          ok: true,
          topic
        });

      } catch (error) {
        console.error(error);

        return json(
          {
            ok: false,
            error: "CREATE FAILED"
          },
          500
        );
      }
    }

    /*
     * GET TOPIC
     */

    if (
      req.method === "GET" &&
      url.pathname === "/api/topic"
    ) {
      const id =
        url.searchParams.get("id");

      if (!id) {
        return json(
          {
            ok: false,
            error: "ID REQUIRED"
          },
          400
        );
      }

      const topic =
        await getTopic(id);

      if (!topic) {
        return json(
          {
            ok: false,
            error: "TOPIC NOT FOUND"
          },
          404
        );
      }

      return json({
        ok: true,
        topic
      });
    }

    /*
     * ADD POST TO TOPIC
     */

    if (
      req.method === "POST" &&
      url.pathname === "/api/topic/post"
    ) {
      try {
        const body = await req.json();

        const topicId =
          String(body.topicId || "").trim();

        const text =
          String(body.text || "").trim();

        if (!topicId || !text) {
          return json(
            {
              ok: false,
              error: "TOPIC AND TEXT REQUIRED"
            },
            400
          );
        }

        const topic =
          await getTopic(topicId);

        if (!topic) {
          return json(
            {
              ok: false,
              error: "TOPIC NOT FOUND"
            },
            404
          );
        }

        const post = {
          id:
            `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          text,

          userpic:
            String(body.userpic || "🙂"),

          created:
            new Date().toISOString()
        };

        topic.posts =
          Array.isArray(topic.posts)
            ? topic.posts
            : [];

        topic.posts.push(post);

        await saveTopic(topic);

        return json({
          ok: true,
          post
        });

      } catch (error) {
        console.error(error);

        return json(
          {
            ok: false,
            error: "POST FAILED"
          },
          500
        );
      }
    }

    /*
     * OLD FEED API
     * Kept temporarily so nothing breaks.
     */

    if (
      req.method === "GET" &&
      url.pathname === "/api/feed"
    ) {
      const topics =
        await getTopics();

      return json({
        ok: true,
        data: topics
      });
    }

    /*
     * STATIC FILES
     */

    return env.ASSETS.fetch(req);
  }
};
```