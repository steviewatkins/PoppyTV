const BUNNY_LIBRARY_ID = "636169";
const BUNNY_CDN_HOST = "vz-82cf94cd-f52.b-cdn.net";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/thumbnail") {
      const videoId = url.searchParams.get("videoId");
      const version = url.searchParams.get("v") || Date.now();

      if (!videoId) {
        return new Response("Missing videoId", { status: 400 });
      }

      const videoRes = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
        {
          headers: {
            AccessKey: env.BUNNY_API_KEY,
            Accept: "application/json"
          }
        }
      );

      if (!videoRes.ok) {
        return new Response("Could not fetch Bunny video info", { status: 500 });
      }

      const video = await videoRes.json();
      const thumbFile = video.thumbnailFileName || "thumbnail.jpg";

      const thumbUrl = `https://${BUNNY_CDN_HOST}/${videoId}/${thumbFile}?v=${version}`;

      return Response.redirect(thumbUrl, 302);
    }

    return new Response("Not found", { status: 404 });
  }
};
