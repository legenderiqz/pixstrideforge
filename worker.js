const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const CHUNK_SIZE = 16; // 16x16 piksellik chunk

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

        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkY = Math.floor(y / CHUNK_SIZE);
        const localX = x % CHUNK_SIZE;
        const localY = y % CHUNK_SIZE;

        const key = `chunk:${chunkX},${chunkY}`;
        const chunkData = await env.PIXELS.get(key, { type: "json" }) || {};

        // Pixel’i chunk içinde kaydet
        chunkData[`${localX},${localY}`] = color;
        await env.PIXELS.put(key, JSON.stringify(chunkData));

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response("Hata: " + e.message, { status: 500, headers: corsHeaders });
      }
    }

    // Chunk verilerini çekme
    if (path === "/pixels" && request.method === "GET") {
      try {
        const list = [];
        const iterator = env.PIXELS.list();
        for await (const key of iterator.keys) {
          const val = await env.PIXELS.get(key.name, { type: "json" }) || {};
          const [chunkX, chunkY] = key.name.replace("chunk:", "").split(",").map(Number);
          for (const [localPos, color] of Object.entries(val)) {
            const [lx, ly] = localPos.split(",").map(Number);
            list.push({ x: chunkX * CHUNK_SIZE + lx, y: chunkY * CHUNK_SIZE + ly, color });
          }
        }
        return new Response(JSON.stringify(list), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response("Hata: " + e.message, { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
