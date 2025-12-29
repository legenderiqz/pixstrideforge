export default {
  async fetch(request, env) {
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/pixel" && request.method === "POST") {
      try {
        const { x, y, color } = await request.json();
        if (x === undefined || y === undefined || color === undefined) {
          return new Response("Eksik veri", { status: 400, headers });
        }

        const key = `pixel:${x},${y}`;
        await env.PIXELS.put(key, color);

        return new Response(JSON.stringify({ success: true }), { headers });
      } catch (e) {
        return new Response("Hata: " + e.message, { status: 500, headers });
      }
    }

    if (path === "/pixels" && request.method === "GET") {
      const list = [];
      const iterator = env.PIXELS.list();
      for await (const key of iterator.keys) {
        const val = await env.PIXELS.get(key.name);
        list.push({ key: key.name, color: val });
      }
      return new Response(JSON.stringify(list), { headers });
    }

    return new Response("Not Found", { status: 404, headers });
  }
};
