const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers
    }
  );
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

async function getTopics(env) {
  try {
    const raw = await env.DB.get("topics");

    if (!raw) {
      return [];
    }

    const topics = JSON.parse(raw);

    return Array.isArray(topics)
      ? topics
      : [];

  } catch (error) {
    console.log("GET TOPICS ERROR:", error);
    return [];
  }
}

async function saveTopics(env, topics) {
  await env.DB.put(
    "topics",
    JSON.stringify(topics)
  );
}

async function getTopic(env, slug) {
  try {
    const raw =
      await env.DB.get(
        `topic:${slug}`
      );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);

  } catch (error) {
    console.log("GET TOPIC ERROR:", error);
    return null;
  }
}

async function saveTopic(env, topic) {
  await env.DB.put(
    `topic:${topic.slug}`,
    JSON.stringify(topic)
  );
}

async function deleteTopic(env, slug) {
  await env.DB.delete(
    `topic:${slug}`
  );
}

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
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

    if (
      url.pathname === "/api/topics" &&
      request.method === "GET"
    ) {
      const topics =
        await getTopics(env);

      return json({
        ok: true,
        data: topics
      });
    }

    if (
      url.pathname === "/api/topic" &&
      request.method === "POST"
    ) {
      try {
        const body =
          await request.json();

        const title =
          String(body.title || "")
            .trim();

        const map =
          String(body.map || "")
            .trim();

        let slug =
          String(body.slug || "")
            .trim();

        if (!title) {
          return json(
            {
              ok: false,
              error: "Title required"
            },
            400
          );
        }

        if (!map) {
          return json(
            {
              ok: false,
              error: "Map required"
            },
            400
          );
        }

        if (!slug) {
          slug =
            slugify(title);
        }

        if (!slug) {
          return json(
            {
              ok: false,
              error: "Invalid slug"
            },
            400
          );
        }

        const existing =
          await getTopic(
            env,
            slug
          );

        if (existing) {
          return json(
            {
              ok: false,
              error: "Topic already exists"
            },
            409
          );
        }

        const topic = {
          title,
          map,
          slug,
          posts: []
        };

        await saveTopic(
          env,
          topic
        );

        const topics =
          await getTopics(env);

        topics.unshift({
          title,
          map,
          slug
        });

        await saveTopics(
          env,
          topics
        );

        return json({
          ok: true,
          topic
        });

      } catch (error) {
        console.log(
          "CREATE TOPIC ERROR:",
          error
        );

        return json(
          {
            ok: false,
            error: "Create failed"
          },
          500
        );
      }
    }

    if (
      url.pathname === "/api/topic" &&
      request.method === "GET"
    ) {
      const slug =
        url.searchParams.get(
          "slug"
        );

      if (!slug) {
        return json(
          {
            ok: false,
            error: "Slug required"
          },
          400
        );
      }

      const topic =
        await getTopic(
          env,
          slug
        );

      if (!topic) {
        return json(
          {
            ok: false,
            error: "Topic not found"
          },
          404
        );
      }

      return json({
        ok: true,
        topic
      });
    }

    if (
      url.pathname === "/api/topic/post" &&
      request.method === "POST"
    ) {
      try {
        const body =
          await request.json();

        const slug =
          String(body.slug || "")
            .trim();

        const text =
          String(body.text || "")
            .trim();

        const userpic =
          String(body.userpic || "")
            .trim();

        if (!slug || !text) {
          return json(
            {
              ok: false,
              error: "Slug and text required"
            },
            400
          );
        }

        const topic =
          await getTopic(
            env,
            slug
          );

        if (!topic) {
          return json(
            {
              ok: false,
              error: "Topic not found"
            },
            404
          );
        }

        topic.posts.push({
          text,
          userpic
        });

        await saveTopic(
          env,
          topic
        );

        return json({
          ok: true
        });

      } catch (error) {
        console.log(
          "ADD POST ERROR:",
          error
        );

        return json(
          {
            ok: false,
            error: "Post failed"
          },
          500
        );
      }
    }

    if (
      url.pathname === "/api/topic/post" &&
      request.method === "PUT"
    ) {
      try {
        const body =
          await request.json();

        const slug =
          String(body.slug || "")
            .trim();

        const index =
          Number(body.index);

        const text =
          String(body.text || "")
            .trim();

        if (
          !slug ||
          !Number.isInteger(index) ||
          index < 0 ||
          !text
        ) {
          return json(
            {
              ok: false,
              error: "Invalid request"
            },
            400
          );
        }

        const topic =
          await getTopic(
            env,
            slug
          );

        if (!topic) {
          return json(
            {
              ok: false,
              error: "Topic not found"
            },
            404
          );
        }

        if (
          index >= topic.posts.length
        ) {
          return json(
            {
              ok: false,
              error: "Post not found"
            },
            404
          );
        }

        topic.posts[index].text =
          text;

        await saveTopic(
          env,
          topic
        );

        return json({
          ok: true
        });

      } catch (error) {
        console.log(
          "UPDATE POST ERROR:",
          error
        );

        return json(
          {
            ok: false,
            error: "Update failed"
          },
          500
        );
      }
    }

    if (
      url.pathname === "/api/topic/post" &&
      request.method === "DELETE"
    ) {
      try {
        const body =
          await request.json();

        const slug =
          String(body.slug || "")
            .trim();

        const index =
          Number(body.index);

        if (
          !slug ||
          !Number.isInteger(index) ||
          index < 0
        ) {
          return json(
            {
              ok: false,
              error: "Invalid request"
            },
            400
          );
        }

        const topic =
          await getTopic(
            env,
            slug
          );

        if (!topic) {
          return json(
            {
              ok: false,
              error: "Topic not found"
            },
            404
          );
        }

        if (
          index >= topic.posts.length
        ) {
          return json(
            {
              ok: false,
              error: "Post not found"
            },
            404
          );
        }

        topic.posts.splice(
          index,
          1
        );

        await saveTopic(
          env,
          topic
        );

        return json({
          ok: true
        });

      } catch (error) {
        console.log(
          "DELETE POST ERROR:",
          error
        );

        return json(
          {
            ok: false,
            error: "Delete failed"
          },
          500
        );
      }
    }

    return env.ASSETS.fetch(
      request
    );
  }
};
