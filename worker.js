const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Preflight CORS request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Pixel ekleme
    if (path === "/pixel" && request.method === "POST") {
      try {
        const { x, y, color } = await request.json();
        if (x === undefined || y === undefined || color === undefined) {
          return new Response("Eksik veri", { status: 400, headers: corsHeaders });
        }

        const key = `pixel:${x},${y}`;
        await env.PIXELS.put(key, color);

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response("Hata: " + e.message, { status: 500, headers: corsHeaders });
      }
    }

    // Tüm pikselleri çekme (isteğe bağlı)
    if (path === "/pixels" && request.method === "GET") {
      try {
        const list = [];
        const iterator = env.PIXELS.list();
        for await (const key of iterator.keys) {
          const val = await env.PIXELS.get(key.name);
          list.push({ key: key.name, color: val });
        }
        return new Response(JSON.stringify(list), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response("Hata: " + e.message, { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
