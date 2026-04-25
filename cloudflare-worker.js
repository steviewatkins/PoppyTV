const BUNNY_LIBRARY_ID = "636169";
const BUNNY_CDN_HOST = "vz-82cf94cd-f52.b-cdn.net";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method === "GET" && url.pathname === "/thumbnail") {
      const videoId = url.searchParams.get("videoId");
      const version = url.searchParams.get("v") || Date.now();

      if (!videoId) {
        return new Response("Missing videoId", { status: 400, headers: CORS });
      }

      const metaRes = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
        {
          headers: {
            AccessKey: env.BUNNY_API_KEY,
            Accept: "application/json"
          }
        }
      );

      if (!metaRes.ok) {
        return new Response("Failed to fetch video metadata", { status: 500, headers: CORS });
      }

      const video = await metaRes.json();
      const fileName = video.thumbnailFileName || "thumbnail.jpg";
      const thumbnailUrl = `https://${BUNNY_CDN_HOST}/${videoId}/${fileName}?v=${version}`;

      const imageRes = await fetch(thumbnailUrl);

      if (!imageRes.ok) {
        return new Response("Thumbnail not found", { status: 404, headers: CORS });
      }

      const headers = new Headers(imageRes.headers);
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Cache-Control", "no-store");

      return new Response(imageRes.body, {
        status: 200,
        headers
      });
    }

    if (request.method === "GET" && url.searchParams.has("url")) {
      const videoUrl = url.searchParams.get("url");
      const download = url.searchParams.get("download");

      if (!videoUrl || !videoUrl.includes(BUNNY_CDN_HOST)) {
        return new Response("Forbidden", { status: 403, headers: CORS });
      }

      const bunnyRes = await fetch(videoUrl);
      const headers = new Headers(bunnyRes.headers);
      headers.set("Access-Control-Allow-Origin", "*");

      if (download === "1") {
        const parts = new URL(videoUrl).pathname.split("/");
        const filename = (parts[1] || "video") + ".mp4";
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      }

      return new Response(bunnyRes.body, {
        status: bunnyRes.status,
        headers
      });
    }

    return new Response("Not found", { status: 404, headers: CORS });
  }
};
